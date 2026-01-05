# backend/main.py
# -----------------------------------------------------------------------------
# TAX.AI ENTERPRISE BACKEND - JARVIS EDITION 3.0
# -----------------------------------------------------------------------------

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import xml.etree.ElementTree as ET
import json
import re
import time
import sqlite3
import shutil
import os
import uuid
from datetime import datetime

# --- CONFIGURATION ---
# TODO: PASTE YOUR API KEY HERE
GOOGLE_API_KEY = "PASTE_YOUR_KEY_HERE"
genai.configure(api_key=GOOGLE_API_KEY)

MODEL_NAME = "models/gemini-2.5-flash"

# --- SYSTEM DIRECTORIES ---
DB_FILE = "tax_data.db"
BACKUP_DIR = "backups"
UPLOAD_DIR = "uploads"

os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Tax.AI Audit Engine", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# --- DATA MODELS ---
class InvoiceUpdate(BaseModel):
    vendor_name: Optional[str] = None
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    gst_no: Optional[str] = None
    grand_total: Optional[float] = None
    taxable_value: Optional[float] = None
    igst_amount: Optional[float] = None
    cgst_amount: Optional[float] = None
    sgst_amount: Optional[float] = None
    tax_rate: Optional[float] = None
    ledger_name: Optional[str] = None
    group_name: Optional[str] = None
    payment_status: Optional[str] = "Unpaid"

class ManualInvoice(InvoiceUpdate):
    vendor_name: str
    grand_total: float

class SearchQuery(BaseModel):
    query: str

# --- DATABASE MANAGEMENT ---
def init_db():
    if os.path.exists(DB_FILE):
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"{BACKUP_DIR}/tax_backup_{timestamp}.db"
            shutil.copy2(DB_FILE, backup_path)
            print(f"🛡️ Backup created: {backup_path}")
        except Exception as e:
            print(f"⚠️ Backup Failed: {e}")

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT,
            gst_no TEXT,
            invoice_date TEXT,
            vendor_name TEXT,
            grand_total REAL,
            json_data TEXT,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Auto-Migration
    cursor.execute('PRAGMA table_info(invoices)')
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'file_path' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN file_path TEXT')
    if 'payment_status' not in columns: cursor.execute("ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'Unpaid'")
    if 'is_manual' not in columns: cursor.execute("ALTER TABLE invoices ADD COLUMN is_manual BOOLEAN DEFAULT 0")

    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# --- HELPER FUNCTIONS ---
def safe_float(val):
    try: return float(str(val).replace(",", "").strip())
    except: return 0.0

def clean_json(text):
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        return match.group(1) if match else text
    except: return text

# --- CORE LOGIC ---
def validate_gstin_checksum(gstin):
    if not gstin: return False
    gstin = str(gstin).upper().strip().replace(" ", "").replace("-", "")
    if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", gstin): return False
    try:
        chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        charmap = {c: i for i, c in enumerate(chars)}
        input_chars = gstin[:-1]
        original_check_digit = gstin[-1]
        total_sum = 0
        for i, char in enumerate(input_chars):
            value = charmap[char]
            factor = 1 if (i % 2 == 0) else 2
            total_sum += (value * factor) // 36 + (value * factor) % 36
        remainder = total_sum % 36
        check_code_point = (36 - remainder) % 36
        return original_check_digit == chars[check_code_point]
    except: return False

def check_calculations(data):
    try:
        taxable = safe_float(data.get('taxable_value'))
        igst = safe_float(data.get('igst_amount'))
        cgst = safe_float(data.get('cgst_amount'))
        sgst = safe_float(data.get('sgst_amount'))
        cess = safe_float(data.get('cess_amount'))
        grand_total = safe_float(data.get('grand_total'))
        rate = safe_float(data.get('tax_rate'))

        if taxable == 0 and grand_total > 0 and rate > 0:
            taxable = grand_total / (1 + (rate/100))
            tax_amount = grand_total - taxable
            if data.get('place_of_supply') == 'Interstate' or igst > 0:
                igst = tax_amount
            else:
                cgst = tax_amount / 2
                sgst = tax_amount / 2
            data['taxable_value'] = round(taxable, 2)
            data['igst_amount'] = round(igst, 2)
            data['cgst_amount'] = round(cgst, 2)
            data['sgst_amount'] = round(sgst, 2)

        total_tax = igst + cgst + sgst
        if rate == 0 and taxable > 0 and total_tax > 0:
            calculated_rate = (total_tax / taxable) * 100
            for slab in [5.0, 12.0, 18.0, 28.0]:
                if abs(calculated_rate - slab) < 1.0:
                    data['tax_rate'] = slab
                    break
            if data.get('tax_rate') == 0:
                data['tax_rate'] = round(calculated_rate, 2)

        if not data.get('group_name'):
            if taxable > 5000:
                data['group_name'] = "Purchase Accounts"
                data['ledger_name'] = "Purchase A/c"
            elif taxable > 0:
                data['group_name'] = "Indirect Expenses"
                data['ledger_name'] = "General Expense"
            else:
                data['group_name'] = "Suspense Account"
                data['ledger_name'] = "Unknown"

        calculated_total = taxable + total_tax + cess
        if abs(grand_total - calculated_total) > 5.0: 
            data['math_status'] = f"Error (Calc: {calculated_total:.0f})"
        else:
            data['math_status'] = "Correct"
        return data
    except:
        data['math_status'] = "Error"
        return data

