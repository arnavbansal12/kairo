# pipeline.py
# -----------------------------------------------------------------------------
# ASYNC DOCUMENT PROCESSING PIPELINE
# Producer-Consumer Architecture with 3-stage queue processing
# -----------------------------------------------------------------------------

import asyncio
import json
import uuid
import time
import base64
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from async_ai import call_ocr_async, call_logic_async, clean_json_response

# =============================================================================
# TASK STATUS & DATA STRUCTURES
# =============================================================================

class TaskStatus(Enum):
    QUEUED = "queued"
    OCR_PROCESSING = "ocr_processing"
    LOGIC_PROCESSING = "logic_processing"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingTask:
    """Represents a document being processed through the pipeline."""
    task_id: str
    filename: str
    file_bytes: bytes
    mime_type: str
    client_id: Optional[int] = None
    doc_type: str = "gst_invoice"
    entered_by: Optional[str] = None
    
    # Processing state
    status: TaskStatus = TaskStatus.QUEUED
    ocr_result: Optional[Dict] = None
    logic_result: Optional[Dict] = None
    final_result: Optional[Dict] = None
    error: Optional[str] = None
    
    # Timing
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None


# =============================================================================
# OCR PROMPT - Same as original for consistency
# =============================================================================

OCR_PROMPT = """You are an expert OCR system for Indian GST Invoices.

CAREFULLY read every number and text in this invoice image. 

IMPORTANT EXTRACTION RULES:
1. Look at the BOTTOM of the invoice for the TOTAL AMOUNTS section
2. The "Grand Total" or "Total Amount" is usually the largest number at bottom
3. "Taxable Value" or "Taxable Total" is the amount BEFORE tax
4. CGST and SGST are usually equal amounts (half of total tax each)
5. IGST appears instead of CGST+SGST for interstate transactions
6. HSN codes are 4-8 digit numbers in the item description column
7. Read the GSTIN carefully - it's a 15-character alphanumeric code
8. First 2 digits of GSTIN = State Code (07=Delhi, 27=Maharashtra, etc.)

FIND AND EXTRACT THESE VALUES FROM THE IMAGE:

BASIC INVOICE FIELDS:
1. gst_no: Seller's GSTIN (15 chars, format: 22AAAAA0000A1Z5)
2. invoice_no: Invoice number exactly as written
3. invoice_date: Date in any format
4. vendor_name: Seller/supplier company name (the one issuing invoice)
5. buyer_name: Buyer company name (if visible)
6. buyer_gstin: Buyer's GSTIN if visible

GST-SPECIFIC FIELDS (CRITICAL FOR TALLY):
7. vendor_state: State name derived from GSTIN first 2 digits
8. place_of_supply: State where goods are delivered
9. hsn_code: The HSN/SAC code (4-8 digit number)
10. tax_rate: GST rate as a NUMBER (5, 12, 18, or 28)

TAX AMOUNTS (READ EXACT NUMBERS):
11. taxable_value: Amount BEFORE tax
12. cgst_amount: CGST amount (or 0 if IGST present)
13. sgst_amount: SGST amount (or 0 if IGST present)
14. igst_amount: IGST amount (0 if CGST/SGST present)
15. cess_amount: Cess if any (usually 0)
16. grand_total: Final total amount

ACCOUNTING FIELDS:
17. ledger_name: "Purchase A/c" for goods, "General Expense" for services
18. group_name: "Purchase Accounts" for goods, "Indirect Expenses" for services

Return ONLY a valid JSON object."""


# =============================================================================
# PIPELINE MANAGER - The Conveyor Belt
# =============================================================================

