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
import io
import pypdf
from datetime import datetime
from difflib import SequenceMatcher
from typing import List, Tuple
from fastapi.responses import JSONResponse

# --- CONFIGURATION ---
# TODO: PASTE YOUR API KEY HERE
GOOGLE_API_KEY = "AIzaSyDtLJ84Kv9OdRG4WAtYCWUSoXLok5yI2LM"
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
    context: Optional[dict] = None  # {current_tab, selected_client, client_id}

class ClientCreate(BaseModel):
    company_name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    financial_year_start: Optional[str] = "April"
    client_type: Optional[str] = "Trader"

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    financial_year_start: Optional[str] = None
    client_type: Optional[str] = None
    status: Optional[str] = None

class VendorCreate(BaseModel):
    vendor_name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = "Supplier"
    default_hsn: Optional[str] = None
    default_ledger: Optional[str] = None
    default_group: Optional[str] = None

class DocumentCreate(BaseModel):
    client_id: int
    vendor_id: Optional[int] = None
    doc_type: str = "gst_invoice"
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    vendor_name: Optional[str] = None
    gst_no: Optional[str] = None
    grand_total: Optional[float] = None
    internal_notes: Optional[str] = None
    entered_by: Optional[str] = None

# --- DATABASE MANAGEMENT ---
def init_db():
    """Initialize complete multi-tenant database schema for CA office management"""
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
    
    # ========================================================================
    # TABLE 1: CLIENTS (Foundation for multi-tenant system)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL UNIQUE,
            gstin TEXT,
            pan TEXT,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            financial_year_start TEXT DEFAULT 'April',
            client_type TEXT DEFAULT 'Trader',
            status TEXT DEFAULT 'Active',
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity_date TIMESTAMP
        )
    ''')
    
    # ========================================================================
    # TABLE 2: VENDORS MASTER (Smart vendor deduplication)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_name TEXT NOT NULL UNIQUE,
            gstin TEXT,
            pan TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            vendor_type TEXT DEFAULT 'Supplier',
            default_hsn TEXT,
            default_ledger TEXT,
            default_group TEXT,
            frequency_count INTEGER DEFAULT 0,
            last_used_date TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # ========================================================================
    # TABLE 3: DOCUMENTS (Enhanced from old invoices table)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            vendor_id INTEGER,
            doc_type TEXT DEFAULT 'gst_invoice',
            invoice_no TEXT,
            invoice_date TEXT,
            vendor_name TEXT,
            gst_no TEXT,
            grand_total REAL,
            taxable_value REAL,
            tax_amount REAL,
            hsn_code TEXT,
            ledger_name TEXT,
            group_name TEXT,
            internal_notes TEXT,
            narration TEXT,
            review_status TEXT DEFAULT 'pending',
            confidence_level TEXT DEFAULT 'medium',
            entered_by TEXT,
            reviewed_by TEXT,
            entered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_date TIMESTAMP,
            file_path TEXT,
            file_type TEXT,
            file_size INTEGER,
            payment_status TEXT DEFAULT 'Unpaid',
            is_manual BOOLEAN DEFAULT 0,
            is_exported_to_tally BOOLEAN DEFAULT 0,
            json_data TEXT,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        )
    ''')
    
    # ========================================================================
    # TABLE 4: BANK TRANSACTIONS (Line-by-line bank statement entries)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bank_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            document_id INTEGER,
            transaction_date TEXT,
            description TEXT,
            debit_amount REAL DEFAULT 0,
            credit_amount REAL DEFAULT 0,
            balance REAL,
            vendor_id INTEGER,
            hsn_code TEXT,
            ledger_name TEXT,
            group_name TEXT,
            internal_notes TEXT,
            review_status TEXT DEFAULT 'pending',
            entered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (document_id) REFERENCES documents(id),
            FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        )
    ''')
    
    # ========================================================================
    # TABLE 5: COMMUNICATIONS (WhatsApp/Email/SMS log)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS communications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            document_id INTEGER,
            channel TEXT NOT NULL,
            direction TEXT DEFAULT 'outgoing',
            subject TEXT,
            message TEXT,
            status TEXT DEFAULT 'sent',
            sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered_date TIMESTAMP,
            read_date TIMESTAMP,
            scheduled_time TIMESTAMP,
            is_scheduled BOOLEAN DEFAULT 0,
            response_text TEXT,
            response_date TIMESTAMP,
            sent_by TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    ''')
    
    # ========================================================================
    # TABLE 6: MESSAGE TEMPLATES
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS message_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            channel TEXT NOT NULL,
            subject TEXT,
            body TEXT NOT NULL,
            variables TEXT,
            category TEXT DEFAULT 'general',
            usage_count INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # ========================================================================
    # TABLE 7: USERS (Multi-user support for workers + CA)
    # ========================================================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT,
            role TEXT DEFAULT 'accountant',
            phone TEXT,
            email TEXT,
            password_hash TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # ========================================================================
    # LEGACY TABLE: Keep old invoices table for backward compatibility
    # ========================================================================
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
    
    # Auto-Migration for legacy invoices table
    cursor.execute('PRAGMA table_info(invoices)')
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'file_path' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN file_path TEXT')
    if 'payment_status' not in columns: cursor.execute("ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'Unpaid'")
    if 'is_manual' not in columns: cursor.execute("ALTER TABLE invoices ADD COLUMN is_manual BOOLEAN DEFAULT 0")
    if 'hsn_code' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN hsn_code TEXT')
    if 'ledger_name' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN ledger_name TEXT')
    if 'group_name' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN group_name TEXT')
    if 'client_id' not in columns: cursor.execute('ALTER TABLE invoices ADD COLUMN client_id INTEGER')

    # ========================================================================
    # CREATE INDEXES FOR PERFORMANCE
    # ========================================================================
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_vendor ON documents(vendor_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_review ON documents(review_status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(invoice_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_bank_client ON bank_transactions(client_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_comm_client ON communications(client_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(company_name)')

    conn.commit()
    conn.close()
    
    print("✅ Database initialized with 8 tables:")
    print("   1. clients - Multi-tenant client management")
    print("   2. vendors - Smart vendor master")
    print("   3. documents - Enhanced invoice storage")
    print("   4. bank_transactions - Bank statement line items")
    print("   5. communications - WhatsApp/Email/SMS log")
    print("   6. message_templates - Communication templates")
    print("   7. users - Multi-user support")
    print("   8. invoices - Legacy backward compatibility")

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

# ============================================================================
# SMART ENTITY RESOLUTION - "SHERLOCK HOLMES" METHOD
# ============================================================================

def find_vendor_by_gstin(gstin: str) -> dict:
    """
    Layer 1: Try to find vendor by GST number
    If the name is blurry but AI reads GST number, auto-fill the name
    """
    if not gstin:
        return None
    conn = get_db_connection()
    try:
        vendor = conn.execute(
            "SELECT id, vendor_name, default_hsn, default_ledger, default_group FROM vendors WHERE UPPER(gstin) = UPPER(?)",
            (gstin.strip(),)
        ).fetchone()
        if vendor:
            print(f"🔍 Sherlock: Found vendor by GSTIN: {vendor['vendor_name']}")
            return dict(vendor)
        return None
    except:
        return None
    finally:
        conn.close()

def find_vendor_by_phone(phone: str) -> dict:
    """
    Layer 2: Try to find vendor by phone number
    """
    if not phone:
        return None
    # Clean phone number (remove spaces, +91, etc.)
    clean_phone = re.sub(r'[^0-9]', '', str(phone))[-10:]  # Last 10 digits
    if len(clean_phone) < 10:
        return None
    
    conn = get_db_connection()
    try:
        vendor = conn.execute(
            "SELECT id, vendor_name, default_hsn, default_ledger, default_group FROM vendors WHERE phone LIKE ?",
            (f'%{clean_phone}%',)
        ).fetchone()
        if vendor:
            print(f"🔍 Sherlock: Found vendor by phone: {vendor['vendor_name']}")
            return dict(vendor)
        return None
    except:
        return None
    finally:
        conn.close()

def find_similar_vendors(name: str, threshold: float = 0.7) -> List[Tuple[int, str, float]]:
    """
    Layer 3: Fuzzy matching using Levenshtein-like similarity
    Returns: List of (vendor_id, vendor_name, similarity_score)
    """
    if not name or len(name) < 2:
        return []
    
    conn = get_db_connection()
    try:
        vendors = conn.execute("SELECT id, vendor_name FROM vendors").fetchall()
        matches = []
        name_lower = name.lower().strip()
        
        for vendor in vendors:
            vendor_name = vendor['vendor_name'] or ''
            similarity = SequenceMatcher(None, name_lower, vendor_name.lower()).ratio()
            if similarity >= threshold:
                matches.append((vendor['id'], vendor['vendor_name'], round(similarity * 100, 1)))
        
        # Sort by similarity descending
        matches.sort(key=lambda x: x[2], reverse=True)
        return matches[:5]  # Top 5 matches
    except Exception as e:
        print(f"⚠️ Fuzzy match error: {e}")
        return []
    finally:
        conn.close()

def smart_resolve_vendor(invoice_data: dict) -> dict:
    """
    SMART ENTITY RESOLUTION - The 'Sherlock Holmes' Method
    Instead of defaulting to 'Cash Sales', tries 3 methods:
    1. GSTIN Match - If name blurry but GST readable, find by GST
    2. Phone Match - If phone number visible, find by phone
    3. Fuzzy Match - Find similar existing vendors
    """
    vendor_name = invoice_data.get('vendor_name', '')
    gstin = invoice_data.get('gst_no', '')
    phone = invoice_data.get('vendor_phone', '')
    
    # If we already have a valid vendor name, skip resolution
    if vendor_name and vendor_name not in ['', 'Unknown', 'AI Fail', 'Cash Sales']:
        # Still check for fuzzy matches to suggest corrections
        similar = find_similar_vendors(vendor_name, threshold=0.85)
        if similar and similar[0][2] > 90:  # >90% match
            # Auto-correct to master vendor name
            master_name = similar[0][1]
            if master_name.lower() != vendor_name.lower():
                print(f"🔄 Auto-correcting '{vendor_name}' → '{master_name}'")
                invoice_data['vendor_name'] = master_name
                invoice_data['vendor_id'] = similar[0][0]
                invoice_data['resolution_method'] = 'fuzzy_autocorrect'
        return invoice_data
    
    # Layer 1: Try GSTIN match
    vendor = find_vendor_by_gstin(gstin)
    if vendor:
        invoice_data['vendor_name'] = vendor['vendor_name']
        invoice_data['vendor_id'] = vendor['id']
        invoice_data['resolution_method'] = 'gstin_match'
        if vendor.get('default_hsn'):
            invoice_data['hsn_code'] = vendor['default_hsn']
        if vendor.get('default_ledger'):
            invoice_data['ledger_name'] = vendor['default_ledger']
        return invoice_data
    
    # Layer 2: Try Phone match
    vendor = find_vendor_by_phone(phone)
    if vendor:
        invoice_data['vendor_name'] = vendor['vendor_name']
        invoice_data['vendor_id'] = vendor['id']
        invoice_data['resolution_method'] = 'phone_match'
        return invoice_data
    
    # Layer 3: Try fuzzy match on partial name
    if vendor_name and len(vendor_name) >= 3:
        similar = find_similar_vendors(vendor_name, threshold=0.6)
        if similar:
            best_match = similar[0]
            print(f"💡 Suggested vendor: '{best_match[1]}' ({best_match[2]}% match)")
            invoice_data['vendor_suggestions'] = similar
            invoice_data['resolution_method'] = 'fuzzy_suggestion'
            # If very high match (>85%), auto-apply
            if best_match[2] > 85:
                invoice_data['vendor_name'] = best_match[1]
                invoice_data['vendor_id'] = best_match[0]
            return invoice_data
    
    # Fallback: Cash Sales (only for truly unidentifiable documents)
    if not vendor_name or vendor_name in ['', 'Unknown', 'AI Fail']:
        invoice_data['vendor_name'] = 'Cash Sales'
        invoice_data['resolution_method'] = 'fallback'
        print("⚠️ Sherlock: No match found, using 'Cash Sales' fallback")
    
    return invoice_data

# ============================================================================
# TALLY GUARD - STRICT EXPORT VALIDATION
# ============================================================================

def sanitize_for_tally(invoices: list) -> list:
    """
    TALLY GUARD - Gatekeeper that ensures 100% Tally compatibility
    
    Rules enforced:
    1. Date must exist (default: today)
    2. Vendor must exist (Smart Resolution applied first)
    3. Amount must be valid number
    4. Debit = Credit (balanced entry)
    5. NO phone/email/notes exported (Tally rejects extra fields)
    """
    today = datetime.now().strftime('%Y%m%d')
    sanitized = []
    skipped = 0
    
    for inv in invoices:
        # Create clean copy without internal fields
        clean = {}
        
        # 1. Validate date
        date = inv.get('invoice_date', '')
        if date:
            # Normalize date format for Tally (YYYYMMDD)
            try:
                if '-' in date:
                    parts = date.split('-')
                    if len(parts) == 3:
                        clean['invoice_date'] = f"{parts[0]}{parts[1].zfill(2)}{parts[2].zfill(2)}"
                    else:
                        clean['invoice_date'] = today
                else:
                    clean['invoice_date'] = date
            except:
                clean['invoice_date'] = today
        else:
            clean['invoice_date'] = today
            print(f"⚠️ Tally Guard: Missing date, using today for invoice #{inv.get('invoice_no')}")
        
        # 2. Validate vendor (Smart Resolution should have been applied during upload)
        vendor_name = inv.get('vendor_name', '')
        if not vendor_name or vendor_name in ['', 'Unknown', 'AI Fail']:
            vendor_name = 'Cash Sales'
            print(f"⚠️ Tally Guard: Missing vendor, using 'Cash Sales' for invoice #{inv.get('invoice_no')}")
        clean['vendor_name'] = vendor_name
        
        # 3. Validate amounts
        grand_total = safe_float(inv.get('grand_total', 0))
        taxable_value = safe_float(inv.get('taxable_value', 0))
        
        if grand_total <= 0:
            print(f"❌ Tally Guard: Skipping invoice #{inv.get('invoice_no')} - invalid amount")
            skipped += 1
            continue
        
        # If taxable_value missing, estimate from total
        if taxable_value <= 0:
            # Assume 18% GST rate as default
            taxable_value = round(grand_total / 1.18, 2)
        
        clean['grand_total'] = grand_total
        clean['taxable_value'] = taxable_value
        clean['invoice_no'] = inv.get('invoice_no', f'INV-{int(time.time())}')
        clean['ledger_name'] = inv.get('ledger_name', 'Purchase A/c')
        
        # Tax breakdown for GST entries
        igst = safe_float(inv.get('igst_amount', 0))
        cgst = safe_float(inv.get('cgst_amount', 0))
        sgst = safe_float(inv.get('sgst_amount', 0))
        
        clean['igst_amount'] = igst
        clean['cgst_amount'] = cgst
        clean['sgst_amount'] = sgst
        
        # 4. Verify balanced entry (Debit should equal Credit)
        # In purchase voucher: Debit (Purchase + Tax) = Credit (Party)
        debit_total = taxable_value + igst + cgst + sgst
        if abs(debit_total - grand_total) > 1:  # Allow ₹1 rounding
            print(f"⚠️ Tally Guard: Adjusting imbalance for #{inv.get('invoice_no')}")
            # Auto-balance by adjusting taxable value
            clean['taxable_value'] = grand_total - igst - cgst - sgst
        
        sanitized.append(clean)
    
    print(f"✅ Tally Guard: {len(sanitized)} entries ready, {skipped} skipped")
    return sanitized

def generate_tally_xml(invoices):
    """Generate Tally-compatible XML with sanitization"""
    # Apply Tally Guard sanitization
    clean_invoices = sanitize_for_tally(invoices)
    
    envelope = ET.Element("ENVELOPE")
    header = ET.SubElement(envelope, "HEADER")
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    body = ET.SubElement(envelope, "BODY")
    import_data = ET.SubElement(body, "IMPORTDATA")
    request_data = ET.SubElement(import_data, "REQUESTDATA")
    
    for inv in clean_invoices:
        tally_msg = ET.SubElement(request_data, "TALLYMESSAGE")
        voucher = ET.SubElement(tally_msg, "VOUCHER", {"VCHTYPE": "Purchase", "ACTION": "Create"})
        ET.SubElement(voucher, "DATE").text = inv.get('invoice_date', datetime.now().strftime('%Y%m%d'))
        ET.SubElement(voucher, "VOUCHERNUMBER").text = str(inv.get('invoice_no'))
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = inv.get('vendor_name', 'Cash Sales')
        
        # Credit entry (Party Account)
        ledger_entry_cr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(ledger_entry_cr, "LEDGERNAME").text = inv.get('vendor_name', 'Cash Sales')
        ET.SubElement(ledger_entry_cr, "ISDEEMEDPOSITIVE").text = "No"
        ET.SubElement(ledger_entry_cr, "AMOUNT").text = str(inv.get('grand_total', 0))

        # Debit entry (Purchase Account)
        ledger_entry_dr = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(ledger_entry_dr, "LEDGERNAME").text = inv.get('ledger_name', 'Purchase A/c')
        ET.SubElement(ledger_entry_dr, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(ledger_entry_dr, "AMOUNT").text = str(-abs(inv.get('taxable_value', 0)))  # Negative for debit
        
        # GST Entries (if applicable)
        igst = inv.get('igst_amount', 0)
        cgst = inv.get('cgst_amount', 0)
        sgst = inv.get('sgst_amount', 0)
        
        if igst > 0:
            gst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(gst_entry, "LEDGERNAME").text = "IGST Input"
            ET.SubElement(gst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(gst_entry, "AMOUNT").text = str(-abs(igst))
        
        if cgst > 0:
            cgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(cgst_entry, "LEDGERNAME").text = "CGST Input"
            ET.SubElement(cgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(cgst_entry, "AMOUNT").text = str(-abs(cgst))
        
        if sgst > 0:
            sgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(sgst_entry, "LEDGERNAME").text = "SGST Input"
            ET.SubElement(sgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(sgst_entry, "AMOUNT").text = str(-abs(sgst))

    return ET.tostring(envelope, encoding='utf8', method='xml')

# --- NEW: JARVIS AI SEARCH ENGINE ---
@app.post("/search/ai")
async def ai_search(query: SearchQuery):
    print(f"🤖 Tax.AI analyzing: {query.query}")
    print(f"   Context: {query.context}")
    
    # Get context info
    current_tab = query.context.get('current_tab', 'dashboard') if query.context else 'dashboard'
    selected_client = query.context.get('selected_client') if query.context else None
    
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
    
    # Tab-specific help context
    tab_help = {
        'dashboard': 'The Dashboard shows analytics: total invoices, GST amounts, monthly trends, top vendors.',
        'upload': 'Add Bills lets you upload invoice PDFs/images. The AI extracts data automatically.',
        'register': 'Bill Register shows all invoices. You can edit, delete, filter, and export to Tally.',
        'triage': 'Pending shows unassigned documents that need to be linked to a client.',
        'comms': 'Messages lets you send WhatsApp, Email, SMS to clients for follow-ups.'
    }
    
    # GST Law context for legal queries
    gst_context = '''
    Important GST Sections:
    - Section 16: Input Tax Credit conditions (ITC available only if supplier files return)
    - Section 17: Blocked ITC (motor vehicles, food, personal use)
    - Section 37: GSTR-1 filing (sales return)
    - Section 39: GSTR-3B filing (summary return with tax payment)
    - Section 142: Transitional provisions
    - Rule 36(4): ITC limited to 5% over auto-populated GSTR-2B
    '''
    
    # 2. Ask Gemini - Context-aware prompt
    prompt = f"""
    You are Tax.AI, an expert GST assistant for Indian CAs and accountants.
    
    Current Tab: {current_tab}
    Tab Description: {tab_help.get(current_tab, 'Tax.AI Dashboard')}
    Selected Client: {selected_client or 'No client selected'}
    
    GST Law Knowledge:
    {gst_context}
    
    Database Schema: {schema}
    
    User Question: "{query.query}"
    
    Instructions:
    1. If asking about "how to use" or "what is this page", explain the current tab features simply.
    2. If asking about GST law, cite relevant sections.
    3. If asking for data, return ONLY a SQL SELECT query for the invoices table.
    4. Be concise and helpful. Use simple Hindi-English mix if appropriate.
    
    If returning SQL, output ONLY the query starting with SELECT. No markdown.
    If explaining, start with "EXPLAIN:" followed by your answer.
    """
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        ai_response = response.text.replace("```sql", "").replace("```", "").strip()
        
        # Check if it's an explanation (not SQL)
        if ai_response.upper().startswith("EXPLAIN:"):
            explanation = ai_response.replace("EXPLAIN:", "").strip()
            print(f"💡 Tax.AI Explanation: {explanation[:100]}...")
            return {"explanation": explanation, "type": "help"}
        
        # Security Check for SQL
        sql_query = ai_response
        if not sql_query.upper().startswith("SELECT"):
            # Might be a text explanation without EXPLAIN prefix
            return {"explanation": ai_response, "type": "help"}
            
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
                # Include HSN, Ledger, Group from database columns (they override json_data if present)
                if 'hsn_code' in row.keys() and row['hsn_code']:
                    data['hsn_code'] = row['hsn_code']
                if 'ledger_name' in row.keys() and row['ledger_name']:
                    data['ledger_name'] = row['ledger_name']
                if 'group_name' in row.keys() and row['group_name']:
                    data['group_name'] = row['group_name']
                results.append(data)
            except: continue
        return results
    except: return []
    finally: conn.close()

@app.post("/upload")
async def process_invoice(
    file: UploadFile = File(...),
    client_id: int = None,
    doc_type: str = "gst_invoice",
    entered_by: str = None
):
    """
    Enhanced upload with client selection and document type classification
    Supports: gst_invoice, bank_statement, payment_receipt, expense_bill, credit_note
    """
    print(f"\n📥 Processing: {file.filename}")
    print(f"   Client ID: {client_id}")
    print(f"   Document Type: {doc_type}")
    print(f"   Entered By: {entered_by}")
    
    # Save file
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    file_content = await file.read()
    file_size = len(file_content)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Extract data using AI
    data = extract_invoice_data(file_content, file.content_type)
    data["filename"] = file.filename
    data["file_url"] = f"/files/{unique_filename}"
    
    # 🤖 AI-powered HSN, Ledger, and Group detection
    ai_classification = detect_hsn_ledger_group(data)
    data['hsn_code'] = ai_classification['hsn_code']
    data['ledger_name'] = ai_classification['ledger_name']
    data['group_name'] = ai_classification['group_name']
    data['ai_confidence'] = ai_classification['ai_confidence']
    confidence_level = ai_classification['ai_confidence']
    
    # 🔍 SMART ENTITY RESOLUTION - "Sherlock Holmes" method
    # Tries GSTIN match, Phone match, and Fuzzy matching before falling back to "Cash Sales"
    data = smart_resolve_vendor(data)
    
    print(f"🎯 AI Classification: HSN={data['hsn_code']}, Ledger={data['ledger_name']}, Group={data['group_name']} (Confidence: {confidence_level})")
    if data.get('resolution_method'):
        print(f"🔍 Vendor Resolution: {data.get('vendor_name')} via {data.get('resolution_method')}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check for duplicates
    existing = cursor.execute(
        "SELECT id FROM documents WHERE invoice_no = ? AND gst_no = ? AND client_id = ?", 
        (data.get('invoice_no'), data.get('gst_no'), client_id)
    ).fetchone()
    
    if existing:
        data['gst_status'] = "DUPLICATE BILL"
        data['error'] = "This bill already exists for this client"
        conn.close()
        return data
    
    # Get or create vendor
    vendor_id = None
    if data.get('vendor_name'):
        vendor_id = get_or_create_vendor(data['vendor_name'], conn)
    
    # Determine review status based on confidence
    if confidence_level == 'high':
        review_status = 'approved'  # Auto-approve high confidence
    elif confidence_level == 'medium':
        review_status = 'pending'
    else:
        review_status = 'needs_review'  # Low confidence needs attention
    
    # Determine file type
    file_ext = file.filename.split('.')[-1].lower()
    file_type = 'pdf' if file_ext == 'pdf' else 'image' if file_ext in ['jpg', 'jpeg', 'png'] else 'other'
    
    # Insert into new documents table
    cursor.execute('''
        INSERT INTO documents (
            client_id, vendor_id, doc_type, invoice_no, invoice_date, vendor_name, gst_no,
            grand_total, taxable_value, tax_amount, hsn_code, ledger_name, group_name,
            review_status, confidence_level, entered_by, file_path, file_type, file_size,
            payment_status, json_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        client_id, vendor_id, doc_type, data.get('invoice_no'), data.get('invoice_date'),
        data.get('vendor_name'), data.get('gst_no'), data.get('grand_total'),
        data.get('taxable_value'), data.get('tax_amount'), data.get('hsn_code'),
        data.get('ledger_name'), data.get('group_name'), review_status, confidence_level,
        entered_by, file_path, file_type, file_size, 'Unpaid', json.dumps(data)
    ))
    
    conn.commit()
    new_id = cursor.lastrowid
    
    # Also insert into legacy invoices table for backward compatibility
    cursor.execute('''
        INSERT INTO invoices (
            invoice_no, gst_no, invoice_date, vendor_name, grand_total, json_data, 
            file_path, hsn_code, ledger_name, group_name, client_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('invoice_no'), data.get('gst_no'), data.get('invoice_date'),
        data.get('vendor_name'), data.get('grand_total'), json.dumps(data),
        file_path, data.get('hsn_code'), data.get('ledger_name'), data.get('group_name'),
        client_id
    ))
    conn.commit()
    
    # Update client last activity
    if client_id:
        cursor.execute("UPDATE clients SET last_activity_date = CURRENT_TIMESTAMP WHERE id = ?", (client_id,))
        conn.commit()
    
    conn.close()
    
    data['id'] = new_id
    data['review_status'] = review_status
    data['confidence_level'] = confidence_level
    data['vendor_id'] = vendor_id
    
    print(f"✅ Document saved: ID={new_id}, Status={review_status}")
    
    return data

@app.post("/manual")
async def create_manual_invoice(inv: ManualInvoice):
    data = inv.dict()
    data['gst_status'] = "Manual Entry"
    data['math_status'] = "Manual"
    
    # 🤖 AI-powered HSN, Ledger, and Group detection for manual entries too
    ai_classification = detect_hsn_ledger_group(data)
    if not data.get('hsn_code'):
        data['hsn_code'] = ai_classification['hsn_code']
    if not data.get('ledger_name'):
        data['ledger_name'] = ai_classification['ledger_name']
    if not data.get('group_name'):
        data['group_name'] = ai_classification['group_name']
    data['ai_confidence'] = ai_classification.get('ai_confidence', 'manual')
    print(f"🎯 Manual Entry AI Classification: HSN={data['hsn_code']}, Ledger={data['ledger_name']}, Group={data['group_name']}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO invoices (invoice_no, gst_no, invoice_date, vendor_name, grand_total, json_data, is_manual, hsn_code, ledger_name, group_name) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)", 
                   (data.get('invoice_no'), data.get('gst_no'), data.get('invoice_date'), data.get('vendor_name'), data.get('grand_total'), json.dumps(data), data.get('hsn_code'), data.get('ledger_name'), data.get('group_name')))
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
    
    # Update HSN, Ledger, Group columns if they were updated
    hsn_code = current_data.get('hsn_code')
    ledger_name = current_data.get('ledger_name')
    group_name = current_data.get('group_name')
    
    cursor.execute("UPDATE invoices SET json_data = ?, grand_total = ?, vendor_name = ?, invoice_no = ?, payment_status = ?, hsn_code = ?, ledger_name = ?, group_name = ? WHERE id = ?", 
                   (json.dumps(current_data), current_data.get('grand_total'), current_data.get('vendor_name'), current_data.get('invoice_no'), updates.get('payment_status', "Unpaid"), hsn_code, ledger_name, group_name, invoice_id))
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
# ============================================================================
# COMMUNICATION SYSTEM ENDPOINTS (FULLY INTEGRATED)
# ============================================================================

# Message templates stored in database format
TEMPLATES = [
    {
        "id": 1,
        "name": "Invoice Reminder",
        "channel": "whatsapp",
        "body": "Hi {client_name}! We received your payment of ₹{amount}. Could you please send the GST invoice? Thank you!",
        "variables": ["client_name", "amount"]
    },
    {
        "id": 2,
        "name": "Payment Due",
        "channel": "whatsapp",
        "body": "Dear {client_name}, This is a friendly reminder that invoice #{invoice_no} for ₹{amount} is pending. Please arrange payment at your earliest convenience.",
        "variables": ["client_name", "invoice_no", "amount"]
    },
    {
        "id": 3,
        "name": "GST Bill Request",
        "channel": "whatsapp",
        "body": "Hello {client_name}! We need the GST bill for the recent purchase of ₹{amount}. Please share the invoice details. Thank you!",
        "variables": ["client_name", "amount"]
    },
    {
        "id": 4,
        "name": "Monthly Report",
        "channel": "email",
        "subject": "Monthly Summary - {month}",
        "body": "Dear {client_name},\n\nPlease find your account summary for {month} attached.\n\nTotal Invoices: {count}\nTotal Amount: ₹{total}\n\nRegards,\nAccounts Team",
        "variables": ["client_name", "month", "count", "total"]
    },
    {
        "id": 5,
        "name": "Document Clarification",
        "channel": "whatsapp",
        "body": "Hello {client_name}! Regarding document #{invoice_no} for ₹{amount}:\n\n{note}\n\nPlease clarify at your earliest. Thank you!",
        "variables": ["client_name", "invoice_no", "amount", "note"]
    }
]

@app.get("/communications/scheduled")
async def get_scheduled_communications():
    """Get today's scheduled communications from database"""
    conn = get_db_connection()
    try:
        # Get scheduled communications that haven't been sent
        comms = conn.execute('''
            SELECT c.*, cl.company_name as client_name, cl.phone as client_phone
            FROM communications c
            LEFT JOIN clients cl ON c.client_id = cl.id
            WHERE c.status = 'scheduled' AND DATE(c.scheduled_time) <= DATE('now', '+1 day')
            ORDER BY c.scheduled_time ASC
            LIMIT 20
        ''').fetchall()
        
        results = []
        for comm in comms:
            c = dict(comm)
            # Format time nicely
            if c.get('scheduled_time'):
                try:
                    dt = datetime.fromisoformat(c['scheduled_time'])
                    c['scheduled_time'] = dt.strftime('%I:%M %p')
                except:
                    pass
            results.append(c)
        
        # If no scheduled comms, return empty (not mock data)
        return results
    except Exception as e:
        print(f"❌ Error fetching scheduled comms: {e}")
        return []
    finally:
        conn.close()

@app.get("/communications/recent")
async def get_recent_communications():
    """Get recent communication history from database"""
    conn = get_db_connection()
    try:
        comms = conn.execute('''
            SELECT c.*, cl.company_name as client_name, cl.phone as client_phone
            FROM communications c
            LEFT JOIN clients cl ON c.client_id = cl.id
            ORDER BY c.sent_date DESC
            LIMIT 20
        ''').fetchall()
        
        results = []
        for comm in comms:
            c = dict(comm)
            # Format timestamp
            if c.get('sent_date'):
                try:
                    dt = datetime.fromisoformat(c['sent_date'])
                    now = datetime.now()
                    if dt.date() == now.date():
                        c['timestamp'] = dt.strftime('%I:%M %p')
                    elif (now - dt).days == 1:
                        c['timestamp'] = f"Yesterday {dt.strftime('%I:%M %p')}"
                    else:
                        c['timestamp'] = dt.strftime('%b %d, %I:%M %p')
                except:
                    c['timestamp'] = c.get('sent_date', 'Unknown')
            results.append(c)
        
        return results
    except Exception as e:
        print(f"❌ Error fetching recent comms: {e}")
        return []
    finally:
        conn.close()

@app.get("/templates")
async def get_templates(channel: str = None):
    """Get message templates"""
    if channel:
        return [t for t in TEMPLATES if t['channel'] == channel]
    return TEMPLATES

@app.post("/whatsapp/send")
async def send_whatsapp(data: dict):
    """
    Send WhatsApp message - generates a wa.me link and logs to database
    """
    conn = get_db_connection()
    try:
        client_id = data.get('client_id')
        message = data.get('message', '')
        
        # Get client phone number
        phone = None
        client_name = "Unknown Client"
        if client_id:
            client = conn.execute(
                "SELECT company_name, phone FROM clients WHERE id = ?", 
                (client_id,)
            ).fetchone()
            if client:
                phone = client['phone']
                client_name = client['company_name']
        
        # Clean phone number
        if phone:
            clean_phone = ''.join(filter(str.isdigit, str(phone)))
            if len(clean_phone) == 10:
                clean_phone = '91' + clean_phone
        else:
            clean_phone = None
        
        # Generate WhatsApp link
        whatsapp_link = None
        if clean_phone:
            encoded_message = message.replace('\n', '%0A').replace(' ', '%20')
            whatsapp_link = f"https://wa.me/{clean_phone}?text={encoded_message}"
        
        # Log to database
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO communications (client_id, channel, message, status, sent_date)
            VALUES (?, 'whatsapp', ?, 'sent', CURRENT_TIMESTAMP)
        ''', (client_id, message))
        conn.commit()
        
        print(f"📱 WhatsApp Message Prepared:")
        print(f"   Client: {client_name}")
        print(f"   Phone: {phone}")
        print(f"   Link: {whatsapp_link}")
        
        return {
            "status": "sent",
            "message": "WhatsApp message prepared successfully",
            "whatsapp_link": whatsapp_link,
            "client_name": client_name,
            "phone": phone
        }
    except Exception as e:
        print(f"❌ WhatsApp error: {e}")
        return {"status": "failed", "error": str(e)}
    finally:
        conn.close()

@app.post("/email/send")
async def send_email(data: dict):
    """Send email - logs to database (SMTP integration ready)"""
    conn = get_db_connection()
    try:
        client_id = data.get('client_id')
        subject = data.get('subject', '')
        message = data.get('message', '')
        
        # Get client email
        email = None
        client_name = "Unknown Client"
        if client_id:
            client = conn.execute(
                "SELECT company_name, email FROM clients WHERE id = ?", 
                (client_id,)
            ).fetchone()
            if client:
                email = client['email']
                client_name = client['company_name']
        
        # Log to database
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO communications (client_id, channel, message, status, sent_date)
            VALUES (?, 'email', ?, 'sent', CURRENT_TIMESTAMP)
        ''', (client_id, f"Subject: {subject}\n\n{message}"))
        conn.commit()
        
        print(f"📧 Email Logged:")
        print(f"   Client: {client_name}")
        print(f"   Email: {email}")
        print(f"   Subject: {subject}")
        
        return {
            "status": "sent",
            "message": "Email logged successfully",
            "client_name": client_name,
            "client_email": email
        }
    except Exception as e:
        print(f"❌ Email error: {e}")
        return {"status": "failed", "error": str(e)}
    finally:
        conn.close()

@app.post("/sms/send")
async def send_sms(data: dict):
    """Send SMS - logs to database"""
    conn = get_db_connection()
    try:
        client_id = data.get('client_id')
        message = data.get('message', '')
        
        # Get client phone
        phone = None
        client_name = "Unknown Client"
        if client_id:
            client = conn.execute(
                "SELECT company_name, phone FROM clients WHERE id = ?", 
                (client_id,)
            ).fetchone()
            if client:
                phone = client['phone']
                client_name = client['company_name']
        
        # Log to database
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO communications (client_id, channel, message, status, sent_date)
            VALUES (?, 'sms', ?, 'sent', CURRENT_TIMESTAMP)
        ''', (client_id, message))
        conn.commit()
        
        print(f"💬 SMS Logged:")
        print(f"   Client: {client_name}")
        print(f"   Phone: {phone}")
        
        return {
            "status": "sent",
            "message": "SMS logged successfully",
            "client_name": client_name,
            "phone": phone
        }
    except Exception as e:
        print(f"❌ SMS error: {e}")
        return {"status": "failed", "error": str(e)}
    finally:
        conn.close()

@app.post("/calls/schedule")
async def schedule_call(data: dict):
    """Schedule a call reminder"""
    conn = get_db_connection()
    try:
        client_id = data.get('client_id')
        call_type = data.get('type', 'Follow-up Call')
        schedule_time = data.get('schedule_time')
        
        # Get client info
        client_name = "Unknown Client"
        phone = None
        if client_id:
            client = conn.execute(
                "SELECT company_name, phone FROM clients WHERE id = ?", 
                (client_id,)
            ).fetchone()
            if client:
                client_name = client['company_name']
                phone = client['phone']
        
        # Log to database
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO communications (client_id, channel, message, status, scheduled_time)
            VALUES (?, 'call', ?, 'scheduled', ?)
        ''', (client_id, f"Call Type: {call_type}", schedule_time))
        conn.commit()
        
        print(f"📞 Call Scheduled:")
        print(f"   Client: {client_name}")
        print(f"   Phone: {phone}")
        print(f"   Time: {schedule_time}")
        
        return {
            "status": "scheduled",
            "message": "Call scheduled successfully",
            "client_name": client_name,
            "phone": phone
        }
    except Exception as e:
        print(f"❌ Call schedule error: {e}")
        return {"status": "failed", "error": str(e)}
    finally:
        conn.close()

@app.get("/communications/analytics")
async def get_communication_analytics():
    """Get real communication statistics from database"""
    conn = get_db_connection()
    try:
        # Count by channel
        whatsapp_count = conn.execute(
            "SELECT COUNT(*) as count FROM communications WHERE channel = 'whatsapp'"
        ).fetchone()['count']
        
        email_count = conn.execute(
            "SELECT COUNT(*) as count FROM communications WHERE channel = 'email'"
        ).fetchone()['count']
        
        sms_count = conn.execute(
            "SELECT COUNT(*) as count FROM communications WHERE channel = 'sms'"
        ).fetchone()['count']
        
        call_count = conn.execute(
            "SELECT COUNT(*) as count FROM communications WHERE channel = 'call'"
        ).fetchone()['count']
        
        # Today's counts
        today_total = conn.execute(
            "SELECT COUNT(*) as count FROM communications WHERE DATE(sent_date) = DATE('now')"
        ).fetchone()['count']
        
        return {
            "whatsapp": {
                "sent": whatsapp_count,
                "delivered": whatsapp_count,  # Assume delivered for now
                "replied": 0,
                "response_rate": 0
            },
            "email": {
                "sent": email_count,
                "opened": 0,
                "clicked": 0,
                "open_rate": 0
            },
            "sms": {
                "sent": sms_count,
                "delivered": sms_count,
                "delivery_rate": 100
            },
            "calls": {
                "completed": call_count,
                "missed": 0,
                "avg_duration": "0 min"
            },
            "today_total": today_total
        }
    except Exception as e:
        print(f"❌ Analytics error: {e}")
        return {
            "whatsapp": {"sent": 0},
            "email": {"sent": 0},
            "sms": {"sent": 0},
            "calls": {"completed": 0}
        }
    finally:
        conn.close()

@app.get("/communications/client/{client_id}")
async def get_client_communications(client_id: int):
    """Get all communications for a specific client"""
    conn = get_db_connection()
    try:
        comms = conn.execute('''
            SELECT c.*, cl.company_name as client_name
            FROM communications c
            LEFT JOIN clients cl ON c.client_id = cl.id
            WHERE c.client_id = ?
            ORDER BY c.sent_date DESC
            LIMIT 50
        ''', (client_id,)).fetchall()
        
        return [dict(c) for c in comms]
    except Exception as e:
        print(f"❌ Error fetching client comms: {e}")
        return []
    finally:
        conn.close()

print("✅ Communication System endpoints loaded!")
print("📱 Available endpoints:")
print("   GET  /communications/scheduled")
print("   GET  /communications/recent")
print("   GET  /templates")
print("   POST /whatsapp/send")
print("   POST /email/send")
print("   POST /sms/send")
print("   POST /calls/schedule")
print("   GET  /communications/analytics")


# ============================================================================
# CLIENT MANAGEMENT SYSTEM
# ============================================================================

@app.get("/clients")
async def get_clients(status: str = None, search: str = None):
    """Get all clients with optional filtering"""
    conn = get_db_connection()
    try:
        query = "SELECT * FROM clients WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if search:
            query += " AND (company_name LIKE ? OR gstin LIKE ? OR phone LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
        
        query += " ORDER BY company_name ASC"
        
        clients = conn.execute(query, params).fetchall()
        return [dict(row) for row in clients]
    except Exception as e:
        print(f"❌ Error fetching clients: {e}")
        return []
    finally:
        conn.close()

@app.get("/clients/{client_id}")
async def get_client(client_id: int):
    """Get single client details with document count"""
    conn = get_db_connection()
    try:
        client = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Count documents for this client
        doc_count = conn.execute("SELECT COUNT(*) as count FROM documents WHERE client_id = ?", (client_id,)).fetchone()
        invoice_count = conn.execute("SELECT COUNT(*) as count FROM invoices WHERE client_id = ?", (client_id,)).fetchone()
        
        result = dict(client)
        result['document_count'] = doc_count['count'] + invoice_count['count']
        result['pending_review_count'] = conn.execute(
            "SELECT COUNT(*) as count FROM documents WHERE client_id = ? AND review_status = 'pending'", 
            (client_id,)
        ).fetchone()['count']
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/clients")
async def create_client(client: ClientCreate):
    """Create new client"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO clients (company_name, gstin, pan, contact_person, phone, email, 
                                address, city, state, financial_year_start, client_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            client.company_name, client.gstin, client.pan, client.contact_person,
            client.phone, client.email, client.address, client.city, client.state,
            client.financial_year_start, client.client_type
        ))
        conn.commit()
        new_id = cursor.lastrowid
        print(f"✅ Client created: {client.company_name} (ID: {new_id})")
        return {"id": new_id, "status": "success", "message": "Client created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Client with this name already exists")
    except Exception as e:
        print(f"❌ Error creating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/clients/{client_id}")
async def update_client(client_id: int, client: ClientUpdate):
    """Update client details"""
    conn = get_db_connection()
    try:
        updates = client.dict(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        set_clause = ", ".join([f"{key} = ?" for key in updates.keys()])
        query = f"UPDATE clients SET {set_clause}, last_activity_date = CURRENT_TIMESTAMP WHERE id = ?"
        
        cursor = conn.cursor()
        cursor.execute(query, list(updates.values()) + [client_id])
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        
        print(f"✅ Client updated: ID {client_id}")
        return {"status": "success", "message": "Client updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/clients/{client_id}")
async def delete_client(client_id: int):
    """Delete client (soft delete by setting status to Inactive)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE clients SET status = 'Inactive' WHERE id = ?", (client_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        
        print(f"✅ Client deactivated: ID {client_id}")
        return {"status": "success", "message": "Client deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/clients/{client_id}/documents")
async def get_client_documents(client_id: int, doc_type: str = None):
    """Get all documents for a specific client"""
    conn = get_db_connection()
    try:
        # Get from new documents table
        query = "SELECT * FROM documents WHERE client_id = ?"
        params = [client_id]
        
        if doc_type:
            query += " AND doc_type = ?"
            params.append(doc_type)
        
        query += " ORDER BY invoice_date DESC, id DESC"
        
        documents = conn.execute(query, params).fetchall()
        results = []
        
        for row in documents:
            doc = dict(row)
            # Parse json_data if exists
            if doc.get('json_data'):
                try:
                    json_data = json.loads(doc['json_data'])
                    doc.update(json_data)
                except:
                    pass
            results.append(doc)
        
        # Also get from legacy invoices table
        legacy = conn.execute(
            "SELECT * FROM invoices WHERE client_id = ? ORDER BY id DESC",
            (client_id,)
        ).fetchall()
        
        for row in legacy:
            try:
                data = json.loads(row['json_data'])
                data['id'] = row['id']
                data['is_legacy'] = True
                results.append(data)
            except:
                continue
        
        return results
    except Exception as e:
        print(f"❌ Error fetching client documents: {e}")
        return []
    finally:
        conn.close()

print("✅ Client Management System loaded!")
print("📊 Client endpoints:")
print("   GET    /clients")
print("   GET    /clients/{id}")
print("   POST   /clients")
print("   PUT    /clients/{id}")
print("   DELETE /clients/{id}")
print("   GET    /clients/{id}/documents")


# ============================================================================
# VENDOR MASTER SYSTEM WITH SMART AUTOCOMPLETE
# ============================================================================

@app.get("/vendors")
async def get_vendors(search: str = None, vendor_type: str = None):
    """Get all vendors with optional search and filtering"""
    conn = get_db_connection()
    try:
        query = "SELECT * FROM vendors WHERE 1=1"
        params = []
        
        if search:
            query += " AND vendor_name LIKE ?"
            params.append(f"%{search}%")
        
        if vendor_type:
            query += " AND vendor_type = ?"
            params.append(vendor_type)
        
        query += " ORDER BY frequency_count DESC, vendor_name ASC"
        
        vendors = conn.execute(query, params).fetchall()
        return [dict(row) for row in vendors]
    except Exception as e:
        print(f"❌ Error fetching vendors: {e}")
        return []
    finally:
        conn.close()

@app.get("/vendors/autocomplete")
async def vendor_autocomplete(q: str):
    """Smart vendor autocomplete with fuzzy matching and similarity scores"""
    conn = get_db_connection()
    try:
        # First, try exact/LIKE search
        search_term = f"%{q}%"
        vendors = conn.execute('''
            SELECT id, vendor_name, gstin, default_hsn, default_ledger, default_group, 
                   frequency_count, last_used_date
            FROM vendors 
            WHERE vendor_name LIKE ? 
            ORDER BY frequency_count DESC, vendor_name ASC 
            LIMIT 10
        ''', (search_term,)).fetchall()
        
        results = []
        q_lower = q.lower().strip()
        
        for vendor in vendors:
            v = dict(vendor)
            # Calculate similarity score
            vendor_name_lower = (v['vendor_name'] or '').lower()
            similarity = SequenceMatcher(None, q_lower, vendor_name_lower).ratio()
            v['similarity'] = round(similarity * 100, 1)
            
            # Add helpful metadata
            if v['last_used_date']:
                try:
                    last_used = datetime.fromisoformat(v['last_used_date'])
                    days_ago = (datetime.now() - last_used).days
                    v['last_used_label'] = f"{days_ago} days ago" if days_ago > 0 else "Today"
                except:
                    v['last_used_label'] = "Unknown"
            else:
                v['last_used_label'] = "Never used"
            
            v['usage_label'] = f"Used {v['frequency_count']} times"
            results.append(v)
        
        # If no exact matches, try fuzzy matching
        if len(results) == 0 and len(q) >= 3:
            fuzzy_matches = find_similar_vendors(q, threshold=0.4)
            for vendor_id, vendor_name, similarity in fuzzy_matches:
                # Get full vendor details
                vendor = conn.execute(
                    "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
                ).fetchone()
                if vendor:
                    v = dict(vendor)
                    v['similarity'] = similarity
                    v['fuzzy_match'] = True
                    v['usage_label'] = f"Used {v.get('frequency_count', 0)} times"
                    v['last_used_label'] = "Fuzzy match"
                    results.append(v)
        
        # Sort by similarity descending
        results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        
        return results[:10]
    except Exception as e:
        print(f"❌ Error in vendor autocomplete: {e}")
        return []
    finally:
        conn.close()

@app.post("/vendors")
async def create_vendor(vendor: VendorCreate):
    """Create new vendor or return existing if similar name found"""
    conn = get_db_connection()
    try:
        # Check for similar vendor names (prevent duplicates)
        similar = conn.execute('''
            SELECT * FROM vendors 
            WHERE LOWER(vendor_name) = LOWER(?) 
            OR LOWER(vendor_name) LIKE LOWER(?)
        ''', (vendor.vendor_name, f"%{vendor.vendor_name}%")).fetchone()
        
        if similar:
            return {
                "status": "exists",
                "message": f"Similar vendor exists: {similar['vendor_name']}",
                "existing_vendor": dict(similar),
                "suggestion": "Use existing vendor or modify name"
            }
        
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO vendors (vendor_name, gstin, pan, phone, email, address, 
                                vendor_type, default_hsn, default_ledger, default_group)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            vendor.vendor_name, vendor.gstin, vendor.pan, vendor.phone, vendor.email,
            vendor.address, vendor.vendor_type, vendor.default_hsn, 
            vendor.default_ledger, vendor.default_group
        ))
        conn.commit()
        new_id = cursor.lastrowid
        print(f"✅ Vendor created: {vendor.vendor_name} (ID: {new_id})")
        return {"id": new_id, "status": "success", "message": "Vendor created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Vendor with this name already exists")
    except Exception as e:
        print(f"❌ Error creating vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: int):
    """Get vendor details with usage statistics"""
    conn = get_db_connection()
    try:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        result = dict(vendor)
        
        # Get document count
        result['document_count'] = conn.execute(
            "SELECT COUNT(*) as count FROM documents WHERE vendor_id = ?", 
            (vendor_id,)
        ).fetchone()['count']
        
        # Get recent documents
        recent_docs = conn.execute('''
            SELECT invoice_no, invoice_date, grand_total 
            FROM documents 
            WHERE vendor_id = ? 
            ORDER BY invoice_date DESC 
            LIMIT 5
        ''', (vendor_id,)).fetchall()
        
        result['recent_documents'] = [dict(doc) for doc in recent_docs]
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: int, updates: dict):
    """Update vendor details"""
    conn = get_db_connection()
    try:
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        set_clause = ", ".join([f"{key} = ?" for key in updates.keys()])
        query = f"UPDATE vendors SET {set_clause} WHERE id = ?"
        
        cursor = conn.cursor()
        cursor.execute(query, list(updates.values()) + [vendor_id])
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vendor not found")
        
        print(f"✅ Vendor updated: ID {vendor_id}")
        return {"status": "success", "message": "Vendor updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

def update_vendor_usage(vendor_id: int, conn):
    """Helper function to update vendor frequency counter"""
    try:
        conn.execute('''
            UPDATE vendors 
            SET frequency_count = frequency_count + 1, 
                last_used_date = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (vendor_id,))
        conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to update vendor usage: {e}")

def get_or_create_vendor(vendor_name: str, conn) -> int:
    """Get existing vendor ID or create new one"""
    try:
        # Try to find existing vendor
        vendor = conn.execute(
            "SELECT id FROM vendors WHERE LOWER(vendor_name) = LOWER(?)",
            (vendor_name,)
        ).fetchone()
        
        if vendor:
            vendor_id = vendor['id']
            update_vendor_usage(vendor_id, conn)
            return vendor_id
        
        # Create new vendor
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vendors (vendor_name, frequency_count) VALUES (?, 1)",
            (vendor_name,)
        )
        conn.commit()
        print(f"✅ Auto-created vendor: {vendor_name}")
        return cursor.lastrowid
    except Exception as e:
        print(f"❌ Error in get_or_create_vendor: {e}")
        return None

print("✅ Vendor Master System loaded!")
print("🏪 Vendor endpoints:")
print("   GET  /vendors")
print("   GET  /vendors/autocomplete?q=search")
print("   GET  /vendors/{id}")
print("   POST /vendors")
print("   PUT  /vendors/{id}")


# ============================================================================
# REVIEW & APPROVAL WORKFLOW
# ============================================================================

@app.get("/documents/pending-review")
async def get_pending_documents(client_id: int = None):
    """Get all documents pending review"""
    conn = get_db_connection()
    try:
        query = '''
            SELECT d.*, c.company_name as client_name, v.vendor_name as vendor_full_name
            FROM documents d
            LEFT JOIN clients c ON d.client_id = c.id
            LEFT JOIN vendors v ON d.vendor_id = v.id
            WHERE d.review_status IN ('pending', 'needs_review')
        '''
        params = []
        
        if client_id:
            query += " AND d.client_id = ?"
            params.append(client_id)
        
        query += " ORDER BY d.confidence_level ASC, d.entered_date DESC"
        
        documents = conn.execute(query, params).fetchall()
        results = []
        
        for row in documents:
            doc = dict(row)
            # Parse json_data
            if doc.get('json_data'):
                try:
                    json_data = json.loads(doc['json_data'])
                    doc.update(json_data)
                except:
                    pass
            results.append(doc)
        
        return results
    except Exception as e:
        print(f"❌ Error fetching pending documents: {e}")
        return []
    finally:
        conn.close()

@app.put("/documents/{doc_id}/review")
async def review_document(doc_id: int, action: str, reviewed_by: str = None, notes: str = None):
    """
    Review and approve/reject document
    Actions: approve, reject, request_clarification
    """
    conn = get_db_connection()
    try:
        if action not in ['approve', 'reject', 'request_clarification']:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        status_map = {
            'approve': 'approved',
            'reject': 'rejected',
            'request_clarification': 'needs_clarification'
        }
        
        new_status = status_map[action]
        
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE documents 
            SET review_status = ?, 
                reviewed_by = ?, 
                reviewed_date = CURRENT_TIMESTAMP,
                internal_notes = COALESCE(internal_notes || ' | ', '') || ?
            WHERE id = ?
        ''', (new_status, reviewed_by, notes or f"Action: {action}", doc_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        print(f"✅ Document {doc_id} {action}ed by {reviewed_by}")
        return {"status": "success", "action": action, "new_status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error reviewing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/documents/{doc_id}/add-note")
async def add_document_note(doc_id: int, note: str, added_by: str = None):
    """Add internal note to document"""
    conn = get_db_connection()
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        note_with_meta = f"[{timestamp} - {added_by or 'Unknown'}] {note}"
        
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE documents 
            SET internal_notes = COALESCE(internal_notes || '\n', '') || ?
            WHERE id = ?
        ''', (note_with_meta, doc_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        print(f"✅ Note added to document {doc_id}")
        return {"status": "success", "message": "Note added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error adding note: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/documents/stats")
async def get_document_stats(client_id: int = None):
    """Get document statistics and counts"""
    conn = get_db_connection()
    try:
        base_query = "SELECT COUNT(*) as count FROM documents WHERE 1=1"
        params = []
        
        if client_id:
            base_query += " AND client_id = ?"
            params.append(client_id)
        
        total = conn.execute(base_query, params).fetchone()['count']
        
        pending_query = base_query + " AND review_status = 'pending'"
        pending = conn.execute(pending_query, params).fetchone()['count']
        
        needs_review_query = base_query + " AND review_status = 'needs_review'"
        needs_review = conn.execute(needs_review_query, params).fetchone()['count']
        
        approved_query = base_query + " AND review_status = 'approved'"
        approved = conn.execute(approved_query, params).fetchone()['count']
        
        # Document type breakdown
        doc_types = conn.execute('''
            SELECT doc_type, COUNT(*) as count 
            FROM documents 
            WHERE 1=1 {}
            GROUP BY doc_type
        '''.format("AND client_id = ?" if client_id else ""), params).fetchall()
        
        return {
            "total": total,
            "pending": pending,
            "needs_review": needs_review,
            "approved": approved,
            "rejected": total - pending - needs_review - approved,
            "by_type": {row['doc_type']: row['count'] for row in doc_types}
        }
    except Exception as e:
        print(f"❌ Error fetching stats: {e}")
        return {}
    finally:
        conn.close()

print("✅ Review & Approval Workflow loaded!")
print("📝 Review endpoints:")
print("   GET  /documents/pending-review")
print("   PUT  /documents/{id}/review")
print("   PUT  /documents/{id}/add-note")
print("   GET  /documents/stats")


# ============================================================================
# UNASSIGNED DOCUMENTS (TRIAGE AREA) - "INBOX" CONCEPT
# ============================================================================

@app.get("/documents/unassigned")
async def get_unassigned_documents():
    """
    Get all documents without a client assigned - The 'Inbox' for old/messy files
    This keeps clean client folders 100% clean
    """
    conn = get_db_connection()
    try:
        # From documents table
        docs = conn.execute('''
            SELECT d.*, 'document' as source_table
            FROM documents d
            WHERE d.client_id IS NULL
            ORDER BY d.entered_date DESC
        ''').fetchall()
        
        # From legacy invoices table
        invoices = conn.execute('''
            SELECT i.*, 'invoice' as source_table
            FROM invoices i
            WHERE i.client_id IS NULL
            ORDER BY i.upload_date DESC
        ''').fetchall()
        
        results = []
        
        for row in docs:
            doc = dict(row)
            if doc.get('json_data'):
                try:
                    json_data = json.loads(doc['json_data'])
                    doc.update(json_data)
                except:
                    pass
            results.append(doc)
        
        for row in invoices:
            doc = dict(row)
            doc['source_table'] = 'invoice'
            if doc.get('json_data'):
                try:
                    json_data = json.loads(doc['json_data'])
                    doc.update(json_data)
                except:
                    pass
            results.append(doc)
        
        print(f"📥 Triage Area: {len(results)} unassigned documents")
        return results
    except Exception as e:
        print(f"❌ Error fetching unassigned: {e}")
        return []
    finally:
        conn.close()

@app.put("/documents/{doc_id}/assign")
async def assign_document_to_client(doc_id: int, client_id: int, source_table: str = "invoice"):
    """
    Assign a single document to a client
    source_table: 'invoice' or 'document' depending on which table it's from
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        if source_table == "document":
            cursor.execute("UPDATE documents SET client_id = ? WHERE id = ?", (client_id, doc_id))
        else:  # invoice (legacy table)
            cursor.execute("UPDATE invoices SET client_id = ? WHERE id = ?", (client_id, doc_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update client's last activity
        cursor.execute("UPDATE clients SET last_activity_date = CURRENT_TIMESTAMP WHERE id = ?", (client_id,))
        conn.commit()
        
        print(f"✅ Document {doc_id} assigned to client {client_id}")
        return {"status": "success", "message": f"Document assigned to client {client_id}"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error assigning document: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.put("/documents/bulk-assign")
async def bulk_assign_documents(doc_ids: list, client_id: int):
    """
    Assign multiple documents to a client at once
    Format: {"doc_ids": [{"id": 1, "source": "invoice"}, {"id": 5, "source": "document"}], "client_id": 3}
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        assigned_count = 0
        
        for doc in doc_ids:
            doc_id = doc.get('id')
            source = doc.get('source', 'invoice')
            
            if source == "document":
                cursor.execute("UPDATE documents SET client_id = ? WHERE id = ?", (client_id, doc_id))
            else:
                cursor.execute("UPDATE invoices SET client_id = ? WHERE id = ?", (client_id, doc_id))
            
            if cursor.rowcount > 0:
                assigned_count += 1
        
        conn.commit()
        
        # Update client's last activity
        cursor.execute("UPDATE clients SET last_activity_date = CURRENT_TIMESTAMP WHERE id = ?", (client_id,))
        conn.commit()
        
        print(f"✅ Bulk assigned {assigned_count} documents to client {client_id}")
        return {"status": "success", "assigned_count": assigned_count, "client_id": client_id}
    except Exception as e:
        print(f"❌ Error in bulk assign: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/triage/stats")
async def get_triage_stats():
    """Get statistics for Triage Area (Unassigned Documents)"""
    conn = get_db_connection()
    try:
        # Count unassigned documents
        docs_count = conn.execute("SELECT COUNT(*) as count FROM documents WHERE client_id IS NULL").fetchone()['count']
        invoices_count = conn.execute("SELECT COUNT(*) as count FROM invoices WHERE client_id IS NULL").fetchone()['count']
        
        # Get age breakdown
        today_count = conn.execute('''
            SELECT COUNT(*) as count FROM invoices 
            WHERE client_id IS NULL AND DATE(upload_date) = DATE('now')
        ''').fetchone()['count']
        
        week_count = conn.execute('''
            SELECT COUNT(*) as count FROM invoices 
            WHERE client_id IS NULL AND DATE(upload_date) >= DATE('now', '-7 days')
        ''').fetchone()['count']
        
        old_count = conn.execute('''
            SELECT COUNT(*) as count FROM invoices 
            WHERE client_id IS NULL AND DATE(upload_date) < DATE('now', '-7 days')
        ''').fetchone()['count']
        
        return {
            "total_unassigned": docs_count + invoices_count,
            "from_documents_table": docs_count,
            "from_invoices_table": invoices_count,
            "uploaded_today": today_count,
            "uploaded_this_week": week_count,
            "older_than_week": old_count,
            "message": f"📥 {docs_count + invoices_count} documents waiting in Triage Area"
        }
    except Exception as e:
        print(f"❌ Error fetching triage stats: {e}")
        return {"total_unassigned": 0}
    finally:
        conn.close()

print("✅ Triage Area (Unassigned Documents) loaded!")
print("📥 Triage endpoints:")
print("   GET  /documents/unassigned")
print("   PUT  /documents/{id}/assign")
print("   PUT  /documents/bulk-assign")
print("   GET  /triage/stats")


# ============================================================================
# HSN, LEDGER, AND GROUP INTELLIGENCE SYSTEM
# ============================================================================

# Common HSN codes database for smart detection
HSN_CODES_DB = {
    # Services
    "995431": {"description": "Accounting Services", "group": "Services", "ledger": "Professional Fees"},
    "998314": {"description": "Legal Services", "group": "Services", "ledger": "Legal Charges"},
    "998313": {"description": "Consultancy Services", "group": "Services", "ledger": "Consultancy Fees"},
    
    # Goods - Common items
    "8471": {"description": "Computers/Laptops", "group": "Fixed Assets", "ledger": "Computer Equipment"},
    "8443": {"description": "Printers", "group": "Fixed Assets", "ledger": "Office Equipment"},
    "8517": {"description": "Mobile Phones", "group": "Fixed Assets", "ledger": "Electronics"},
    "8716": {"description": "Vehicles/Trailers", "group": "Fixed Assets", "ledger": "Vehicles"},
    "2710": {"description": "Petroleum Products/Diesel", "group": "Direct Expenses", "ledger": "Fuel & Transport"},
    "2711": {"description": "LPG/Gas", "group": "Direct Expenses", "ledger": "Gas"},
    "8544": {"description": "Electric Cables", "group": "Raw Materials", "ledger": "Electrical Items"},
    "7326": {"description": "Iron/Steel Articles", "group": "Raw Materials", "ledger": "Steel Items"},
    "3926": {"description": "Plastic Articles", "group": "Raw Materials", "ledger": "Plastic Items"},
    "4819": {"description": "Paper/Cartons", "group": "Packing Materials", "ledger": "Packing Materials"},
    "8708": {"description": "Vehicle Parts", "group": "Spare Parts", "ledger": "Auto Parts"},
    "9403": {"description": "Furniture", "group": "Fixed Assets", "ledger": "Furniture & Fixtures"},
    "8481": {"description": "Valves/Taps", "group": "Raw Materials", "ledger": "Plumbing Items"},
    "8536": {"description": "Electrical Switches", "group": "Raw Materials", "ledger": "Electrical Fittings"},
    "2523": {"description": "Cement", "group": "Raw Materials", "ledger": "Construction Material"},
    "7308": {"description": "Steel Structures", "group": "Raw Materials", "ledger": "Steel Structures"},
}

# Ledger mapping based on keywords
LEDGER_MAPPING = {
    "diesel": "Fuel & Transport",
    "petrol": "Fuel & Transport",
    "fuel": "Fuel & Transport",
    "transport": "Transport Charges",
    "freight": "Freight Inward",
    "courier": "Courier Charges",
    "stationery": "Stationery",
    "office": "Office Expenses",
    "telephone": "Telephone Expenses",
    "internet": "Internet Charges",
    "electricity": "Electricity Charges",
    "rent": "Rent",
    "salary": "Salaries",
    "wage": "Wages",
    "repair": "Repair & Maintenance",
    "maintenance": "Repair & Maintenance",
    "insurance": "Insurance",
    "advertisement": "Advertisement",
    "printing": "Printing & Stationery",
    "legal": "Legal Charges",
    "audit": "Audit Fees",
    "computer": "Computer Equipment",
    "software": "Software",
    "furniture": "Furniture & Fixtures",
}

# Group mapping
GROUP_MAPPING = {
    "service": "Services",
    "consultancy": "Services",
    "professional": "Services",
    "diesel": "Direct Expenses",
    "fuel": "Direct Expenses",
    "transport": "Direct Expenses",
    "salary": "Direct Expenses",
    "wage": "Direct Expenses",
    "computer": "Fixed Assets",
    "furniture": "Fixed Assets",
    "vehicle": "Fixed Assets",
    "building": "Fixed Assets",
    "machinery": "Fixed Assets",
    "raw": "Raw Materials",
    "material": "Raw Materials",
    "steel": "Raw Materials",
    "iron": "Raw Materials",
    "cement": "Raw Materials",
    "packing": "Packing Materials",
    "carton": "Packing Materials",
    "box": "Packing Materials",
}

def detect_hsn_ledger_group(invoice_data: dict) -> dict:
    """
    AI-powered detection of HSN, Ledger, and Group from invoice data
    Uses multiple intelligence sources:
    1. Direct extraction from invoice
    2. HSN code database lookup
    3. Keyword-based inference
    4. Gemini AI smart guessing
    """
    
    vendor_name = invoice_data.get('vendor_name', '').lower()
    party_name = invoice_data.get('party_name', '').lower()
    description = f"{vendor_name} {party_name}".lower()
    
    # Try to get from invoice data
    hsn_code = invoice_data.get('hsn_code', '')
    ledger_name = invoice_data.get('ledger_name', '')
    group_name = invoice_data.get('group_name', '')
    
    # If HSN code is found, look it up in database
    if hsn_code and hsn_code in HSN_CODES_DB:
        hsn_info = HSN_CODES_DB[hsn_code]
        if not ledger_name:
            ledger_name = hsn_info['ledger']
        if not group_name:
            group_name = hsn_info['group']
    
    # If still missing, try keyword detection
    if not ledger_name:
        for keyword, ledger in LEDGER_MAPPING.items():
            if keyword in description:
                ledger_name = ledger
                break
    
    if not group_name:
        for keyword, group in GROUP_MAPPING.items():
            if keyword in description:
                group_name = group
                break
    
    # If HSN is missing, try to infer from ledger
    if not hsn_code and ledger_name:
        for code, info in HSN_CODES_DB.items():
            if info['ledger'] == ledger_name:
                hsn_code = code
                break
    
    # Use Gemini AI for smart guessing if still missing
    if not hsn_code or not ledger_name or not group_name:
        ai_suggestions = gemini_smart_classify(vendor_name, party_name, description)
        if not hsn_code:
            hsn_code = ai_suggestions.get('hsn_code', '999999')  # Default: Unclassified
        if not ledger_name:
            ledger_name = ai_suggestions.get('ledger', 'Sundry Expenses')
        if not group_name:
            group_name = ai_suggestions.get('group', 'Indirect Expenses')
    
    # Default fallbacks
    if not hsn_code:
        hsn_code = '999999'  # Unclassified
    if not ledger_name:
        ledger_name = 'Sundry Expenses'
    if not group_name:
        group_name = 'Indirect Expenses'
    
    return {
        'hsn_code': hsn_code,
        'ledger_name': ledger_name,
        'group_name': group_name,
        'ai_confidence': 'high' if hsn_code in HSN_CODES_DB else 'medium' if hsn_code != '999999' else 'low'
    }

def gemini_smart_classify(vendor_name: str, party_name: str, description: str) -> dict:
    """
    Use Gemini AI to intelligently classify the invoice
    when HSN/Ledger/Group cannot be determined from rules
    """
    try:
        prompt = f"""Analyze this business transaction and suggest:

Vendor: {vendor_name}
Party: {party_name}
Description: {description}

Provide:
1. Most appropriate HSN/SAC code (Indian GST)
2. Ledger name (accounting head like "Fuel & Transport", "Office Expenses", etc.)
3. Group name (like "Direct Expenses", "Fixed Assets", "Services", etc.)

Common HSN codes:
- 2710: Diesel/Petroleum
- 8471: Computers
- 995431: Accounting Services
- 998314: Legal Services
- 8708: Vehicle Parts
- 9403: Furniture

Return ONLY JSON format:
{{
  "hsn_code": "8471",
  "ledger": "Computer Equipment",
  "group": "Fixed Assets",
  "reasoning": "Brief explanation"
}}"""

        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(prompt)
        
        # Extract JSON from response
        import json
        import re
        
        text = response.text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            return {}
    
    except Exception as e:
        print(f"⚠️ Gemini classification failed: {e}")
        return {}

print("✅ HSN, Ledger, and Group Intelligence System loaded!")
print(f"📚 Loaded {len(HSN_CODES_DB)} common HSN codes")
print(f"🏷️ Loaded {len(LEDGER_MAPPING)} ledger mappings")
print(f"📁 Loaded {len(GROUP_MAPPING)} group mappings")

# --- NEW: LEGAL/NOTICES AI DRAFTER ---
@app.post("/legal/analyze-notice")
async def analyze_notice(file: UploadFile = File(...)):
    print(f"⚖️ Analyzing Legal Notice: {file.filename}")
    
    try:
        content = await file.read()
        extracted_text = ""
        
        # 1. Extract Text from PDF
        if file.filename.lower().endswith('.pdf'):
            try:
                pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                for page in pdf_reader.pages:
                    extracted_text += page.extract_text() + "\n"
            except Exception as e:
                print(f"❌ PDF extraction failed: {e}")
                extracted_text = "Could not extract text from PDF. Analyze based on file type."
        else:
            # TODO: Add OCR for images later
            extracted_text = "Image file uploaded. Please upload PDF for full text analysis."

        # 2. Analyze with Gemini
        prompt = f"""
        You are an Expert GST Legal Consultant (Tax.AI).
        Analyze this government GST notice text and draft a legal reply.
        
        Notice Text:
        {extracted_text[:10000]}  # Limit context window
        
        Task:
        1. Identify the Notice Type (e.g., ASMT-10, DRC-01, SCN Section 73/74).
        2. Summarize the Demand/Allegation concisely (2 lines).
        3. Draft a Polite, Professional, and Legally Sound Reply.
           - Cite relevant GST Sections (Section 16, 17(5), etc.).
           - Ask for 30 days time if details are vague.
           - Offer to submit GSTR-1/3B reconciliation.
        
        Output format (JSON):
        {{
            "notice_type": "...",
            "summary": "...",
            "suggested_reply": "To The Proper Officer, ... (full draft)"
        }}
        """
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        ai_response = response.text.replace("```json", "").replace("```", "").strip()
        
        result = json.loads(ai_response)
        return result
        
    except Exception as e:
        print(f"❌ Notice Analysis Error: {e}")
        return {
            "extract_error": str(e),
            "notice_type": "Unknown Notice",
            "summary": "Could not analyze file automatically.",
            "suggested_reply": "To The Proper Officer,\n\nRef: Notice dated " + datetime.now().strftime("%d-%m-%Y") + "\n\nSub: Reply to Notice\n\nRespected Sir/Madam,\n\nWe are in receipt of the subject notice. We are currently verifying our records and request 15 days time to submit a detailed reply.\n\nYours Faithfully,\nAuthorized Signatory"
        }