def extract_invoice_data(file_bytes, mime_type):
    global MODEL_NAME 
    prompt = """
    Act as a Senior Chartered Accountant. 
    Analyze this invoice and extract details into JSON.
    Rules:
    - Goods -> Ledger: "Purchase A/c", Group: "Purchase Accounts"
    - Services -> Ledger: "General Expense", Group: "Indirect Expenses"
    
    Fields: gst_no, invoice_no, invoice_date, vendor_name, buyer_name, 
    hsn_code, ledger_name, group_name,
    tax_rate, taxable_value, igst_amount, cgst_amount, sgst_amount, cess_amount, grand_total.
    """
    input_content = {"mime_type": mime_type, "data": file_bytes}
    
    for attempt in range(3):
        try:
            print(f"🔄 Sending to Google ({MODEL_NAME})...")
            model = genai.GenerativeModel(MODEL_NAME)
            response = model.generate_content([prompt, input_content], generation_config={"response_mime_type": "application/json"})
            text = clean_json(response.text)
            data = json.loads(text)
            gst_valid = validate_gstin_checksum(data.get('gst_no'))
            data['gst_status'] = "Verified" if gst_valid else "Invalid GST"
            data = check_calculations(data)
            return data
        except Exception as e:
            if "429" in str(e): time.sleep(5); continue
            if "404" in str(e): MODEL_NAME = "gemini-1.5-flash"; continue
            return {"invoice_no": "ERROR", "vendor_name": "AI Fail", "grand_total": 0}
    return {"invoice_no": "TIMEOUT", "vendor_name": "Google Busy", "grand_total": 0}