class AsyncPipeline:
    """
    Manages concurrent document processing with 3 queues:
    1. OCR Queue → Extract text from images
    2. Logic Queue → Classify HSN, Ledger, Group
    3. Save Queue → Store in database
    """
    
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        
        # Three processing queues
        self.ocr_queue: asyncio.Queue = asyncio.Queue()
        self.logic_queue: asyncio.Queue = asyncio.Queue()
        self.save_queue: asyncio.Queue = asyncio.Queue()
        
        # Task tracking
        self.tasks: Dict[str, ProcessingTask] = {}
        self.results: Dict[str, Dict] = {}
        
        # Workers
        self._workers_started = False
        self._shutdown = False
        
        # Callbacks
        self.on_complete: Optional[Callable] = None
        
    async def start_workers(self):
        """Start background worker tasks."""
        if self._workers_started:
            return
            
        self._workers_started = True
        self._shutdown = False
        
        # Start multiple OCR workers (most CPU-bound)
        for i in range(self.max_concurrent):
            asyncio.create_task(self._ocr_worker(i))
        
        # Start logic workers
        for i in range(self.max_concurrent):
            asyncio.create_task(self._logic_worker(i))
        
        # Start save workers
        for i in range(2):  # Fewer save workers needed
            asyncio.create_task(self._save_worker(i))
            
        print(f"🚀 Pipeline started: {self.max_concurrent} OCR + {self.max_concurrent} Logic + 2 Save workers")
    
    async def stop_workers(self):
        """Signal workers to stop."""
        self._shutdown = True
    
    async def submit(self, task: ProcessingTask) -> str:
        """Submit a new document for processing."""
        self.tasks[task.task_id] = task
        await self.ocr_queue.put(task.task_id)
        print(f"📥 Task {task.task_id[:8]} queued for processing")
        return task.task_id
    
    def get_status(self, task_id: str) -> Dict:
        """Get current status of a task."""
        task = self.tasks.get(task_id)
        if not task:
            return {"status": "not_found"}
        
        return {
            "task_id": task_id,
            "status": task.status.value,
            "filename": task.filename,
            "error": task.error,
            "result": task.final_result if task.status == TaskStatus.COMPLETED else None
        }
    
    # =========================================================================
    # WORKER FUNCTIONS - Run concurrently
    # =========================================================================
    
    async def _ocr_worker(self, worker_id: int):
        """OCR Worker - Extracts text from images using vision model."""
        print(f"👁️ OCR Worker {worker_id} started")
        
        while not self._shutdown:
            try:
                # Wait for task with timeout
                try:
                    task_id = await asyncio.wait_for(self.ocr_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                task = self.tasks.get(task_id)
                if not task:
                    continue
                
                task.status = TaskStatus.OCR_PROCESSING
                print(f"👁️ Worker {worker_id}: OCR processing {task.filename}")
                
                try:
                    # Handle PDF conversion
                    file_bytes = task.file_bytes
                    mime_type = task.mime_type
                    
                    if 'pdf' in mime_type.lower():
                        print(f"📄 Converting PDF to image...")
                        try:
                            from pdf2image import convert_from_bytes
                            from io import BytesIO
                            images = convert_from_bytes(file_bytes, first_page=1, last_page=1, dpi=200)
                            if images:
                                img_buffer = BytesIO()
                                images[0].save(img_buffer, format='PNG')
                                file_bytes = img_buffer.getvalue()
                                mime_type = 'image/png'
                                print(f"✅ PDF converted to PNG")
                        except Exception as pdf_err:
                            print(f"❌ PDF conversion failed: {pdf_err}")
                            task.error = f"PDF conversion failed: {pdf_err}"
                            task.status = TaskStatus.FAILED
                            continue
                    
                    # Call async OCR
                    b64_data = base64.b64encode(file_bytes).decode('utf-8')
                    response = await call_ocr_async(b64_data, OCR_PROMPT, mime_type)
                    
                    # Parse response
                    json_text = clean_json_response(response)
                    ocr_data = json.loads(json_text)
                    
                    task.ocr_result = ocr_data
                    print(f"✅ Worker {worker_id}: OCR complete for {task.filename}")
                    
                    # Send to logic queue
                    await self.logic_queue.put(task_id)
                    
                except Exception as e:
                    print(f"❌ Worker {worker_id}: OCR failed for {task.filename}: {e}")
                    task.error = str(e)
                    task.status = TaskStatus.FAILED
                    
            except Exception as e:
                print(f"❌ OCR Worker {worker_id} error: {e}")
                await asyncio.sleep(1)
    
    async def _logic_worker(self, worker_id: int):
        """Logic Worker - Classifies HSN, Ledger, Group using reasoning model."""
        print(f"🧠 Logic Worker {worker_id} started")
        
        while not self._shutdown:
            try:
                try:
                    task_id = await asyncio.wait_for(self.logic_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                task = self.tasks.get(task_id)
                if not task or not task.ocr_result:
                    continue
                
                task.status = TaskStatus.LOGIC_PROCESSING
                print(f"🧠 Worker {worker_id}: Logic processing {task.filename}")
                
                try:
                    # Build classification prompt
                    ocr = task.ocr_result
                    prompt = f"""Classify this invoice for Indian GST accounting:

Vendor: {ocr.get('vendor_name', 'Unknown')}
Invoice No: {ocr.get('invoice_no', 'N/A')}
Grand Total: {ocr.get('grand_total', 0)}
Taxable Value: {ocr.get('taxable_value', 0)}
HSN from OCR: {ocr.get('hsn_code', 'Not found')}

Determine the correct:
1. HSN Code (4-8 digits, must be valid Indian HSN)
2. Ledger Name (for Tally - e.g., "Purchase @ 18%", "Office Expenses")
3. Group Name (for Tally - e.g., "Purchase Accounts", "Indirect Expenses")
4. Confidence Level (high/medium/low)

Return JSON: {{"hsn_code": "...", "ledger_name": "...", "group_name": "...", "confidence": "..."}}"""

                    response = await call_logic_async(prompt)
                    json_text = clean_json_response(response)
                    logic_data = json.loads(json_text)
                    
                    task.logic_result = logic_data
                    print(f"✅ Worker {worker_id}: Logic complete for {task.filename}")
                    
                    # Send to save queue
                    await self.save_queue.put(task_id)
                    
                except Exception as e:
                    print(f"❌ Worker {worker_id}: Logic failed for {task.filename}: {e}")
                    # Still save with OCR result only
                    await self.save_queue.put(task_id)
                    
            except Exception as e:
                print(f"❌ Logic Worker {worker_id} error: {e}")
                await asyncio.sleep(1)
    
    async def _save_worker(self, worker_id: int):
        """Save Worker - Combines results and stores in database."""
        print(f"💾 Save Worker {worker_id} started")
        
        while not self._shutdown:
            try:
                try:
                    task_id = await asyncio.wait_for(self.save_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                task = self.tasks.get(task_id)
                if not task:
                    continue
                
                task.status = TaskStatus.SAVING
                print(f"💾 Worker {worker_id}: Saving {task.filename}")
                
                try:
                    # Combine OCR and Logic results
                    final = task.ocr_result.copy() if task.ocr_result else {}
                    
                    if task.logic_result:
                        final['hsn_code'] = task.logic_result.get('hsn_code', final.get('hsn_code', ''))
                        final['ledger_name'] = task.logic_result.get('ledger_name', 'Purchase A/c')
                        final['group_name'] = task.logic_result.get('group_name', 'Purchase Accounts')
                        final['ai_confidence'] = task.logic_result.get('confidence', 'medium')
                    
                    final['filename'] = task.filename
                    final['client_id'] = task.client_id
                    final['doc_type'] = task.doc_type
                    
                    task.final_result = final
                    task.completed_at = time.time()
                    task.status = TaskStatus.COMPLETED
                    
                    # Store result
                    self.results[task_id] = final
                    
                    duration = task.completed_at - task.created_at
                    print(f"✅ Worker {worker_id}: Saved {task.filename} in {duration:.2f}s")
                    
                    # Callback if set
                    if self.on_complete:
                        await self.on_complete(task_id, final)
                    
                except Exception as e:
                    print(f"❌ Worker {worker_id}: Save failed for {task.filename}: {e}")
                    task.error = str(e)
                    task.status = TaskStatus.FAILED
                    
            except Exception as e:
                print(f"❌ Save Worker {worker_id} error: {e}")
                await asyncio.sleep(1)


# =============================================================================
# GLOBAL PIPELINE INSTANCE
# =============================================================================

pipeline = AsyncPipeline(max_concurrent=5)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

async def process_document_async(
    file_bytes: bytes,
    mime_type: str,
    filename: str,
    client_id: Optional[int] = None,
    doc_type: str = "gst_invoice",
    entered_by: Optional[str] = None
) -> str:
    """
    Submit a document for async processing.
    Returns task_id immediately - caller can poll for status.
    """
    # Ensure workers are started
    await pipeline.start_workers()
    
    # Create task
    task = ProcessingTask(
        task_id=str(uuid.uuid4()),
        filename=filename,
        file_bytes=file_bytes,
        mime_type=mime_type,
        client_id=client_id,
        doc_type=doc_type,
        entered_by=entered_by
    )
    
    # Submit to pipeline
    return await pipeline.submit(task)


async def get_task_status(task_id: str) -> Dict:
    """Get the status of a processing task."""
    return pipeline.get_status(task_id)


async def wait_for_task(task_id: str, timeout: float = 60.0) -> Dict:
    """Wait for a task to complete (for backward compatibility)."""
    start = time.time()
    
    while time.time() - start < timeout:
        status = pipeline.get_status(task_id)
        if status['status'] in ['completed', 'failed']:
            return status
        await asyncio.sleep(0.5)
    
    return {"status": "timeout", "task_id": task_id}


# =============================================================================
# TEST
# =============================================================================

async def test_pipeline():
    """Test the async pipeline with sample data."""
    print("\n" + "="*60)
    print("TESTING ASYNC PIPELINE")
    print("="*60)
    
    # Start workers
    await pipeline.start_workers()
    
    # Create a tiny test image (1x1 pixel white PNG)
    test_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    
    # Submit test task
    task_id = await process_document_async(
        file_bytes=test_png,
        mime_type="image/png",
        filename="test.png"
    )
    
    print(f"📥 Task submitted: {task_id}")
    
    # Wait for result
    result = await wait_for_task(task_id, timeout=30)
    print(f"📋 Result: {result}")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(test_pipeline())