def generate_tally_xml(invoices):
    envelope = ET.Element("ENVELOPE")
    header = ET.SubElement(envelope, "HEADER")
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    body = ET.SubElement(envelope, "BODY")
    import_data = ET.SubElement(body, "IMPORTDATA")
    request_data = ET.SubElement(import_data, "REQUESTDATA")
    
    for inv in invoices:
        tally_msg = ET.SubElement(request_data, "TALLYMESSAGE")
        voucher = ET.SubElement(tally_msg, "VOUCHER", {"VCHTYPE": "Purchase", "ACTION": "Create"})
        ET.SubElement(voucher, "DATE").text = inv.get('invoice_date', '20250101')
        ET.SubElement(voucher, "VOUCHERNUMBER").text = str(inv.get('invoice_no'))
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = inv.get('vendor_name', 'Unknown')
        
        ledger_entry_cr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(ledger_entry_cr, "LEDGERNAME").text = inv.get('vendor_name', 'Unknown')
        ET.SubElement(ledger_entry_cr, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(ledger_entry_cr, "AMOUNT").text = str(inv.get('grand_total', 0))

        ledger_entry_dr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(ledger_entry_dr, "LEDGERNAME").text = inv.get('ledger_name', 'Purchase A/c')
        ET.SubElement(ledger_entry_dr, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(ledger_entry_dr, "AMOUNT").text = str(inv.get('taxable_value', 0))

    return ET.tostring(envelope, encoding='utf8', method='xml')

# --- NEW: JARVIS AI SEARCH ENGINE ---
@app.post("/search/ai")
async def ai_search(query: SearchQuery):
    print(f"🤖 Jarvis analyzing: {query.query}")
    
    # 1. Build Schema Context
    schema = """
    Table: invoices
    Columns:
    - id (Integer)
    - invoice_no (Text)
    - gst_no (Text)
    - vendor_name (Text)
    - grand_total (Real/Float)
    - invoice_date (Text)
    - payment_status (Text: 'Unpaid', 'Paid', 'Disputed')
    - json_data (Text - contains other fields)
    """
    
    # 2. Ask Gemini for SQL
    prompt = f"""
    You are a SQLite Expert. Convert this user question into a SQL query.
    Schema: {schema}
    User Question: "{query.query}"
    
    Rules:
    - Return ONLY the SQL query. No markdown, no text.
    - Use `LIKE` for text searches (case insensitive).
    - If filtering by amount, use `grand_total`.
    - If filtering by status, use `payment_status`.
    - Do NOT delete or drop tables. ONLY `SELECT`.
    """
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        sql_query = response.text.replace("```sql", "").replace("```", "").strip()
        
        # Security Check
        if not sql_query.upper().startswith("SELECT"):
            return {"error": "Unauthorized Query Type"}
            
        print(f"🔍 Executing SQL: {sql_query}")
        
        # 3. Execute SQL
        conn = get_db_connection()
        cursor = conn.cursor()
        rows = cursor.execute(sql_query).fetchall()
        
        # 4. Format Results
        results = []
        for row in rows:
            # We assume the query selects * or relevant columns. 
            # Ideally, we fetch the full object to keep UI consistent.
            # But the AI might select specific columns.
            # Strategy: If ID exists, fetch full object.
            try:
                if 'id' in row.keys():
                    # Fetch full data from 'json_data' column if it exists in the row, 
                    # otherwise reload by ID
                    if 'json_data' in row.keys():
                        data = json.loads(row['json_data'])
                        data['id'] = row['id']
                        data['payment_status'] = row['payment_status']
                        results.append(data)
                    else:
                        # Fallback if AI selected specific columns but included ID
                        full_row = conn.execute("SELECT json_data, payment_status FROM invoices WHERE id = ?", (row['id'],)).fetchone()
                        if full_row:
                            data = json.loads(full_row['json_data'])
                            data['id'] = row['id']
                            data['payment_status'] = full_row['payment_status']
                            results.append(data)
            except:
                continue
                
        conn.close()
        return results

    except Exception as e:
        print(f"❌ Jarvis Error: {e}")
        return []

# --- API ENDPOINTS ---

@app.get("/history")
async def get_history():
    conn = get_db_connection()
    try:
        invoices = conn.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall()
        results = []
        for row in invoices:
            try:
                data = json.loads(row['json_data'])
                data['id'] = row['id']
                data['file_path'] = row['file_path'] if 'file_path' in row.keys() else None
                data['payment_status'] = row['payment_status'] if 'payment_status' in row.keys() else "Unpaid"
                results.append(data)
            except: continue
        return results
    except: return []
    finally: conn.close()

@app.post("/upload")
async def process_invoice(file: UploadFile = File(...)):
    print(f"\n📥 Processing: {file.filename}")
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    data = extract_invoice_data(content, file.content_type)
    data["filename"] = file.filename
    data["file_url"] = f"/files/{unique_filename}"
    conn = get_db_connection()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT id FROM invoices WHERE invoice_no = ? AND gst_no = ?", (data.get('invoice_no'), data.get('gst_no'))).fetchone()
    if existing:
        data['gst_status'] = "DUPLICATE BILL"
    else:
        cursor.execute("INSERT INTO invoices (invoice_no, gst_no, invoice_date, vendor_name, grand_total, json_data, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                       (data.get('invoice_no'), data.get('gst_no'), data.get('invoice_date'), data.get('vendor_name'), data.get('grand_total'), json.dumps(data), file_path))
        conn.commit()
        data['id'] = cursor.lastrowid
    conn.close()
    return data

@app.post("/manual")
async def create_manual_invoice(inv: ManualInvoice):
    data = inv.dict()
    data['gst_status'] = "Manual Entry"
    data['math_status'] = "Manual"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO invoices (invoice_no, gst_no, invoice_date, vendor_name, grand_total, json_data, is_manual) VALUES (?, ?, ?, ?, ?, ?, 1)", 
                   (data.get('invoice_no'), data.get('gst_no'), data.get('invoice_date'), data.get('vendor_name'), data.get('grand_total'), json.dumps(data)))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    data['id'] = new_id
    return data

@app.put("/invoice/{invoice_id}")
async def update_invoice(invoice_id: int, update_data: InvoiceUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT json_data FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if not row: raise HTTPException(status_code=404)
    current_data = json.loads(row['json_data'])
    updates = update_data.dict(exclude_unset=True)
    current_data.update(updates)
    current_data = check_calculations(current_data)
    cursor.execute("UPDATE invoices SET json_data = ?, grand_total = ?, vendor_name = ?, invoice_no = ?, payment_status = ? WHERE id = ?", 
                   (json.dumps(current_data), current_data.get('grand_total'), current_data.get('vendor_name'), current_data.get('invoice_no'), updates.get('payment_status', "Unpaid"), invoice_id))
    conn.commit()
    conn.close()
    current_data['id'] = invoice_id
    return current_data

@app.delete("/invoice/{invoice_id}")
async def delete_invoice(invoice_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT file_path FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if row and row['file_path'] and os.path.exists(row['file_path']): os.remove(row['file_path'])
    cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/export/tally")
async def export_tally_xml():
    conn = get_db_connection()
    rows = conn.execute("SELECT json_data FROM invoices").fetchall()
    conn.close()
    invoices = [json.loads(row['json_data']) for row in rows]
    xml_content = generate_tally_xml(invoices)
    file_path = f"tally_export_{int(time.time())}.xml"
    with open(file_path, "wb") as f: f.write(xml_content)
    return FileResponse(file_path, filename="tally_import.xml", media_type='application/xml')