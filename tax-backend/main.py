# backend/main.py
# -----------------------------------------------------------------------------
# TAX.AI ENTERPRISE BACKEND - JARVIS EDITION 3.0
# Multi-Model Architecture: Qwen2.5-VL (OCR) + Hermes 3 (Logic) + Llama 3.1 (Chat)
# -----------------------------------------------------------------------------

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
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

# --- MULTI-MODEL AI CONFIGURATION ---
from ai_config import (
    call_vision_model,       # Qwen2.5-VL for OCR
    call_logic_model,        # Hermes 3 405B for reasoning
    call_chat_model,         # Llama 3.1 405B for chat
    clean_json_response,
    encode_image_to_base64
)

# Legacy flag - some code may check this
GEN_AI_AVAILABLE = True

# =============================================================================
# GST REFERENCE DATABASE - For Post-Extraction Validation
# =============================================================================

# Comprehensive HSN Codes with GST Rates (Updated 2025-26)
HSN_RATES_DB = {
    # Food & Agriculture (Chapter 1-24)
    "0401": {"desc": "Milk & Cream", "rate": 0, "category": "Food"},
    "0402": {"desc": "Milk Products", "rate": 5, "category": "Food"},
    "1001": {"desc": "Wheat", "rate": 0, "category": "Food"},
    "1006": {"desc": "Rice", "rate": 5, "category": "Food"},
    "1701": {"desc": "Sugar", "rate": 5, "category": "Food"},
    "1905": {"desc": "Bread/Bakery", "rate": 5, "category": "Food"},
    
    # Textiles (Chapter 50-63)
    "5208": {"desc": "Cotton Fabric", "rate": 5, "category": "Textile"},
    "5407": {"desc": "Synthetic Fabric", "rate": 5, "category": "Textile"},
    "6109": {"desc": "T-Shirts", "rate": 5, "category": "Apparel"},
    "6203": {"desc": "Men's Suits", "rate": 12, "category": "Apparel"},
    "6204": {"desc": "Women's Suits", "rate": 12, "category": "Apparel"},
    "7113": {"desc": "Jewellery", "rate": 3, "category": "Luxury"},
    
    # Petroleum (Chapter 27)
    "2709": {"desc": "Crude Oil", "rate": 5, "category": "Fuel"},
    "2710": {"desc": "Diesel/Petrol", "rate": 18, "category": "Fuel"},
    "2711": {"desc": "LPG/CNG", "rate": 5, "category": "Fuel"},
    
    # Chemicals & Pharma (Chapter 28-38)
    "3004": {"desc": "Medicines", "rate": 12, "category": "Pharma"},
    "3006": {"desc": "Medical Devices", "rate": 12, "category": "Pharma"},
    "3304": {"desc": "Cosmetics", "rate": 28, "category": "Luxury"},
    "3401": {"desc": "Soap", "rate": 18, "category": "FMCG"},
    "3402": {"desc": "Detergents", "rate": 18, "category": "FMCG"},
    
    # Plastics & Rubber (Chapter 39-40)
    "3923": {"desc": "Plastic Containers", "rate": 18, "category": "Raw Material"},
    "3926": {"desc": "Plastic Articles", "rate": 18, "category": "Raw Material"},
    "4011": {"desc": "Tyres", "rate": 28, "category": "Automobile"},
    
    # Paper & Print (Chapter 48-49)
    "4802": {"desc": "Paper", "rate": 12, "category": "Stationery"},
    "4819": {"desc": "Cartons/Boxes", "rate": 18, "category": "Packing"},
    "4820": {"desc": "Notebooks/Registers", "rate": 12, "category": "Stationery"},
    "4901": {"desc": "Printed Books", "rate": 0, "category": "Education"},
    
    # Iron & Steel (Chapter 72-73)
    "7210": {"desc": "Coated Steel", "rate": 18, "category": "Raw Material"},
    "7308": {"desc": "Steel Structures", "rate": 18, "category": "Construction"},
    "7318": {"desc": "Screws/Bolts", "rate": 18, "category": "Hardware"},
    "7326": {"desc": "Steel Articles", "rate": 18, "category": "Raw Material"},
    
    # Machinery (Chapter 84)
    "8414": {"desc": "Air Pumps/Compressors", "rate": 18, "category": "Machinery"},
    "8418": {"desc": "Refrigerators/AC", "rate": 18, "category": "Appliance"},
    "8443": {"desc": "Printers/Copiers", "rate": 18, "category": "IT Equipment"},
    "8471": {"desc": "Computers/Laptops", "rate": 18, "category": "IT Equipment"},
    "8473": {"desc": "Computer Parts", "rate": 18, "category": "IT Equipment"},
    "8481": {"desc": "Valves/Taps", "rate": 18, "category": "Plumbing"},
    "8504": {"desc": "Transformers/UPS", "rate": 18, "category": "Electrical"},
    
    # Electrical (Chapter 85)
    "8507": {"desc": "Batteries", "rate": 28, "category": "Electrical"},
    "8517": {"desc": "Mobile Phones", "rate": 18, "category": "Electronics"},
    "8528": {"desc": "TV/Monitors", "rate": 18, "category": "Electronics"},
    "8536": {"desc": "Electrical Switches", "rate": 18, "category": "Electrical"},
    "8544": {"desc": "Electric Cables", "rate": 18, "category": "Electrical"},
    
    # Vehicles (Chapter 87)
    "8703": {"desc": "Motor Cars", "rate": 28, "category": "Automobile"},
    "8704": {"desc": "Commercial Vehicles", "rate": 28, "category": "Automobile"},
    "8708": {"desc": "Vehicle Parts", "rate": 28, "category": "Automobile"},
    "8711": {"desc": "Motorcycles", "rate": 28, "category": "Automobile"},
    "8716": {"desc": "Trailers", "rate": 18, "category": "Automobile"},
    
    # Furniture (Chapter 94)
    "9401": {"desc": "Chairs/Seats", "rate": 18, "category": "Furniture"},
    "9403": {"desc": "Furniture", "rate": 18, "category": "Furniture"},
    "9404": {"desc": "Mattresses", "rate": 18, "category": "Furniture"},
    "9405": {"desc": "Lamps/Lights", "rate": 18, "category": "Electrical"},
    
    # Services (Chapter 99)
    "995411": {"desc": "Legal Services", "rate": 18, "category": "Professional"},
    "995421": {"desc": "CA/Accounting", "rate": 18, "category": "Professional"},
    "995431": {"desc": "Consultancy", "rate": 18, "category": "Professional"},
    "9954": {"desc": "Construction", "rate": 18, "category": "Construction"},
    "9964": {"desc": "Telecom Services", "rate": 18, "category": "Telecom"},
    "9965": {"desc": "Transport Services", "rate": 18, "category": "Transport"},
    "9966": {"desc": "Rental Services", "rate": 18, "category": "Rental"},
    "9971": {"desc": "Banking/Finance", "rate": 18, "category": "Finance"},
    "9973": {"desc": "Leasing Services", "rate": 18, "category": "Finance"},
    "9982": {"desc": "Legal Services", "rate": 18, "category": "Professional"},
    "9983": {"desc": "Professional Services", "rate": 18, "category": "Professional"},
    "9985": {"desc": "Support Services", "rate": 18, "category": "Services"},
    "9987": {"desc": "Maintenance/Repair", "rate": 18, "category": "Services"},
    "9988": {"desc": "Manufacturing Services", "rate": 18, "category": "Manufacturing"},
    "9991": {"desc": "Government Services", "rate": 0, "category": "Government"},
    "9992": {"desc": "Education", "rate": 0, "category": "Education"},
    "9993": {"desc": "Healthcare", "rate": 0, "category": "Healthcare"},
    "9995": {"desc": "Entertainment", "rate": 28, "category": "Entertainment"},
    "9996": {"desc": "Recreation/Sports", "rate": 18, "category": "Sports"},
    "9997": {"desc": "Other Services", "rate": 18, "category": "Services"},
    "998314": {"desc": "Legal Advisory", "rate": 18, "category": "Professional"},
    "998313": {"desc": "Consultancy", "rate": 18, "category": "Professional"},
    "999999": {"desc": "Unclassified", "rate": 18, "category": "Other"},
}

# Indian State Codes for GSTIN Validation (First 2 digits)
STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman & Nicobar", "36": "Telangana", "37": "Andhra Pradesh",
    "38": "Ladakh", "97": "Other Territory"
}

# Valid GST Tax Slabs
GST_SLABS = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28]

def validate_extracted_data(data: dict) -> dict:
    """
    Post-extraction validation using reference databases.
    Validates and enriches: HSN, GST Rate, GSTIN, Ledger, Group, State
    Returns validated data with 'validation_notes' field.
    """
    notes = []
    
    # 1. Validate and enrich HSN Code
    hsn = str(data.get('hsn_code', '')).strip()
    if hsn:
        # Try exact match first
        if hsn in HSN_RATES_DB:
            hsn_info = HSN_RATES_DB[hsn]
            data['hsn_validated'] = True
            data['hsn_description'] = hsn_info['desc']
            expected_rate = hsn_info['rate']
            
            # Check if tax rate matches expected
            actual_rate = data.get('tax_rate', 0)
            if actual_rate and abs(actual_rate - expected_rate) > 1:
                notes.append(f"⚠️ Tax rate {actual_rate}% doesn't match HSN {hsn} expected {expected_rate}%")
            
            # Auto-set ledger if not set
            if not data.get('ledger_name') or data.get('ledger_name') == 'Unknown':
                data['ledger_name'] = hsn_info.get('desc', 'Purchase A/c')
            if not data.get('group_name') or data.get('group_name') == 'Suspense Account':
                data['group_name'] = hsn_info.get('category', 'Purchase Accounts')
        else:
            # Try partial match (first 4 digits)
            hsn_4 = hsn[:4]
            if hsn_4 in HSN_RATES_DB:
                hsn_info = HSN_RATES_DB[hsn_4]
                data['hsn_validated'] = True
                data['hsn_description'] = hsn_info['desc']
                notes.append(f"ℹ️ HSN matched to {hsn_4}: {hsn_info['desc']}")
            else:
                data['hsn_validated'] = False
                notes.append(f"⚠️ HSN {hsn} not found in database")
    
    # 2. Validate GSTIN format and state code
    gstin = str(data.get('gst_no', '')).strip().upper()
    if gstin and len(gstin) >= 2:
        state_code = gstin[:2]
        if state_code in STATE_CODES:
            data['vendor_state'] = STATE_CODES[state_code]
            data['gstin_state_valid'] = True
        else:
            data['gstin_state_valid'] = False
            notes.append(f"⚠️ Invalid state code in GSTIN: {state_code}")
    
    # 3. Validate tax rate is a valid GST slab
    tax_rate = data.get('tax_rate', 0)
    if tax_rate and tax_rate not in GST_SLABS:
        # Find nearest valid slab
        nearest = min(GST_SLABS, key=lambda x: abs(x - tax_rate))
        if abs(nearest - tax_rate) <= 1:
            data['tax_rate'] = nearest
            notes.append(f"ℹ️ Tax rate adjusted from {tax_rate}% to {nearest}%")
        else:
            notes.append(f"⚠️ Unusual tax rate: {tax_rate}% (valid slabs: 0, 5, 12, 18, 28)")
    
    # 4. Standardize date format
    date_str = data.get('invoice_date', '')
    if date_str:
        try:
            from datetime import datetime
            import re
            # Try various formats
            for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d.%m.%Y', '%m/%d/%Y']:
                try:
                    parsed = datetime.strptime(str(date_str).strip(), fmt)
                    data['invoice_date'] = parsed.strftime('%Y-%m-%d')
                    break
                except:
                    continue
        except:
            pass
    
    # 5. Add validation summary
    data['validation_notes'] = notes
    data['validation_count'] = len(notes)
    
    print(f"✅ Validation complete: {len(notes)} notes")
    return data

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
    """
    Validate and fix invoice calculations.
    Handles shipping charges, adjustments, and ensures 2 decimal precision.
    """
    try:
        # Ensure all amounts are floats with 2 decimal precision
        taxable = round(safe_float(data.get('taxable_value')), 2)
        igst = round(safe_float(data.get('igst_amount')), 2)
        cgst = round(safe_float(data.get('cgst_amount')), 2)
        sgst = round(safe_float(data.get('sgst_amount')), 2)
        cess = round(safe_float(data.get('cess_amount')), 2)
        grand_total = round(safe_float(data.get('grand_total')), 2)
        rate = safe_float(data.get('tax_rate'))
        
        # Store back with 2 decimal precision
        data['taxable_value'] = taxable
        data['igst_amount'] = igst
        data['cgst_amount'] = cgst
        data['sgst_amount'] = sgst
        data['cess_amount'] = cess
        data['grand_total'] = grand_total

        # If taxable is 0 but we have total, work backwards
        if taxable == 0 and grand_total > 0 and rate > 0:
            taxable = round(grand_total / (1 + (rate/100)), 2)
            tax_amount = grand_total - taxable
            if data.get('place_of_supply') == 'Interstate' or igst > 0:
                igst = round(tax_amount, 2)
            else:
                cgst = round(tax_amount / 2, 2)
                sgst = round(tax_amount / 2, 2)
            data['taxable_value'] = taxable
            data['igst_amount'] = igst
            data['cgst_amount'] = cgst
            data['sgst_amount'] = sgst

        # Calculate total tax
        total_tax = round(igst + cgst + sgst, 2)
        data['total_tax'] = total_tax
        
        # Auto-detect tax rate from amounts
        if rate == 0 and taxable > 0 and total_tax > 0:
            calculated_rate = (total_tax / taxable) * 100
            for slab in [5.0, 12.0, 18.0, 28.0]:
                if abs(calculated_rate - slab) < 1.5:  # 1.5% tolerance
                    data['tax_rate'] = slab
                    break
            if data.get('tax_rate') == 0:
                data['tax_rate'] = round(calculated_rate, 1)

        # Set default ledger/group if not set
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

        # Math validation with 10% tolerance (to handle shipping, adjustments, discounts)
        calculated_total = round(taxable + total_tax + cess, 2)
        difference = abs(grand_total - calculated_total)
        tolerance_percent = (difference / grand_total * 100) if grand_total > 0 else 0
        
        if difference <= 1.0:
            # Perfect match (within ₹1 rounding error)
            data['math_status'] = "Correct"
        elif tolerance_percent <= 10:
            # Within 10% - likely has shipping/adjustments
            data['math_status'] = f"OK (+₹{difference:.0f} extra charges)"
        else:
            # Large discrepancy
            data['math_status'] = f"Error (Calc: ₹{calculated_total:.2f})"
        
        return data
    except Exception as e:
        print(f"⚠️ Calculation check error: {e}")
        data['math_status'] = "Check Error"
        return data

def extract_invoice_data(file_bytes, mime_type):
    """
    Extract invoice data using Qwen2.5-VL vision model.
    Model: qwen/qwen2.5-vl-32b-instruct (via OpenRouter)
    """
    prompt = """You are an expert OCR system for Indian GST Invoices.

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
7. vendor_state: State name derived from GSTIN first 2 digits (01=J&K, 02=HP, 03=Punjab, 04=Chandigarh, 05=Uttarakhand, 06=Haryana, 07=Delhi, 08=Rajasthan, 09=UP, 10=Bihar, 19=WB, 21=Odisha, 22=Chhattisgarh, 23=MP, 24=Gujarat, 27=Maharashtra, 29=Karnataka, 32=Kerala, 33=TamilNadu, 36=Telangana)
8. place_of_supply: State where goods are delivered (usually same as vendor state for local, or buyer state for interstate)
9. hsn_code: The HSN/SAC code (4-8 digit number, pick the first one if multiple)
10. tax_rate: GST rate as a NUMBER (5, 12, 18, or 28 - do NOT include % symbol)

TAX AMOUNTS (READ EXACT NUMBERS):
11. taxable_value: Amount BEFORE tax (look for "Taxable Value" or "Taxable Total")
12. cgst_amount: CGST amount (read exact number, or 0 if IGST present)
13. sgst_amount: SGST amount (read exact number, or 0 if IGST present)
14. igst_amount: IGST amount (0 if CGST/SGST present, non-zero for interstate)
15. cess_amount: Cess if any (usually 0)
16. grand_total: Final total amount (the largest number, usually labeled "Total Amount" or "Grand Total")

ACCOUNTING FIELDS:
17. ledger_name: "Purchase A/c" for goods, "General Expense" for services
18. group_name: "Purchase Accounts" for goods, "Indirect Expenses" for services

READ THE ACTUAL NUMBERS FROM THE IMAGE. Do not guess or estimate.
Tax rate MUST be a number (5, 12, 18, or 28), NOT a string with %.

Return ONLY a valid JSON object like this:
{"gst_no": "27ABCDE1234F1Z5", "invoice_no": "INV-001", "invoice_date": "2025-04-01", "vendor_name": "ABC Traders", "buyer_name": "XYZ Ltd", "buyer_gstin": "07XXXXX0000X1Z5", "vendor_state": "Maharashtra", "place_of_supply": "Maharashtra", "hsn_code": "8471", "tax_rate": 18, "taxable_value": 10000.00, "cgst_amount": 900.00, "sgst_amount": 900.00, "igst_amount": 0, "cess_amount": 0, "grand_total": 11800.00, "ledger_name": "Purchase A/c", "group_name": "Purchase Accounts"}"""

    
    for attempt in range(3):
        try:
            print(f"🔄 Sending to Qwen2.5-VL (OCR Model) - Attempt {attempt + 1}...")
            
            # Handle PDF files - convert to image first
            # Vision models don't support PDF, only images
            import base64
            
            if mime_type == 'application/pdf' or (isinstance(mime_type, str) and 'pdf' in mime_type.lower()):
                print("📄 PDF detected - converting to image...")
                try:
                    # Try using pdf2image (requires poppler)
                    from pdf2image import convert_from_bytes
                    images = convert_from_bytes(file_bytes, first_page=1, last_page=1, dpi=200)
                    if images:
                        # Convert PIL image to bytes
                        from io import BytesIO
                        img_buffer = BytesIO()
                        images[0].save(img_buffer, format='PNG')
                        file_bytes_to_use = img_buffer.getvalue()
                        mime_type_to_use = 'image/png'
                        print("✅ PDF converted to PNG successfully")
                    else:
                        raise ValueError("No images extracted from PDF")
                except ImportError:
                    # Fallback: try using pypdf to extract text instead
                    print("⚠️ pdf2image not available, trying pypdf text extraction...")
                    try:
                        from pypdf import PdfReader
                        from io import BytesIO
                        pdf = PdfReader(BytesIO(file_bytes))
                        if len(pdf.pages) > 0:
                            text = pdf.pages[0].extract_text()
                            if text and len(text.strip()) > 50:
                                # Create a simple text-based fallback response
                                print(f"📝 Extracted text: {text[:100]}...")
                                # Return fallback - let the AI classify based on text
                                return {"invoice_no": "EXTRACT_TEXT", "vendor_name": "PDF Text", "grand_total": 0, "raw_text": text}
                    except Exception as pdf_err:
                        print(f"⚠️ pypdf fallback failed: {pdf_err}")
                    # Last resort - return error
                    return {"invoice_no": "PDF_ERROR", "vendor_name": "Install pdf2image", "grand_total": 0, 
                            "error": "PDF processing requires pdf2image. Install with: pip install pdf2image"}
                except Exception as conv_err:
                    print(f"❌ PDF conversion error: {conv_err}")
                    return {"invoice_no": "PDF_ERROR", "vendor_name": "Conversion Failed", "grand_total": 0}
            else:
                file_bytes_to_use = file_bytes
                mime_type_to_use = mime_type
            
            # Convert bytes to base64
            b64_data = base64.b64encode(file_bytes_to_use).decode('utf-8')
            
            # Call Qwen2.5-VL vision model
            response = call_vision_model(b64_data, prompt, mime_type_to_use)

            
            # Clean and parse JSON response
            text = clean_json_response(response)
            data = json.loads(text)
            
            # Step 1: Validate GSTIN checksum
            gst_valid = validate_gstin_checksum(data.get('gst_no'))
            data['gst_status'] = "Verified" if gst_valid else "Invalid GST"
            
            # Step 2: Check and fix calculations (2 decimal precision)
            data = check_calculations(data)
            
            # Step 3: Validate against reference database (HSN, rates, state codes)
            data = validate_extracted_data(data)
            
            # Step 4: Enrich GST data (vendor_state, place_of_supply, gst_nature)
            data = enrich_gst_data(data)
            
            print(f"✅ Invoice extracted: {data.get('vendor_name', 'Unknown')}")
            return data


            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse error: {e}")
            if attempt < 2: time.sleep(2); continue
            return {"invoice_no": "ERROR", "vendor_name": "Parse Fail", "grand_total": 0}
        except Exception as e:
            print(f"❌ OCR Error: {e}")
            if attempt < 2: time.sleep(3); continue
            return {"invoice_no": "ERROR", "vendor_name": "AI Fail", "grand_total": 0}
    
    return {"invoice_no": "TIMEOUT", "vendor_name": "Model Busy", "grand_total": 0}


# ============================================================================
# GST DATA ENRICHMENT - Auto-populate missing GST fields
# ============================================================================

def enrich_gst_data(invoice_data: dict) -> dict:
    """
    Auto-populate GST fields from GSTIN and tax amounts.
    This ensures all Tally-required GST fields are present.
    """
    # 1. Derive vendor_state from GSTIN (first 2 digits = state code)
    gstin = invoice_data.get('gst_no', '') or ''
    if gstin and len(gstin) >= 2 and not invoice_data.get('vendor_state'):
        state_code = gstin[:2]
        vendor_state = get_state_from_code(state_code)
        if vendor_state:
            invoice_data['vendor_state'] = vendor_state
            print(f"📍 Derived vendor state from GSTIN: {vendor_state}")
    
    # 2. Default place_of_supply to vendor_state if not set
    if not invoice_data.get('place_of_supply'):
        invoice_data['place_of_supply'] = invoice_data.get('vendor_state', '')
    
    # 3. Determine GST nature (Interstate vs Intrastate)
    igst = safe_float(invoice_data.get('igst_amount', 0))
    cgst = safe_float(invoice_data.get('cgst_amount', 0))
    sgst = safe_float(invoice_data.get('sgst_amount', 0))
    
    if igst > 0 and cgst == 0 and sgst == 0:
        invoice_data['gst_nature'] = 'Interstate'
        invoice_data['gst_type'] = 'IGST'
    elif cgst > 0 or sgst > 0:
        invoice_data['gst_nature'] = 'Intrastate'
        invoice_data['gst_type'] = 'CGST+SGST'
    else:
        invoice_data['gst_nature'] = 'Purchase Taxable'  # Default
        invoice_data['gst_type'] = 'Unknown'
    
    # 4. Calculate/validate tax_rate if not present or invalid
    tax_rate = invoice_data.get('tax_rate')
    if not tax_rate or not isinstance(tax_rate, (int, float)):
        # Try to parse if it's a string like "18%"
        if isinstance(tax_rate, str):
            tax_rate = int(re.sub(r'[^\d]', '', tax_rate) or 18)
        else:
            tax_rate = determine_gst_rate(invoice_data)
        invoice_data['tax_rate'] = tax_rate
    
    # 5. Ensure tax_rate is integer
    if isinstance(invoice_data.get('tax_rate'), float):
        invoice_data['tax_rate'] = int(invoice_data['tax_rate'])
    
    # 6. Add GST transaction type for Tally
    if invoice_data.get('gst_nature') == 'Interstate':
        invoice_data['gst_transaction_type'] = 'Purchase Taxable - Interstate'
    else:
        invoice_data['gst_transaction_type'] = 'Purchase Taxable'
    
    print(f"🏷️ GST Data: {invoice_data.get('gst_type')} @ {invoice_data.get('tax_rate')}% | State: {invoice_data.get('vendor_state')} | Supply: {invoice_data.get('place_of_supply')}")
    
    return invoice_data

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
    Layer 3: Enhanced Fuzzy matching with abbreviation handling
    Returns: List of (vendor_id, vendor_name, similarity_score)
    
    SHERLOCK UPGRADE: Handles common abbreviations like:
    - "Rel. Petr." -> "Reliance Petroleum"
    - "HP" -> "Hindustan Petroleum"
    - "AWS" -> "Amazon Web Services"
    """
    if not name or len(name) < 2:
        return []
    
    # Common vendor abbreviation expansions
    ABBREVIATIONS = {
        'rel': 'reliance', 'petr': 'petroleum', 'pet': 'petroleum',
        'hp': 'hindustan petroleum', 'ioc': 'indian oil', 'bpcl': 'bharat petroleum',
        'aws': 'amazon web services', 'gcp': 'google cloud', 
        'msft': 'microsoft', 'amzn': 'amazon',
        'sbi': 'state bank of india', 'hdfc': 'hdfc bank',
        'icici': 'icici bank', 'axis': 'axis bank',
        'tcs': 'tata consultancy', 'infy': 'infosys',
        'ltd': 'limited', 'pvt': 'private', 'corp': 'corporation',
        'mfg': 'manufacturing', 'ind': 'industries', 'ent': 'enterprises',
        'tech': 'technologies', 'sol': 'solutions', 'sys': 'systems'
    }
    
    conn = get_db_connection()
    try:
        vendors = conn.execute("SELECT id, vendor_name, gstin FROM vendors").fetchall()
        matches = []
        
        # Clean and expand the input name
        name_lower = name.lower().strip()
        name_words = name_lower.replace('.', ' ').replace(',', ' ').split()
        
        # Expand abbreviations in input
        expanded_words = []
        for word in name_words:
            word_clean = word.strip()
            if word_clean in ABBREVIATIONS:
                expanded_words.append(ABBREVIATIONS[word_clean])
            else:
                expanded_words.append(word_clean)
        expanded_name = ' '.join(expanded_words)
        
        for vendor in vendors:
            vendor_name = vendor['vendor_name'] or ''
            vendor_lower = vendor_name.lower()
            
            # Method 1: Direct similarity
            direct_similarity = SequenceMatcher(None, name_lower, vendor_lower).ratio()
            
            # Method 2: Expanded similarity
            expanded_similarity = SequenceMatcher(None, expanded_name, vendor_lower).ratio()
            
            # Method 3: Word-level matching (for partial names)
            vendor_words = set(vendor_lower.replace('.', ' ').split())
            input_words = set(expanded_words)
            common_words = vendor_words & input_words
            word_match_score = len(common_words) / max(len(vendor_words), len(input_words), 1)
            
            # Take the best score
            best_similarity = max(direct_similarity, expanded_similarity, word_match_score * 0.9)
            
            if best_similarity >= threshold:
                # Determine match type for UI
                match_type = 'exact' if best_similarity > 0.95 else ('high' if best_similarity > 0.85 else 'partial')
                matches.append({
                    'vendor_id': vendor['id'],
                    'vendor_name': vendor['vendor_name'],
                    'score': round(best_similarity * 100, 1),
                    'gstin': vendor['gstin'],
                    'match_type': match_type
                })
        
        # Sort by score descending
        matches.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top 5 - convert to legacy format for compatibility
        legacy_matches = [(m['vendor_id'], m['vendor_name'], m['score']) for m in matches[:5]]
        return legacy_matches
        
    except Exception as e:
        print(f"⚠️ Fuzzy match error: {e}")
        return []
    finally:
        conn.close()

def get_vendor_suggestions_enhanced(name: str) -> dict:
    """
    Enhanced vendor suggestions with rich metadata for frontend UI
    """
    if not name or len(name) < 2:
        return {'suggestions': [], 'confidence': 'none', 'auto_correct': None}
    
    matches = find_similar_vendors(name, threshold=0.6)
    
    if not matches:
        return {'suggestions': [], 'confidence': 'none', 'auto_correct': None}
    
    best_score = matches[0][2]
    
    # Determine confidence and auto-correct behavior
    if best_score > 95:
        confidence = 'exact'
        auto_correct = {'id': matches[0][0], 'name': matches[0][1]}
    elif best_score > 85:
        confidence = 'high'
        auto_correct = {'id': matches[0][0], 'name': matches[0][1]}
    elif best_score > 70:
        confidence = 'medium'
        auto_correct = None  # Show suggestions, don't auto-correct
    else:
        confidence = 'low'
        auto_correct = None
    
    suggestions = [
        {'id': m[0], 'name': m[1], 'score': m[2]} 
        for m in matches[:3]
    ]
    
    return {
        'suggestions': suggestions,
        'confidence': confidence,
        'auto_correct': auto_correct,
        'original_name': name
    }

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
# AUTO-NARRATION WRITER - Generate Tally-style narrations
# ============================================================================

def generate_auto_narration(invoice_data: dict) -> dict:
    """
    Auto-generate professional Tally narrations based on invoice content.
    Format: "Being [expense type] from [vendor] vide Invoice No. [number]"
    """
    vendor = invoice_data.get('vendor_name', 'vendor')
    invoice_no = invoice_data.get('invoice_no', '')
    ledger = invoice_data.get('ledger_name', '')
    group = invoice_data.get('group_name', '')
    amount = invoice_data.get('grand_total', 0)
    date = invoice_data.get('invoice_date', '')
    items = invoice_data.get('line_items', [])
    
    # Determine expense type from ledger/group
    expense_type = 'purchase'
    if 'fuel' in ledger.lower() or 'petroleum' in vendor.lower():
        expense_type = 'purchase of fuel'
    elif 'office' in ledger.lower():
        expense_type = 'office expenses'
    elif 'repair' in ledger.lower() or 'maintenance' in ledger.lower():
        expense_type = 'repairs and maintenance'
    elif 'professional' in ledger.lower():
        expense_type = 'professional charges'
    elif 'rent' in ledger.lower():
        expense_type = 'rent payment'
    elif 'software' in ledger.lower() or 'computer' in items[0].get('description', '').lower() if items else False:
        expense_type = 'purchase of software/IT equipment'
    elif 'telephone' in ledger.lower() or 'mobile' in ledger.lower():
        expense_type = 'telephone and communication expenses'
    elif 'travel' in ledger.lower():
        expense_type = 'travelling expenses'
    elif 'purchase' in ledger.lower():
        expense_type = 'purchase of goods'
    
    # Check if it's for fixed assets (computer, furniture, etc.)
    if items:
        item_desc = ' '.join([i.get('description', '') for i in items]).lower()
        if any(word in item_desc for word in ['computer', 'laptop', 'monitor', 'printer', 'furniture', 'air conditioner', 'ac']):
            expense_type = 'purchase of fixed assets'
    
    # Build narration
    narration_parts = [f"Being {expense_type}"]
    
    if vendor and vendor != 'Cash Sales':
        narration_parts.append(f"from {vendor}")
    
    if invoice_no:
        narration_parts.append(f"vide Invoice No. {invoice_no}")
    
    if date:
        narration_parts.append(f"dated {date}")
    
    narration = ' '.join(narration_parts)
    invoice_data['narration'] = narration
    
    return invoice_data

# ============================================================================
# ITC SAFE-GUARD - Compliance check for Input Tax Credit
# ============================================================================

def check_itc_eligibility(invoice_data: dict, doc_type: str) -> dict:
    """
    Check if Input Tax Credit (ITC) can be claimed on this document.
    Sets claim_itc = False and adds itc_warning for non-eligible documents.
    
    ITC cannot be claimed on:
    - Personal expenses
    - Food and beverages (restaurants, canteen)
    - Motor vehicle expenses (except if used for transportation business)
    - Staff welfare
    - Petrol slips without proper invoice
    """
    # Default: ITC can be claimed
    invoice_data['claim_itc'] = True
    invoice_data['itc_warning'] = None
    
    # Check document type
    non_itc_doc_types = ['receipt', 'personal', 'bank_statement', 'cash_slip']
    if doc_type.lower() in non_itc_doc_types:
        invoice_data['claim_itc'] = False
        invoice_data['itc_warning'] = f"ITC cannot be claimed on {doc_type.replace('_', ' ')}"
        return invoice_data
    
    # Check ledger type
    ledger = invoice_data.get('ledger_name', '').lower()
    
    # Staff welfare - No ITC
    if 'staff welfare' in ledger or 'canteen' in ledger or 'food' in ledger:
        invoice_data['claim_itc'] = False
        invoice_data['itc_warning'] = "ITC not available on staff welfare/food expenses"
        return invoice_data
    
    # Check for restaurant bills (no ITC as per GST law)
    vendor = invoice_data.get('vendor_name', '').lower()
    items = invoice_data.get('line_items', [])
    item_text = ' '.join([i.get('description', '') for i in items]).lower() if items else ''
    
    restaurant_keywords = ['restaurant', 'cafe', 'hotel', 'food court', 'canteen', 'mess', 'biryani', 'pizza', 'burger']
    if any(kw in vendor for kw in restaurant_keywords) or any(kw in item_text for kw in restaurant_keywords):
        invoice_data['claim_itc'] = False
        invoice_data['itc_warning'] = "ITC not available on food/restaurant bills"
        return invoice_data
    
    # Check for missing GSTIN (ITC requires valid GSTIN)
    gstin = invoice_data.get('gst_no', '')
    if not gstin or len(gstin) < 15:
        if invoice_data.get('grand_total', 0) > 5000:
            invoice_data['itc_warning'] = "Warning: No GSTIN - ITC may be disallowed if supplier not registered"
    
    return invoice_data

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
        
        # GST-specific fields (CRITICAL for Tally GST compliance)
        clean['gst_no'] = inv.get('gst_no', '')
        clean['hsn_code'] = inv.get('hsn_code', '')
        clean['vendor_state'] = inv.get('vendor_state', '')
        clean['place_of_supply'] = inv.get('place_of_supply', '')
        clean['tax_rate'] = inv.get('tax_rate', 18)
        clean['gst_nature'] = inv.get('gst_nature', 'Purchase Taxable')
        clean['gst_type'] = inv.get('gst_type', '')
        
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

def generate_tally_xml(invoices, include_ledger_masters=True):
    """
    Generate Tally-compatible XML with sanitization
    
    UPGRADE: Now includes LEDGER MASTER creation!
    When include_ledger_masters=True, the XML will include <LEDGER> tags
    that auto-create Party Ledgers in Tally with GSTIN, Address, and Phone.
    """
    # Apply Tally Guard sanitization
    clean_invoices = sanitize_for_tally(invoices)
    
    envelope = ET.Element("ENVELOPE")
    header = ET.SubElement(envelope, "HEADER")
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    body = ET.SubElement(envelope, "BODY")
    import_data = ET.SubElement(body, "IMPORTDATA")
    request_data = ET.SubElement(import_data, "REQUESTDATA")
    
    # Track unique vendors for ledger creation
    created_ledgers = set()
    
    # PHASE 1: Create Ledger Masters (if enabled)
    if include_ledger_masters:
        for inv in clean_invoices:
            vendor_name = inv.get('vendor_name', '')
            if vendor_name and vendor_name not in created_ledgers and vendor_name != 'Cash Sales':
                # Create Party Ledger
                ledger_msg = ET.SubElement(request_data, "TALLYMESSAGE")
                ledger = ET.SubElement(ledger_msg, "LEDGER", {"NAME": vendor_name, "ACTION": "Create"})
                
                # Parent Group (Sundry Creditors for purchases)
                ET.SubElement(ledger, "PARENT").text = "Sundry Creditors"
                
                # GST Details
                gstin = inv.get('gst_no', '')
                if gstin:
                    ET.SubElement(ledger, "PARTYGSTIN").text = gstin
                    ET.SubElement(ledger, "GSTREGISTRATIONTYPE").text = "Regular"
                    
                    # Extract State Code from GSTIN (first 2 digits)
                    state_code = gstin[:2] if len(gstin) >= 2 else ''
                    state_name = get_state_from_code(state_code)
                    if state_name:
                        ET.SubElement(ledger, "LEDSTATENAME").text = state_name
                
                # Contact Details
                address = inv.get('vendor_address', '') or inv.get('billing_address', '')
                if address:
                    addr_list = ET.SubElement(ledger, "ADDRESS.LIST")
                    # Split address into lines (Tally expects max 4 lines)
                    addr_lines = address.split(',')[:4]
                    for line in addr_lines:
                        ET.SubElement(addr_list, "ADDRESS").text = line.strip()
                
                phone = inv.get('vendor_phone', '')
                if phone:
                    ET.SubElement(ledger, "LEDGERMOBILE").text = phone
                
                email = inv.get('vendor_email', '')
                if email:
                    ET.SubElement(ledger, "EMAIL").text = email
                
                # Mark as created
                created_ledgers.add(vendor_name)
                print(f"📋 XML: Will create ledger '{vendor_name}' with GSTIN: {gstin or 'N/A'}")
    
    # PHASE 2: Create Purchase Vouchers
    for inv in clean_invoices:
        tally_msg = ET.SubElement(request_data, "TALLYMESSAGE")
        voucher = ET.SubElement(tally_msg, "VOUCHER", {"VCHTYPE": "Purchase", "ACTION": "Create"})
        
        # Format date for Tally (YYYYMMDD)
        date_str = inv.get('invoice_date', '')
        try:
            if '-' in date_str:
                from datetime import datetime
                dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
                date_str = dt.strftime('%Y%m%d')
        except:
            date_str = datetime.now().strftime('%Y%m%d')
        
        ET.SubElement(voucher, "DATE").text = date_str
        ET.SubElement(voucher, "VOUCHERNUMBER").text = str(inv.get('invoice_no', ''))
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = inv.get('vendor_name', 'Cash Sales')
        
        # Reference/Narration
        ET.SubElement(voucher, "REFERENCE").text = str(inv.get('invoice_no', ''))
        narration = f"Being purchase from {inv.get('vendor_name', 'vendor')} vide bill no. {inv.get('invoice_no', '')}"
        ET.SubElement(voucher, "NARRATION").text = narration
        
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

    print(f"✅ Tally XML: {len(clean_invoices)} vouchers + {len(created_ledgers)} ledger masters")
    return ET.tostring(envelope, encoding='utf8', method='xml')

def get_state_from_code(code: str) -> str:
    """Map GST state code to state name"""
    STATE_CODES = {
        '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
        '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
        '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
        '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
        '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
        '19': 'West Bengal', '20': 'Jharkhand', '21': 'Orissa',
        '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
        '26': 'Dadra and Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh',
        '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
        '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
        '35': 'Andaman and Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh'
    }
    return STATE_CODES.get(code, '')

# --- NEW: JARVIS AI SEARCH ENGINE (UPGRADED) ---
# ============================================================================
# GST-COMPLIANT TALLY XML GENERATOR (GOLD STANDARD)
# ============================================================================

def format_tally_amount(value) -> str:
    """Format amount to 2 decimal places for Tally"""
    try:
        return f"{float(value):.2f}"
    except (ValueError, TypeError):
        return "0.00"

def format_tally_date(date_str: str) -> str:
    """
    Convert various date formats to Tally YYYYMMDD format
    """
    if not date_str:
        return datetime.now().strftime('%Y%m%d')
    
    # Already in correct format
    if len(str(date_str)) == 8 and str(date_str).isdigit():
        return str(date_str)
    
    # Try common formats
    formats_to_try = [
        '%Y-%m-%d',
        '%d-%m-%Y',
        '%d/%m/%Y',
        '%Y/%m/%d',
        '%d %b %Y',
        '%d %B %Y',
        '%B %d, %Y',
    ]
    
    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(str(date_str)[:10], fmt)
            return dt.strftime('%Y%m%d')
        except ValueError:
            continue
    
    # Fallback to today
    return datetime.now().strftime('%Y%m%d')

def determine_gst_rate(invoice_data: dict) -> int:
    """
    Determine the GST rate from invoice data
    Returns integer rate (e.g., 18, 12, 5, 0)
    """
    cgst = safe_float(invoice_data.get('cgst_amount', 0))
    sgst = safe_float(invoice_data.get('sgst_amount', 0))
    igst = safe_float(invoice_data.get('igst_amount', 0))
    taxable = safe_float(invoice_data.get('taxable_value', 0))
    
    if taxable <= 0:
        return 18  # Default assumption
    
    # Calculate from CGST+SGST or IGST
    total_tax = cgst + sgst if cgst > 0 else igst
    if total_tax > 0:
        rate = round((total_tax / taxable) * 100)
        # Normalize to standard GST rates
        if rate >= 25:
            return 28
        elif rate >= 16:
            return 18
        elif rate >= 10:
            return 12
        elif rate >= 3:
            return 5
        else:
            return 0
    
    return 18  # Default


# =============================================================================
# GST EXPORT VALIDATION LAYER - FINAL AUTHORITY
# =============================================================================
# These rules BLOCK export if violated (not just warnings)
# Based on GST law requirements and Tally compatibility
# =============================================================================

def validate_before_export(invoices: list, voucher_type: str = "Purchase", 
                           company_state: str = "Delhi") -> dict:
    """
    FINAL VALIDATION LAYER - Blocks export if any rule fails.
    
    5 Critical Rules:
    1. B2B Sales requires valid GSTIN
    2. Tax math accuracy (±0.01 tolerance)
    3. Place of Supply mandatory
    4. CGST/IGST state consistency
    5. Negative tax only for Credit Notes
    
    Returns:
        {
            "valid": bool,
            "errors": [{"invoice": str, "rule": str, "message": str, "severity": "block"}],
            "warnings": [{"invoice": str, "rule": str, "message": str, "severity": "warn"}],
            "summary": {"total": int, "passed": int, "failed": int}
        }
    """
    errors = []
    warnings = []
    passed_count = 0
    
    for inv in invoices:
        invoice_no = inv.get('invoice_no', 'Unknown')
        invoice_errors = []
        
        # =====================================================================
        # RULE 1: B2B Sales requires valid GSTIN
        # =====================================================================
        if voucher_type.lower() == "sales":
            customer_type = inv.get('customer_type', 'B2B')  # Default to B2B for safety
            gstin = inv.get('gst_no', '') or inv.get('buyer_gstin', '')
            
            # Check if this looks like B2B (GSTIN present or customer_type = B2B)
            is_b2b = customer_type.upper() == 'B2B' or (gstin and len(gstin) >= 15)
            
            if is_b2b:
                if not gstin or len(gstin) < 15:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "B2B_GSTIN_REQUIRED",
                        "message": "B2B Sales requires valid customer GSTIN (15 characters)",
                        "severity": "block",
                        "field": "gst_no",
                        "current": gstin or "Empty",
                        "expected": "Valid 15-char GSTIN"
                    })
                elif not validate_gstin_checksum(gstin):
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "B2B_GSTIN_INVALID",
                        "message": f"GSTIN checksum invalid: {gstin}",
                        "severity": "block",
                        "field": "gst_no",
                        "current": gstin,
                        "expected": "Valid GSTIN with correct checksum"
                    })
        
        # =====================================================================
        # RULE 2: Tax Math Accuracy (±0.01 tolerance)
        # =====================================================================
        taxable_value = safe_float(inv.get('taxable_value', 0))
        tax_rate = safe_float(inv.get('tax_rate', 18))
        cgst = safe_float(inv.get('cgst_amount', 0))
        sgst = safe_float(inv.get('sgst_amount', 0))
        igst = safe_float(inv.get('igst_amount', 0))
        grand_total = safe_float(inv.get('grand_total', 0))
        
        if taxable_value > 0:
            # Calculate expected values
            half_rate = tax_rate / 2
            expected_cgst = round(taxable_value * half_rate / 100, 2)
            expected_sgst = round(taxable_value * half_rate / 100, 2)
            expected_igst = round(taxable_value * tax_rate / 100, 2)
            
            # Check CGST math (if CGST is used)
            if cgst > 0:
                if abs(cgst - expected_cgst) > 0.01:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "TAX_MATH_CGST_MISMATCH",
                        "message": f"CGST calculation error: expected ₹{expected_cgst}, got ₹{cgst}",
                        "severity": "block",
                        "field": "cgst_amount",
                        "current": cgst,
                        "expected": expected_cgst
                    })
            
            # Check SGST math (if SGST is used)
            if sgst > 0:
                if abs(sgst - expected_sgst) > 0.01:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "TAX_MATH_SGST_MISMATCH",
                        "message": f"SGST calculation error: expected ₹{expected_sgst}, got ₹{sgst}",
                        "severity": "block",
                        "field": "sgst_amount",
                        "current": sgst,
                        "expected": expected_sgst
                    })
            
            # Check IGST math (if IGST is used)
            if igst > 0:
                if abs(igst - expected_igst) > 0.01:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "TAX_MATH_IGST_MISMATCH",
                        "message": f"IGST calculation error: expected ₹{expected_igst}, got ₹{igst}",
                        "severity": "block",
                        "field": "igst_amount",
                        "current": igst,
                        "expected": expected_igst
                    })
            
            # Check Grand Total math
            total_tax = igst if igst > 0 else (cgst + sgst)
            expected_total = round(taxable_value + total_tax, 2)
            if abs(grand_total - expected_total) > 1:  # ₹1 tolerance for grand total
                warnings.append({
                    "invoice": invoice_no,
                    "rule": "GRAND_TOTAL_MISMATCH",
                    "message": f"Grand total mismatch: expected ₹{expected_total}, got ₹{grand_total}",
                    "severity": "warn",
                    "field": "grand_total",
                    "current": grand_total,
                    "expected": expected_total
                })
        
        # =====================================================================
        # RULE 3: Place of Supply Mandatory
        # =====================================================================
        place_of_supply = inv.get('place_of_supply', '') or ''
        
        if not place_of_supply.strip():
            # Try to derive from GSTIN
            gstin = inv.get('gst_no', '')
            if gstin and len(gstin) >= 2:
                derived_state = get_state_from_code(gstin[:2])
                if derived_state:
                    # Auto-fix: Add warning but don't block
                    warnings.append({
                        "invoice": invoice_no,
                        "rule": "PLACE_OF_SUPPLY_DERIVED",
                        "message": f"Place of Supply auto-derived from GSTIN: {derived_state}",
                        "severity": "warn",
                        "field": "place_of_supply",
                        "current": "Empty",
                        "expected": derived_state
                    })
                    # Update the invoice
                    inv['place_of_supply'] = derived_state
                    place_of_supply = derived_state
                else:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "PLACE_OF_SUPPLY_MISSING",
                        "message": "Place of Supply is mandatory for GST vouchers",
                        "severity": "block",
                        "field": "place_of_supply",
                        "current": "Empty",
                        "expected": "Valid state name"
                    })
            else:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "PLACE_OF_SUPPLY_MISSING",
                    "message": "Place of Supply is mandatory for GST vouchers",
                    "severity": "block",
                    "field": "place_of_supply",
                    "current": "Empty",
                    "expected": "Valid state name"
                })
        
        # =====================================================================
        # RULE 4: CGST/IGST State Consistency
        # =====================================================================
        vendor_state = inv.get('vendor_state', '') or ''
        if not vendor_state:
            # Try to derive from GSTIN
            gstin = inv.get('gst_no', '')
            if gstin and len(gstin) >= 2:
                vendor_state = get_state_from_code(gstin[:2]) or company_state
        
        supplier_state = vendor_state or company_state
        pos = place_of_supply or company_state
        
        is_intrastate = supplier_state.lower().strip() == pos.lower().strip()
        
        if is_intrastate:
            # Intrastate: Should have CGST+SGST, NOT IGST
            if igst > 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "IGST_INTRASTATE_ERROR",
                    "message": f"IGST (₹{igst}) not allowed for intrastate transaction. Supplier: {supplier_state}, Supply: {pos}",
                    "severity": "block",
                    "field": "igst_amount",
                    "current": f"IGST={igst}",
                    "expected": "IGST=0, use CGST+SGST instead"
                })
            
            # CGST should equal SGST for intrastate
            if cgst > 0 and sgst > 0:
                if abs(cgst - sgst) > 0.01:
                    invoice_errors.append({
                        "invoice": invoice_no,
                        "rule": "CGST_SGST_UNEQUAL",
                        "message": f"CGST (₹{cgst}) must equal SGST (₹{sgst}) for intrastate",
                        "severity": "block",
                        "field": "cgst_amount,sgst_amount",
                        "current": f"CGST={cgst}, SGST={sgst}",
                        "expected": "CGST = SGST"
                    })
        else:
            # Interstate: Should have IGST, NOT CGST+SGST
            if cgst > 0 or sgst > 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "CGST_SGST_INTERSTATE_ERROR",
                    "message": f"CGST/SGST not allowed for interstate. Supplier: {supplier_state}, Supply: {pos}",
                    "severity": "block",
                    "field": "cgst_amount,sgst_amount",
                    "current": f"CGST={cgst}, SGST={sgst}",
                    "expected": "CGST=0, SGST=0, use IGST instead"
                })
        
        # =====================================================================
        # RULE 5: Negative Tax Only for Credit Notes
        # =====================================================================
        doc_type = inv.get('doc_type', voucher_type).lower()
        is_credit_note = 'credit' in doc_type or 'cn' in doc_type or 'return' in doc_type
        
        if not is_credit_note:
            if cgst < 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "NEGATIVE_CGST_NOT_ALLOWED",
                    "message": f"Negative CGST (₹{cgst}) only allowed for Credit Notes",
                    "severity": "block",
                    "field": "cgst_amount",
                    "current": cgst,
                    "expected": "≥ 0"
                })
            if sgst < 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "NEGATIVE_SGST_NOT_ALLOWED",
                    "message": f"Negative SGST (₹{sgst}) only allowed for Credit Notes",
                    "severity": "block",
                    "field": "sgst_amount",
                    "current": sgst,
                    "expected": "≥ 0"
                })
            if igst < 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "NEGATIVE_IGST_NOT_ALLOWED",
                    "message": f"Negative IGST (₹{igst}) only allowed for Credit Notes",
                    "severity": "block",
                    "field": "igst_amount",
                    "current": igst,
                    "expected": "≥ 0"
                })
            if taxable_value < 0:
                invoice_errors.append({
                    "invoice": invoice_no,
                    "rule": "NEGATIVE_TAXABLE_NOT_ALLOWED",
                    "message": f"Negative taxable value (₹{taxable_value}) only allowed for Credit Notes",
                    "severity": "block",
                    "field": "taxable_value",
                    "current": taxable_value,
                    "expected": "≥ 0"
                })
        
        # Count passed/failed
        if len(invoice_errors) == 0:
            passed_count += 1
        else:
            errors.extend(invoice_errors)
    
    # Build summary
    is_valid = len(errors) == 0
    
    result = {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "total": len(invoices),
            "passed": passed_count,
            "failed": len(invoices) - passed_count,
            "error_count": len(errors),
            "warning_count": len(warnings)
        }
    }
    
    # Log result
    if is_valid:
        print(f"✅ Validation PASSED: {passed_count}/{len(invoices)} invoices OK")
    else:
        print(f"❌ Validation FAILED: {len(errors)} blocking errors, {len(warnings)} warnings")
        for err in errors[:5]:  # Show first 5 errors
            print(f"   ❌ {err['invoice']}: {err['rule']} - {err['message']}")
    
    return result


def generate_gst_tally_xml(invoices: list, company_name: str = "ABC Traders", 
                           voucher_type: str = "Purchase", company_state: str = "Delhi") -> bytes:
    """
    Generate Tally-compatible GST voucher XML (GOLD STANDARD)
    
    This XML follows Tally's exact schema for GST vouchers:
    - Tally accepts without manual mapping
    - GST is automatically applied
    - GSTR-1 and GSTR-3B can be generated directly
    
    Args:
        invoices: List of invoice dictionaries
        company_name: Exact Tally company name (case-sensitive)
        voucher_type: "Purchase" or "Sales"
        company_state: State of the company for CGST+SGST vs IGST determination
    
    Returns:
        UTF-8 encoded XML bytes
    """
    # Validate and clean invoices
    clean_invoices = sanitize_for_tally(invoices)
    
    if not clean_invoices:
        # Return empty but valid structure
        envelope = ET.Element("ENVELOPE")
        return ET.tostring(envelope, encoding='utf8', method='xml')
    
    # Build XML structure following MANDATORY hierarchy
    envelope = ET.Element("ENVELOPE")
    
    # 1. HEADER (MANDATORY)
    header = ET.SubElement(envelope, "HEADER")
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"
    
    # 2. BODY
    body = ET.SubElement(envelope, "BODY")
    import_data = ET.SubElement(body, "IMPORTDATA")
    
    # 3. REQUESTDESC (COMPANY MATCHING)
    request_desc = ET.SubElement(import_data, "REQUESTDESC")
    ET.SubElement(request_desc, "REPORTNAME").text = "Vouchers"
    static_vars = ET.SubElement(request_desc, "STATICVARIABLES")
    ET.SubElement(static_vars, "SVCURRENTCOMPANY").text = company_name
    
    # 4. REQUESTDATA with TALLYMESSAGE entries
    request_data = ET.SubElement(import_data, "REQUESTDATA")
    
    # Track unique vendors for ledger creation
    created_ledgers = set()
    
    # Determine transaction nature based on voucher type
    if voucher_type.lower() == "sales":
        transaction_nature = "Sales Taxable"
        party_group = "Sundry Debtors"
        tax_ledger_prefix = "Output"
    else:
        transaction_nature = "Purchase Taxable"
        party_group = "Sundry Creditors"
        tax_ledger_prefix = "Input"
    
    # PHASE 1: Create Ledger Masters
    for inv in clean_invoices:
        vendor_name = inv.get('vendor_name', '')
        if vendor_name and vendor_name not in created_ledgers and vendor_name != 'Cash Sales':
            ledger_msg = ET.SubElement(request_data, "TALLYMESSAGE")
            ledger = ET.SubElement(ledger_msg, "LEDGER", {"NAME": vendor_name, "ACTION": "Create"})
            
            ET.SubElement(ledger, "PARENT").text = party_group
            
            gstin = inv.get('gst_no', '')
            if gstin and len(gstin) >= 15:
                ET.SubElement(ledger, "PARTYGSTIN").text = gstin
                ET.SubElement(ledger, "GSTREGISTRATIONTYPE").text = "Regular"
                
                state_code = gstin[:2]
                state_name = get_state_from_code(state_code)
                if state_name:
                    ET.SubElement(ledger, "LEDSTATENAME").text = state_name
            
            created_ledgers.add(vendor_name)
    
    # PHASE 2: Create GST-Compliant Vouchers
    for inv in clean_invoices:
        tally_msg = ET.SubElement(request_data, "TALLYMESSAGE")
        voucher = ET.SubElement(tally_msg, "VOUCHER")
        
        # Voucher Identity Fields
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = voucher_type
        ET.SubElement(voucher, "DATE").text = format_tally_date(inv.get('invoice_date', ''))
        ET.SubElement(voucher, "VOUCHERNUMBER").text = str(inv.get('invoice_no', f'INV-{int(time.time())}'))
        ET.SubElement(voucher, "REFERENCE").text = str(inv.get('invoice_no', ''))
        
        vendor_name = inv.get('vendor_name', 'Cash Sales')
        narration = f"Being {voucher_type.lower()} from {vendor_name} vide bill no. {inv.get('invoice_no', '')}"
        ET.SubElement(voucher, "NARRATION").text = narration
        
        # Party Details
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = vendor_name
        
        gstin = inv.get('gst_no', '')
        if gstin and len(gstin) >= 15:
            ET.SubElement(voucher, "PARTYGSTIN").text = gstin
            
            # Extract state from GSTIN
            state_code = gstin[:2]
            party_state = get_state_from_code(state_code) or company_state
        else:
            party_state = company_state
        
        ET.SubElement(voucher, "PARTYSTATENAME").text = party_state
        
        # Place of Supply
        ET.SubElement(voucher, "PLACEOFSUPPLY").text = party_state
        
        # GST CONTROL FLAGS (MANDATORY for GST)
        ET.SubElement(voucher, "ISGSTAPPLICABLE").text = "Yes"
        ET.SubElement(voucher, "ISGSTOVERRIDDEN").text = "No"
        ET.SubElement(voucher, "GSTNATUREOFTRANSACTION").text = transaction_nature
        
        # Get amounts
        grand_total = safe_float(inv.get('grand_total', 0))
        taxable_value = safe_float(inv.get('taxable_value', 0))
        igst = safe_float(inv.get('igst_amount', 0))
        cgst = safe_float(inv.get('cgst_amount', 0))
        sgst = safe_float(inv.get('sgst_amount', 0))
        
        # Determine GST rate
        gst_rate = determine_gst_rate(inv)
        half_rate = gst_rate // 2
        
        # Determine if IGST or CGST+SGST based on place of supply
        is_interstate = party_state.lower() != company_state.lower()
        
        # LEDGER ENTRIES
        
        # 1. Party Ledger (Credit for Purchase / Debit for Sales)
        party_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(party_entry, "LEDGERNAME").text = vendor_name
        if voucher_type.lower() == "purchase":
            ET.SubElement(party_entry, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(party_entry, "AMOUNT").text = format_tally_amount(grand_total)
        else:
            ET.SubElement(party_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(party_entry, "AMOUNT").text = format_tally_amount(-grand_total)
        
        # 2. Purchase/Sales Ledger (Taxable Value)
        ledger_name = inv.get('ledger_name', f'{voucher_type} @ {gst_rate}%')
        purchase_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(purchase_entry, "LEDGERNAME").text = ledger_name
        if voucher_type.lower() == "purchase":
            ET.SubElement(purchase_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(purchase_entry, "AMOUNT").text = format_tally_amount(-taxable_value)
        else:
            ET.SubElement(purchase_entry, "ISDEEMEDPOSITIVE").text = "No"
            ET.SubElement(purchase_entry, "AMOUNT").text = format_tally_amount(taxable_value)
        
        # 3. GST Entries with GSTTYPE and GSTRATE
        if is_interstate or igst > 0:
            # IGST
            igst_amount = igst if igst > 0 else (cgst + sgst)
            if igst_amount > 0:
                igst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
                ET.SubElement(igst_entry, "LEDGERNAME").text = f"IGST {tax_ledger_prefix} @ {gst_rate}%"
                ET.SubElement(igst_entry, "GSTTYPE").text = "Integrated Tax"
                ET.SubElement(igst_entry, "GSTRATE").text = str(gst_rate)
                if voucher_type.lower() == "purchase":
                    ET.SubElement(igst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
                    ET.SubElement(igst_entry, "AMOUNT").text = format_tally_amount(-igst_amount)
                else:
                    ET.SubElement(igst_entry, "ISDEEMEDPOSITIVE").text = "No"
                    ET.SubElement(igst_entry, "AMOUNT").text = format_tally_amount(igst_amount)
        else:
            # CGST + SGST
            if cgst > 0:
                cgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
                ET.SubElement(cgst_entry, "LEDGERNAME").text = f"CGST {tax_ledger_prefix} @ {half_rate}%"
                ET.SubElement(cgst_entry, "GSTTYPE").text = "Central Tax"
                ET.SubElement(cgst_entry, "GSTRATE").text = str(half_rate)
                if voucher_type.lower() == "purchase":
                    ET.SubElement(cgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
                    ET.SubElement(cgst_entry, "AMOUNT").text = format_tally_amount(-cgst)
                else:
                    ET.SubElement(cgst_entry, "ISDEEMEDPOSITIVE").text = "No"
                    ET.SubElement(cgst_entry, "AMOUNT").text = format_tally_amount(cgst)
            
            if sgst > 0:
                sgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
                ET.SubElement(sgst_entry, "LEDGERNAME").text = f"SGST {tax_ledger_prefix} @ {half_rate}%"
                ET.SubElement(sgst_entry, "GSTTYPE").text = "State Tax"
                ET.SubElement(sgst_entry, "GSTRATE").text = str(half_rate)
                if voucher_type.lower() == "purchase":
                    ET.SubElement(sgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
                    ET.SubElement(sgst_entry, "AMOUNT").text = format_tally_amount(-sgst)
                else:
                    ET.SubElement(sgst_entry, "ISDEEMEDPOSITIVE").text = "No"
                    ET.SubElement(sgst_entry, "AMOUNT").text = format_tally_amount(sgst)
        
        # HSN DETAILS (Recommended for GSTR-1)
        hsn_code = inv.get('hsn_code', '')
        if hsn_code:
            hsn_list = ET.SubElement(voucher, "HSNDETAILS.LIST")
            ET.SubElement(hsn_list, "HSNCODE").text = str(hsn_code)
            ET.SubElement(hsn_list, "TAXRATE").text = str(gst_rate)
            ET.SubElement(hsn_list, "TAXABLEVALUE").text = format_tally_amount(taxable_value)
        
        # GST SUMMARY (Best Practice)
        gst_summary = ET.SubElement(voucher, "GSTSUMMARY.LIST")
        ET.SubElement(gst_summary, "TAXABLEAMOUNT").text = format_tally_amount(taxable_value)
        
        if is_interstate or igst > 0:
            igst_amount = igst if igst > 0 else (cgst + sgst)
            ET.SubElement(gst_summary, "IGSTAMOUNT").text = format_tally_amount(igst_amount)
        else:
            ET.SubElement(gst_summary, "CGSTAMOUNT").text = format_tally_amount(cgst)
            ET.SubElement(gst_summary, "SGSTAMOUNT").text = format_tally_amount(sgst)
    
    print(f"✅ GST Tally XML: {len(clean_invoices)} vouchers + {len(created_ledgers)} ledger masters generated")
    
    # Pretty print XML
    from xml.dom import minidom
    xml_str = ET.tostring(envelope, encoding='unicode', method='xml')
    pretty_xml = minidom.parseString(xml_str).toprettyxml(indent="  ", encoding='utf-8')
    
    return pretty_xml


@app.post("/search/ai")
async def ai_search(query: SearchQuery):
    print(f"🤖 Tax.AI analyzing: {query.query}")
    print(f"   Context: {query.context}")
    
    # Get context info
    current_tab = query.context.get('current_tab', 'dashboard') if query.context else 'dashboard'
    selected_client = query.context.get('selected_client') if query.context else None
    client_id = query.context.get('client_id') if query.context else None
    selected_month = query.context.get('month') if query.context else 'all'
    
    user_query = query.query.lower().strip()
    
    # =========================================================================
    # SUPER AI - COMPREHENSIVE NAVIGATION & ACTION COMMANDS
    # =========================================================================
    navigation_commands = {
        # === TAB NAVIGATION ===
        'show dashboard': {'action': 'navigate', 'tab': 'dashboard', 'message': 'Opening Dashboard... 📊'},
        'open dashboard': {'action': 'navigate', 'tab': 'dashboard', 'message': 'Opening Dashboard... 📊'},
        'go to dashboard': {'action': 'navigate', 'tab': 'dashboard', 'message': 'Opening Dashboard... 📊'},
        'dashboard': {'action': 'navigate', 'tab': 'dashboard', 'message': 'Opening Dashboard... 📊'},
        'home': {'action': 'navigate', 'tab': 'dashboard', 'message': 'Going home to Dashboard... 🏠'},
        
        'add bill': {'action': 'navigate', 'tab': 'upload', 'message': 'Opening Add Bills... 📤'},
        'add bills': {'action': 'navigate', 'tab': 'upload', 'message': 'Opening Add Bills... 📤'},
        'upload': {'action': 'navigate', 'tab': 'upload', 'message': 'Opening Upload section... 📤'},
        'upload invoice': {'action': 'navigate', 'tab': 'upload', 'message': 'Opening Add Bills... 📤'},
        'new bill': {'action': 'navigate', 'tab': 'upload', 'message': 'Ready to add new bill... 📤'},
        'scan bill': {'action': 'navigate', 'tab': 'upload', 'message': 'Opening scanner... 📷'},
        
        'show bills': {'action': 'navigate', 'tab': 'register', 'message': 'Opening Bill Register... 📋'},
        'bill register': {'action': 'navigate', 'tab': 'register', 'message': 'Opening Bill Register... 📋'},
        'all bills': {'action': 'navigate', 'tab': 'register', 'message': 'Showing all bills... 📋'},
        'show invoices': {'action': 'navigate', 'tab': 'register', 'message': 'Opening Bill Register... 📋'},
        'my bills': {'action': 'navigate', 'tab': 'register', 'message': 'Here are your bills... 📋'},
        'invoice list': {'action': 'navigate', 'tab': 'register', 'message': 'Opening Bill Register... 📋'},
        
        'pending': {'action': 'navigate', 'tab': 'triage', 'message': 'Opening Pending items... ⏳'},
        'pending bills': {'action': 'navigate', 'tab': 'triage', 'message': 'Showing pending bills... ⏳'},
        'unassigned': {'action': 'navigate', 'tab': 'triage', 'message': 'Showing unassigned bills... ⏳'},
        'needs review': {'action': 'navigate', 'tab': 'triage', 'message': 'Showing items that need review... 👀'},
        'triage': {'action': 'navigate', 'tab': 'triage', 'message': 'Opening Triage Center... ⏳'},
        
        'messages': {'action': 'navigate', 'tab': 'comms', 'message': 'Opening Messages... 💬'},
        'send message': {'action': 'navigate', 'tab': 'comms', 'message': 'Opening Messages... 💬'},
        'whatsapp': {'action': 'navigate', 'tab': 'comms', 'message': 'Opening WhatsApp integration... 💬'},
        'communication': {'action': 'navigate', 'tab': 'comms', 'message': 'Opening Communication Center... 💬'},
        'contact client': {'action': 'navigate', 'tab': 'comms', 'message': 'Opening Messages to contact client... 💬'},
        
        # === LEGAL EAGLE ===
        'legal': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle... ⚖️'},
        'notices': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening GST Notices... ⚖️'},
        'gst notices': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening GST Notices... ⚖️'},
        'legal notices': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle... ⚖️'},
        'upload notice': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal tab to upload notice... ⚖️'},
        'reply to notice': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle for notice reply... ⚖️'},
        'asmt-10': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle for ASMT-10... ⚖️'},
        'drc-01': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle for DRC-01... ⚖️'},
        'show cause': {'action': 'navigate', 'tab': 'legal', 'message': 'Opening Legal Eagle for notices... ⚖️'},
        
        # === MODAL ACTIONS ===
        'bulk ledger': {'action': 'open_modal', 'modal': 'bulk_mapper', 'message': 'Opening Bulk Ledger Mapper... 📦'},
        'bulk mapper': {'action': 'open_modal', 'modal': 'bulk_mapper', 'message': 'Opening Bulk Ledger Mapper... 📦'},
        'assign ledgers': {'action': 'open_modal', 'modal': 'bulk_mapper', 'message': 'Opening Bulk Ledger assignment... 📦'},
        'map ledgers': {'action': 'open_modal', 'modal': 'bulk_mapper', 'message': 'Opening Ledger Mapper... 📦'},
        
        'tally simulation': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Running Tally Export Simulation... 🔍'},
        'simulate export': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Checking bills before export... 🔍'},
        'pre-check export': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Running pre-export check... 🔍'},
        'check tally': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Checking Tally compatibility... 🔍'},
        
        'export tally': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Opening Tally Export... 📥'},
        'download xml': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Preparing Tally XML... 📥'},
        'export to tally': {'action': 'open_modal', 'modal': 'tally_simulation', 'message': 'Opening Tally Export... 📥'},
        
        'client profile': {'action': 'open_modal', 'modal': 'client_profile', 'message': 'Opening Client Profile... 👤'},
        'show client': {'action': 'open_modal', 'modal': 'client_profile', 'message': 'Opening Client Profile... 👤'},
        'client details': {'action': 'open_modal', 'modal': 'client_profile', 'message': 'Opening Client Details... 👤'},
        
        # === SETTINGS & THEME ===
        'settings': {'action': 'open_settings', 'message': 'Opening Settings... ⚙️'},
        'open settings': {'action': 'open_settings', 'message': 'Opening Settings... ⚙️'},
        'preferences': {'action': 'open_settings', 'message': 'Opening Preferences... ⚙️'},
        'change theme': {'action': 'open_settings', 'message': 'Opening Settings to change theme... ⚙️'},
        
        'dark mode': {'action': 'toggle_theme', 'theme': 'dark', 'message': 'Switching to Dark Mode... 🌙'},
        'light mode': {'action': 'toggle_theme', 'theme': 'light', 'message': 'Switching to Light Mode... ☀️'},
        'switch theme': {'action': 'toggle_theme', 'theme': 'toggle', 'message': 'Toggling theme... 🎨'},
        
        # === CLIENT ACTIONS ===
        'switch client': {'action': 'open_modal', 'modal': 'client_selector', 'message': 'Opening Client Selector... 🔄'},
        'change client': {'action': 'open_modal', 'modal': 'client_selector', 'message': 'Opening Client Selector... 🔄'},
        'select client': {'action': 'open_modal', 'modal': 'client_selector', 'message': 'Opening Client Selector... 🔄'},
        'add client': {'action': 'open_modal', 'modal': 'add_client', 'message': 'Opening Add Client form... ➕'},
        'new client': {'action': 'open_modal', 'modal': 'add_client', 'message': 'Opening Add Client form... ➕'},
        
        # === QUICK ACTIONS ===
        'verify gstin': {'action': 'special', 'command': 'verify_gstin', 'message': 'Opening GSTIN Verifier... 🕵️'},
        'check gstin': {'action': 'special', 'command': 'verify_gstin', 'message': 'Opening GSTIN Verifier... 🕵️'},
        'vendor spy': {'action': 'special', 'command': 'verify_gstin', 'message': 'Opening Vendor Spy... 🕵️'},
        
        'refresh': {'action': 'special', 'command': 'refresh', 'message': 'Refreshing data... 🔄'},
        'reload': {'action': 'special', 'command': 'refresh', 'message': 'Reloading... 🔄'},
    }
    
    # Check for exact navigation commands
    for cmd, response in navigation_commands.items():
        if cmd in user_query or user_query == cmd:
            print(f"🧭 Navigation command: {cmd}")
            return {"action": response, "type": "navigation"}
    
    # Month filter commands
    month_keywords = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december']
    for month in month_keywords:
        if month in user_query and ('filter' in user_query or 'show' in user_query or 'bills' in user_query):
            month_num = month_keywords.index(month) + 1
            year = 2026 if month_num <= 3 else 2025  # Fiscal year logic
            month_value = f"{year}-{str(month_num).zfill(2)}"
            print(f"📅 Month filter command: {month_value}")
            return {
                "action": {
                    "action": "filter_month",
                    "month": month_value,
                    "message": f"Filtering bills for {month.title()}..."
                },
                "type": "navigation"
            }
    
    # =========================================================================
    # DATABASE SCHEMA FOR AI
    # =========================================================================
    schema = """
    Table: invoices
    Columns:
    - id (Integer)
    - invoice_no (Text) - Bill number
    - gst_no (Text) - Vendor's GST number
    - vendor_name (Text) - Seller name
    - grand_total (Real/Float) - Total amount
    - invoice_date (Text) - Date of bill
    - payment_status (Text: 'Unpaid', 'Paid', 'Disputed')
    - client_id (Integer) - Which client this bill belongs to
    - ledger_name (Text) - Accounting ledger
    - json_data (Text - contains all extracted details)
    
    Table: clients
    Columns:
    - id (Integer)
    - company_name (Text)
    - gstin (Text)
    - phone (Text)
    - email (Text)
    """
    
    # =========================================================================
    # SUPER AI - COMPREHENSIVE FEATURE KNOWLEDGE BASE
    # =========================================================================
    feature_help = {
        'dashboard': '''
        📊 **Dashboard** - Your Business Command Center
        - Total bills uploaded this month
        - GST amounts (CGST, SGST, IGST) breakdown
        - Top vendors chart
        - Monthly trends with beautiful graphs
        
        💡 Say "show dashboard" to go there!
        ''',
        
        'upload': '''
        📤 **Add Bills** - Smart Document Scanner
        - Drop PDF, JPG, or PNG files
        - AI reads and extracts ALL details automatically
        - Vendor name, amount, GST, date, items
        - Auto-assigns ledger and HSN codes
        
        🤖 AI Features:
        - Smart vendor matching (Sherlock Holmes mode!)
        - Auto-narration like "Being purchase of fuel..."
        - ITC Safe-Guard checks for compliance
        
        💡 Say "add bill" or "upload invoice" to go there!
        ''',
        
        'register': '''
        📋 **Bill Register** - Your Bill Database
        - Search by vendor, amount, or date
        - Click any row to edit inline
        - 🚩 Flag button asks client about bill via WhatsApp
        - Sort by any column
        - Filter by month using Time Filter
        
        🏷️ Badges you'll see:
        - 🔴 No ITC = Can't claim tax credit
        - 🟡 ITC Risk = Missing GSTIN warning
        - 🟠 Receipt = Non-invoice document
        
        💡 Say "show bills" or "all invoices" to go there!
        ''',
        
        'triage': '''
        📥 **Pending / Triage** - Bills Needing Attention
        - Unassigned bills (no client linked)
        - Low confidence readings
        - Missing vendor/amount/date
        
        💡 Say "pending" or "needs review" to go there!
        ''',
        
        'comms': '''
        💬 **Messages** - Client Communication Hub
        - Send WhatsApp reminders
        - Request missing bills
        - Payment follow-ups
        - Pre-filled message templates
        
        💡 Say "messages" or "whatsapp" to go there!
        ''',
        
        'legal': '''
        ⚖️ **Legal Eagle** - GST Notice Handler
        
        Upload any GST Notice and I will:
        1. Identify the notice type (ASMT-10, DRC-01, etc.)
        2. Extract deadline, amount, and issue
        3. Draft a formal reply citing GST Sections!
        
        Notice types I understand:
        - ASMT-10: Scrutiny Notice
        - DRC-01: Demand Notice
        - REG-17: Show Cause Notice
        - And more!
        
        💡 Say "legal" or "notices" or "upload notice" to go there!
        ''',
        
        'bulk_ledger': '''
        📦 **Bulk Ledger Mapper**
        
        Assign ledgers to 50+ bills at once!
        - Groups bills by vendor automatically
        - Select ledger from dropdown
        - Click Apply - ALL bills from that vendor updated
        
        💡 Say "bulk ledger" or "assign ledgers" to open it!
        ''',
        
        'tally': '''
        🔍 **Tally Export & Simulation**
        
        Before downloading XML for Tally:
        - ✅ Shows "Ready" bills
        - ⚠️ Shows "Warning" bills (will export with defaults)
        - ❌ Shows "Error" bills (won't export)
        
        Auto-creates Party Ledgers with:
        - Vendor GSTIN
        - Address
        - State
        - Phone
        
        💡 Say "export tally" or "tally simulation" to open it!
        ''',
        
        'vendor_spy': '''
        🕵️ **Vendor Spy** - GSTIN Verification
        
        Checks if a vendor's GST registration is:
        - ✅ Active (safe to claim ITC)
        - ❌ Cancelled (DANGER - fake bill risk!)
        
        Prevents you from paying cancelled vendors!
        
        💡 Say "check gstin" or "vendor spy" to verify a vendor!
        ''',
        
        'client_profile': '''
        👤 **Client Profile**
        - GSTIN, PAN, Phone, Email
        - Address and contact person
        - Notes for reminders
        - Generate self-service invite links
        
        💡 Say "client profile" or "show client" to open it!
        ''',
        
        'time_filter': '''
        📅 **Time Filter** (Month Selector)
        - Click the calendar icon in header
        - Select any month
        - All views filter to that month
        
        💡 Say "filter january" or "show december bills"!
        ''',
        
        'flag_ask': '''
        🚩 **Flag & Ask Button**
        
        On each bill row, click the 🚩 flag icon.
        Opens WhatsApp with message:
        "Hi! Regarding Bill #123 for ₹5,000 - please clarify what this was for?"
        
        No typing needed - context is auto-filled!
        ''',
        
        'narration': '''
        ✍️ **Auto-Narration Writer**
        
        Every bill gets a professional Tally narration:
        "Being purchase of fuel from Reliance vide Invoice No. 123"
        
        Automatically detects:
        - Fuel purchases
        - Office expenses
        - Fixed assets
        - Professional charges
        ''',
        
        'itc': '''
        🛡️ **ITC Safe-Guard**
        
        Protects you from illegal tax credit claims!
        
        Auto-blocks ITC on:
        - Receipts (non-GST)
        - Restaurant bills (as per GST law)
        - Staff welfare
        - Personal expenses
        
        Shows warning badges:
        - 🔴 No ITC
        - 🟡 ITC Risk (missing GSTIN)
        '''
    }
    
    # Check for help/feature queries
    if 'how to' in user_query or 'what is' in user_query or 'help' in user_query or 'how do i' in user_query:
        for feature, help_text in feature_help.items():
            if feature.replace('_', ' ') in user_query or feature in user_query:
                return {"explanation": help_text.strip(), "type": "help"}
        
        # General help
        if 'help' in user_query:
            return {
                "explanation": '''
🌟 **Tax.AI Help**

I can help you with:
• **Go to Dashboard** - See your business summary
• **Add Bills** - Upload new invoices
• **Show January bills** - Filter by month
• **What is GST** - Legal questions
• **How to export** - Step-by-step guides

Just type what you need in simple words!
                '''.strip(),
                "type": "help"
            }
    
    # =========================================================================
    # GST LAW KNOWLEDGE
    # =========================================================================
    gst_context = '''
    Important GST Rules (in simple language):
    
    📌 Input Tax Credit (Section 16):
    - You can claim credit only if vendor files their return
    - Bill must be less than 180 days old
    
    📌 Blocked Credit (Section 17):
    - No credit on: Cars, AC units, Food, Personal items
    
    📌 Monthly Returns:
    - GSTR-1: Sales (due by 11th)
    - GSTR-3B: Summary + Payment (due by 20th)
    
    📌 5% Rule (Rule 36-4):
    - You can claim only 5% extra over what appears in GSTR-2B
    '''
    
    # =========================================================================
    # AI PROMPT FOR COMPLEX QUERIES
    # =========================================================================
    prompt = f"""
    You are Tax.AI, a friendly assistant for Indian accountants.
    
    Current Page: {current_tab}
    Selected Client: {selected_client or 'None'}
    Month Filter: {selected_month}
    
    GST Knowledge:
    {gst_context}
    
    Database Schema: {schema}
    
    User Question: "{query.query}"
    
    Instructions:
    1. Use simple words - no technical jargon
    2. If asking about data, return ONLY a SQL SELECT query
    3. If explaining, start with "EXPLAIN:" and be brief
    4. Add Hindi words occasionally if natural (like "aapke paas", "yeh feature")
    5. Use emojis to make responses friendly
    
    If returning SQL, output ONLY the query starting with SELECT.
    """
    
    try:
        # Use Llama 3.1 405B for natural language chat
        ai_response = call_chat_model(prompt)
        ai_response = ai_response.replace("```sql", "").replace("```", "").strip()

        
        # Check if it's an explanation
        if ai_response.upper().startswith("EXPLAIN:"):
            explanation = ai_response.replace("EXPLAIN:", "").strip()
            print(f"💡 Tax.AI Explanation: {explanation[:100]}...")
            return {"explanation": explanation, "type": "help"}
        
        # Security Check for SQL
        sql_query = ai_response
        if not sql_query.upper().startswith("SELECT"):
            return {"explanation": ai_response, "type": "help"}
            
        print(f"🔍 Executing SQL: {sql_query}")
        
        # Execute SQL
        conn = get_db_connection()
        cursor = conn.cursor()
        rows = cursor.execute(sql_query).fetchall()
        
        # Format Results
        results = []
        for row in rows:
            try:
                if 'id' in row.keys():
                    if 'json_data' in row.keys():
                        data = json.loads(row['json_data'])
                        data['id'] = row['id']
                        data['payment_status'] = row['payment_status'] if 'payment_status' in row.keys() else 'Unpaid'
                        results.append(data)
                    else:
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
        return {"explanation": "Sorry, I couldn't process that. Try asking in a different way!", "type": "help"}

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
    
    # ✍️ AUTO-NARRATION WRITER - Generate Tally-style narration
    data = generate_auto_narration(data)
    
    # 🛡️ ITC SAFE-GUARD - Check if ITC can be claimed
    data = check_itc_eligibility(data, doc_type)
    
    print(f"🎯 AI Classification: HSN={data['hsn_code']}, Ledger={data['ledger_name']}, Group={data['group_name']} (Confidence: {confidence_level})")
    print(f"✍️ Auto-Narration: {data.get('narration', 'N/A')[:50]}...")
    print(f"🛡️ ITC Eligible: {data.get('claim_itc', True)}")
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


# =============================================================================
# ASYNC PIPELINE ENDPOINTS - High-Performance Concurrent Processing
# =============================================================================

from pipeline import process_document_async, get_task_status, wait_for_task, pipeline

@app.on_event("startup")
async def startup_pipeline():
    """Start the async pipeline workers when server starts."""
    await pipeline.start_workers()
    print("🚀 Async Pipeline Workers started!")


@app.post("/upload/async")
async def process_invoice_async_endpoint(
    file: UploadFile = File(...),
    client_id: int = None,
    doc_type: str = "gst_invoice",
    entered_by: str = None
):
    """
    ASYNC Upload - Returns immediately with task_id.
    Processing happens in background pipeline.
    
    Use /upload/status/{task_id} to check progress.
    """
    print(f"\n📥 [ASYNC] Queuing: {file.filename}")
    
    # Save file
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    file_content = await file.read()
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Submit to async pipeline (returns immediately)
    task_id = await process_document_async(
        file_bytes=file_content,
        mime_type=file.content_type,
        filename=file.filename,
        client_id=client_id,
        doc_type=doc_type,
        entered_by=entered_by
    )
    
    return {
        "status": "queued",
        "task_id": task_id,
        "filename": file.filename,
        "file_url": f"/files/{unique_filename}"
    }


@app.get("/upload/status/{task_id}")
async def check_upload_status(task_id: str):
    """
    Check the status of an async upload task.
    
    Status will be one of:
    - queued: Waiting in queue
    - ocr_processing: Extracting text from image
    - logic_processing: Classifying HSN, Ledger, Group
    - saving: Storing in database
    - completed: Done! Result available
    - failed: Error occurred
    """
    status = await get_task_status(task_id)
    return status


@app.post("/upload/bulk")
async def bulk_upload_async_endpoint(
    files: List[UploadFile] = File(...),
    client_id: int = None,
    doc_type: str = "gst_invoice",
    entered_by: str = None
):
    """
    BULK UPLOAD - Process multiple files concurrently.
    
    All files are queued immediately and processed in parallel.
    Returns list of task_ids to track progress.
    """
    print(f"\n📦 [BULK] Processing {len(files)} files concurrently...")
    
    task_ids = []
    
    for file in files:
        # Save file
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        file_content = await file.read()
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Queue for processing
        task_id = await process_document_async(
            file_bytes=file_content,
            mime_type=file.content_type,
            filename=file.filename,
            client_id=client_id,
            doc_type=doc_type,
            entered_by=entered_by
        )
        
        task_ids.append({
            "task_id": task_id,
            "filename": file.filename,
            "file_url": f"/files/{unique_filename}"
        })
    
    print(f"✅ [BULK] {len(task_ids)} files queued for concurrent processing")
    
    return {
        "status": "queued",
        "total_files": len(task_ids),
        "tasks": task_ids
    }


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
async def export_tally_xml(
    company_name: str = Query("ABC Traders", description="Exact Tally company name"),
    company_state: str = Query("Delhi", description="Company state for GST")
):
    """
    Export Tally XML with FULL GST compliance.
    
    IMPORTANT: This now uses the GST-compliant generator by default!
    For GSTR-1/GSTR-3B compliance, use /export/tally/gst for more options.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT json_data FROM invoices").fetchall()
    conn.close()
    invoices = [json.loads(row['json_data']) for row in rows if row['json_data']]
    
    # Use GST-compliant generator (NOT legacy)
    xml_content = generate_gst_tally_xml(
        invoices=invoices,
        company_name=company_name,
        voucher_type="Purchase",
        company_state=company_state
    )
    
    file_path = f"tally_export_{int(time.time())}.xml"
    with open(file_path, "wb") as f:
        f.write(xml_content)
    return FileResponse(file_path, filename="tally_gst_import.xml", media_type='application/xml')


# ============================================================================
# GST-COMPLIANT TALLY EXPORT (GOLD STANDARD)
# ============================================================================

@app.post("/export/tally/validate")
async def validate_export_endpoint(
    voucher_type: str = Query("Purchase", description="Voucher type: 'Purchase' or 'Sales'"),
    company_state: str = Query("Delhi", description="Company's state for CGST+SGST vs IGST")
):
    """
    Pre-flight validation check before export.
    
    Returns validation results without generating XML.
    Use this to check for errors before exporting.
    
    5 Critical Rules Checked:
    1. B2B Sales requires valid GSTIN
    2. Tax math accuracy (±0.01 tolerance)
    3. Place of Supply mandatory
    4. CGST/IGST state consistency
    5. Negative tax only for Credit Notes
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT json_data FROM invoices").fetchall()
        invoices = [json.loads(row['json_data']) for row in rows if row['json_data']]
        
        validation = validate_before_export(
            invoices=invoices,
            voucher_type=voucher_type,
            company_state=company_state
        )
        
        return validation
    except Exception as e:
        print(f"❌ Validation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/export/tally/gst")
async def export_gst_tally_xml_endpoint(
    company_name: str = Query("ABC Traders", description="Exact Tally company name (case-sensitive)"),
    voucher_type: str = Query("Purchase", description="Voucher type: 'Purchase' or 'Sales'"),
    company_state: str = Query("Delhi", description="Company's state for CGST+SGST vs IGST"),
    skip_validation: bool = Query(False, description="Skip validation (NOT recommended)")
):
    """
    Export GST-compliant Tally XML with MANDATORY VALIDATION.
    
    ⚠️ VALIDATION LAYER: Export is BLOCKED if any critical rule fails:
    - B2B Sales requires valid GSTIN
    - Tax math must be accurate (±0.01)
    - Place of Supply is mandatory
    - CGST/IGST must match state logic
    - Negative tax only for Credit Notes
    
    Use /export/tally/validate first to check for errors.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT json_data FROM invoices").fetchall()
        invoices = [json.loads(row['json_data']) for row in rows if row['json_data']]
        
        # ===== VALIDATION LAYER (FINAL AUTHORITY) =====
        if not skip_validation:
            validation = validate_before_export(
                invoices=invoices,
                voucher_type=voucher_type,
                company_state=company_state
            )
            
            if not validation["valid"]:
                # BLOCK EXPORT - Return validation errors
                return JSONResponse(
                    status_code=400,
                    content={
                        "error": "VALIDATION_FAILED",
                        "message": f"Export blocked: {validation['summary']['error_count']} validation errors found",
                        "validation": validation
                    }
                )
        
        # ===== GENERATE XML (only if validation passed) =====
        xml_content = generate_gst_tally_xml(
            invoices=invoices,
            company_name=company_name,
            voucher_type=voucher_type,
            company_state=company_state
        )
        
        file_path = f"tally_gst_export_{int(time.time())}.xml"
        with open(file_path, "wb") as f:
            f.write(xml_content)
        
        return FileResponse(
            file_path, 
            filename=f"tally_gst_{voucher_type.lower()}.xml", 
            media_type='application/xml'
        )
    except Exception as e:
        print(f"❌ GST Tally Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/export/tally/gst/preview")
async def preview_gst_tally_xml(
    company_name: str = Query("ABC Traders", description="Exact Tally company name"),
    voucher_type: str = Query("Purchase", description="Voucher type"),
    company_state: str = Query("Delhi", description="Company's state")
):
    """
    Preview the GST-compliant XML without downloading.
    Returns the XML content as formatted text for inspection.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT json_data FROM invoices LIMIT 3").fetchall()
        invoices = [json.loads(row['json_data']) for row in rows if row['json_data']]
        
        xml_content = generate_gst_tally_xml(
            invoices=invoices,
            company_name=company_name,
            voucher_type=voucher_type,
            company_state=company_state
        )
        
        return {
            "status": "success",
            "preview_count": len(invoices),
            "xml_preview": xml_content.decode('utf-8'),
            "message": f"Preview of {len(invoices)} vouchers. Use /export/tally/gst to download full export."
        }
    except Exception as e:
        print(f"❌ GST Preview Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================

@app.get("/invoices/group-by-vendor")
async def get_invoices_grouped_by_vendor():
    """
    Get all invoices grouped by vendor name for bulk ledger assignment.
    Returns vendors with bill counts and current ledger assignments.
    """
    conn = get_db_connection()
    try:
        # Group invoices by vendor
        groups = conn.execute('''
            SELECT 
                vendor_name,
                COUNT(*) as bill_count,
                SUM(grand_total) as total_amount,
                ledger_name,
                group_name,
                MIN(id) as sample_id
            FROM invoices 
            WHERE vendor_name IS NOT NULL AND vendor_name != ''
            GROUP BY vendor_name
            ORDER BY bill_count DESC
        ''').fetchall()
        
        result = []
        for group in groups:
            result.append({
                'vendor_name': group['vendor_name'],
                'bill_count': group['bill_count'],
                'total_amount': group['total_amount'] or 0,
                'current_ledger': group['ledger_name'] or 'Unassigned',
                'current_group': group['group_name'] or 'Unassigned',
                'sample_id': group['sample_id']
            })
        
        # Also get unassigned count
        unassigned = conn.execute('''
            SELECT COUNT(*) as count FROM invoices 
            WHERE vendor_name IS NULL OR vendor_name = '' OR vendor_name = 'Cash Sales'
        ''').fetchone()
        
        return {
            'vendors': result,
            'unassigned_count': unassigned['count'],
            'total_vendors': len(result)
        }
    except Exception as e:
        print(f"❌ Error grouping invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# TALLY SIMULATION - Pre-check bills before export
# ============================================================================

@app.get("/export/tally/simulate")
async def simulate_tally_export():
    """
    Simulate Tally export to catch issues before actual export.
    Returns categorized list of: ready, warnings, and errors.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT id, json_data, vendor_name, grand_total, ledger_name, invoice_date FROM invoices").fetchall()
        
        ready = []
        warnings = []
        errors = []
        
        for row in rows:
            invoice_id = row['id']
            vendor = row['vendor_name'] or 'Unknown'
            total = row['grand_total'] or 0
            ledger = row['ledger_name']
            date = row['invoice_date']
            
            try:
                data = json.loads(row['json_data']) if row['json_data'] else {}
            except:
                data = {}
            
            issues = []
            is_error = False
            
            # Check for critical errors
            if not vendor or vendor in ['Unknown', 'AI Fail', '']:
                issues.append("Missing vendor name")
                is_error = True
            
            if not total or total <= 0:
                issues.append("Invalid total amount")
                is_error = True
            
            if not date:
                issues.append("Missing invoice date")
            
            # Check for warnings
            if not ledger or ledger in ['Unassigned', 'Suspense A/c']:
                issues.append("Ledger not assigned - will use 'Purchase A/c'")
            
            if vendor == 'Cash Sales':
                issues.append("Generic 'Cash Sales' vendor")
            
            gst_no = data.get('gst_no', '')
            if not gst_no:
                issues.append("No GSTIN - ledger won't have GST details")
            
            # Math check
            taxable = data.get('taxable_value', 0) or 0
            cgst = data.get('cgst_amount', 0) or 0
            sgst = data.get('sgst_amount', 0) or 0
            igst = data.get('igst_amount', 0) or 0
            calculated_total = taxable + cgst + sgst + igst
            
            if total > 0 and abs(calculated_total - total) > 1:
                issues.append(f"Math mismatch: {taxable}+taxes = {calculated_total}, but total is {total}")
            
            invoice_summary = {
                'id': invoice_id,
                'vendor_name': vendor,
                'invoice_no': data.get('invoice_no', 'N/A'),
                'grand_total': total,
                'ledger_name': ledger or 'Purchase A/c',
                'issues': issues
            }
            
            if is_error:
                errors.append(invoice_summary)
            elif issues:
                warnings.append(invoice_summary)
            else:
                ready.append(invoice_summary)
        
        return {
            'ready': ready,
            'warnings': warnings,
            'errors': errors,
            'summary': {
                'ready_count': len(ready),
                'warning_count': len(warnings),
                'error_count': len(errors),
                'total': len(rows),
                'ready_amount': sum(r['grand_total'] for r in ready),
                'warning_amount': sum(r['grand_total'] for r in warnings)
            }
        }
    except Exception as e:
        print(f"❌ Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.post("/invoices/bulk-update-ledger")
async def bulk_update_ledger(
    vendor_name: str = None,
    ledger_name: str = None,
    group_name: str = None,
    invoice_ids: List[int] = None
):
    """
    Bulk update ledger and group for all invoices from a specific vendor,
    or for a list of specific invoice IDs.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        updated_count = 0
        
        if invoice_ids:
            # Update specific invoices
            for inv_id in invoice_ids:
                row = cursor.execute("SELECT json_data FROM invoices WHERE id = ?", (inv_id,)).fetchone()
                if row:
                    data = json.loads(row['json_data'])
                    if ledger_name:
                        data['ledger_name'] = ledger_name
                    if group_name:
                        data['group_name'] = group_name
                    cursor.execute(
                        "UPDATE invoices SET json_data = ?, ledger_name = ?, group_name = ? WHERE id = ?",
                        (json.dumps(data), ledger_name, group_name, inv_id)
                    )
                    updated_count += 1
        elif vendor_name:
            # Update all invoices from this vendor
            rows = cursor.execute(
                "SELECT id, json_data FROM invoices WHERE vendor_name = ?", 
                (vendor_name,)
            ).fetchall()
            
            for row in rows:
                data = json.loads(row['json_data'])
                if ledger_name:
                    data['ledger_name'] = ledger_name
                if group_name:
                    data['group_name'] = group_name
                cursor.execute(
                    "UPDATE invoices SET json_data = ?, ledger_name = ?, group_name = ? WHERE id = ?",
                    (json.dumps(data), ledger_name, group_name, row['id'])
                )
                updated_count += 1
        else:
            raise HTTPException(status_code=400, detail="Provide vendor_name or invoice_ids")
        
        conn.commit()
        print(f"✅ Bulk updated {updated_count} invoices with ledger: {ledger_name}")
        
        return {
            'status': 'success',
            'updated_count': updated_count,
            'ledger_name': ledger_name,
            'group_name': group_name
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Bulk update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Standard Tally ledger options
TALLY_LEDGERS = [
    {'name': 'Purchase Accounts', 'group': 'Purchase Accounts'},
    {'name': 'Fuel Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Motor Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Office Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Telephone Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Electricity Charges', 'group': 'Indirect Expenses'},
    {'name': 'Rent Paid', 'group': 'Indirect Expenses'},
    {'name': 'Repairs & Maintenance', 'group': 'Indirect Expenses'},
    {'name': 'Professional Charges', 'group': 'Indirect Expenses'},
    {'name': 'Printing & Stationery', 'group': 'Indirect Expenses'},
    {'name': 'Travelling Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Freight Inward', 'group': 'Direct Expenses'},
    {'name': 'Sundry Creditors', 'group': 'Current Liabilities'},
    {'name': 'Cash Sales', 'group': 'Sales Accounts'},
    {'name': 'Software Expenses', 'group': 'Indirect Expenses'},
    {'name': 'Bank Charges', 'group': 'Indirect Expenses'},
    {'name': 'Suspense A/c', 'group': 'Suspense A/c'}
]

@app.get("/tally/ledgers")
async def get_tally_ledgers():
    """Get list of standard Tally ledgers for dropdown"""
    return TALLY_LEDGERS


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

@app.get("/clients/{client_id}/stats")
async def get_client_stats(client_id: int):
    """Get client statistics for profile page"""
    conn = get_db_connection()
    try:
        # Total documents (from both tables)
        doc_count = conn.execute(
            "SELECT COUNT(*) as count FROM documents WHERE client_id = ?", (client_id,)
        ).fetchone()['count']
        invoice_count = conn.execute(
            "SELECT COUNT(*) as count FROM invoices WHERE client_id = ?", (client_id,)
        ).fetchone()['count']
        
        # Pending review
        pending = conn.execute(
            "SELECT COUNT(*) as count FROM documents WHERE client_id = ? AND review_status = 'pending'",
            (client_id,)
        ).fetchone()['count']
        
        # Last activity
        last_doc = conn.execute(
            "SELECT upload_date FROM documents WHERE client_id = ? ORDER BY upload_date DESC LIMIT 1",
            (client_id,)
        ).fetchone()
        last_inv = conn.execute(
            "SELECT upload_date FROM invoices WHERE client_id = ? ORDER BY upload_date DESC LIMIT 1",
            (client_id,)
        ).fetchone()
        
        last_activity = None
        if last_doc:
            last_activity = last_doc['upload_date']
        if last_inv and (not last_activity or last_inv['upload_date'] > last_activity):
            last_activity = last_inv['upload_date']
        
        # Format last activity
        if last_activity:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                last_activity = dt.strftime('%d %b %Y')
            except:
                pass
        
        return {
            "totalBills": doc_count + invoice_count,
            "pending": pending,
            "lastActivity": last_activity or "No activity"
        }
    except Exception as e:
        print(f"❌ Error fetching client stats: {e}")
        return {"totalBills": 0, "pending": 0, "lastActivity": "N/A"}
    finally:
        conn.close()

@app.post("/clients/{client_id}/generate-invite")
async def generate_client_invite(client_id: int):
    """Generate a self-service invite link for client"""
    import secrets
    conn = get_db_connection()
    try:
        # Check client exists
        client = conn.execute("SELECT company_name FROM clients WHERE id = ?", (client_id,)).fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Generate token
        token = secrets.token_urlsafe(16)
        
        # Store token (you could add an onboard_tokens table, but for simplicity we'll embed in response)
        # In production, store this in database
        
        link = f"http://localhost:5173/onboard/{token}"
        print(f"🔗 Generated invite link for {client['company_name']}: {link}")
        
        return {
            "link": link,
            "token": token,
            "client_name": client['company_name'],
            "expires_in": "7 days"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating invite: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ============================================================================
# VENDOR SPY - GST Status Verification
# ============================================================================

@app.get("/vendor/verify-gst/{gstin}")
async def verify_vendor_gst(gstin: str):
    """
    Check if a vendor's GSTIN is active using pattern analysis.
    In production, this would call the actual GST API.
    Returns: active/cancelled/not_found status with details
    """
    print(f"🕵️ Vendor Spy: Checking GSTIN {gstin}")
    
    if not gstin or len(gstin) != 15:
        return {
            "gstin": gstin,
            "status": "invalid",
            "message": "Invalid GSTIN format - must be 15 characters",
            "valid": False
        }
    
    # Validate GSTIN format: 2 digits (state) + 10 chars (PAN) + 1 digit + Z + 1 checksum
    import re
    gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$'
    
    if not re.match(gstin_pattern, gstin.upper()):
        return {
            "gstin": gstin,
            "status": "invalid",
            "message": "GSTIN format is incorrect",
            "valid": False
        }
    
    # Extract state code and determine state
    state_code = gstin[:2]
    state_name = get_state_from_code(state_code)
    
    # Extract PAN from GSTIN (characters 3-12)
    pan = gstin[2:12]
    
    # Check database for any stored vendor info
    conn = get_db_connection()
    try:
        vendor = conn.execute(
            "SELECT id, vendor_name, gstin FROM vendors WHERE gstin = ?", 
            (gstin.upper(),)
        ).fetchone()
        
        # In production, call actual GST API here
        # For demo, we'll simulate based on patterns
        
        # Simulate some cancelled GSTINs (for demo)
        cancelled_patterns = ['AAAA', 'ZZZZ', '0000']
        is_cancelled = any(p in gstin.upper() for p in cancelled_patterns)
        
        return {
            "gstin": gstin.upper(),
            "status": "cancelled" if is_cancelled else "active",
            "valid": not is_cancelled,
            "state": state_name or "Unknown",
            "pan": pan,
            "vendor_name": vendor['vendor_name'] if vendor else None,
            "in_database": vendor is not None,
            "message": "⚠️ This GSTIN appears to be CANCELLED!" if is_cancelled else "✅ GSTIN is Active",
            "itc_risk": is_cancelled,
            "last_checked": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"❌ Error verifying GSTIN: {e}")
        return {
            "gstin": gstin,
            "status": "error",
            "valid": False,
            "message": f"Error checking GSTIN: {str(e)}"
        }
    finally:
        conn.close()

@app.post("/vendor/bulk-verify")
async def bulk_verify_vendors():
    """
    Verify all vendors with GSTIN in the database.
    Returns list of vendors with their GST status.
    """
    conn = get_db_connection()
    try:
        vendors = conn.execute(
            "SELECT id, vendor_name, gstin FROM vendors WHERE gstin IS NOT NULL AND gstin != ''"
        ).fetchall()
        
        results = []
        for vendor in vendors:
            result = await verify_vendor_gst(vendor['gstin'])
            result['vendor_id'] = vendor['id']
            result['vendor_name'] = vendor['vendor_name']
            results.append(result)
        
        # Summary
        active_count = sum(1 for r in results if r['status'] == 'active')
        cancelled_count = sum(1 for r in results if r['status'] == 'cancelled')
        invalid_count = sum(1 for r in results if r['status'] == 'invalid')
        
        return {
            "vendors": results,
            "summary": {
                "total": len(results),
                "active": active_count,
                "cancelled": cancelled_count,
                "invalid": invalid_count
            }
        }
    finally:
        conn.close()

# ============================================================================
# LEGAL EAGLE - GST Notice Responder System
# ============================================================================

# GST Notice Types and their sections
GST_NOTICE_TYPES = {
    'ASMT-10': {'name': 'Scrutiny Notice', 'section': 'Section 61', 'severity': 'medium'},
    'DRC-01': {'name': 'Demand Notice', 'section': 'Section 73/74', 'severity': 'high'},
    'DRC-07': {'name': 'Recovery Order', 'section': 'Section 79', 'severity': 'critical'},
    'REG-17': {'name': 'Show Cause Notice (Registration)', 'section': 'Section 29', 'severity': 'high'},
    'REG-31': {'name': 'Registration Cancellation Order', 'section': 'Section 29', 'severity': 'critical'},
    'MOV-09': {'name': 'E-Way Bill Notice', 'section': 'Section 129', 'severity': 'medium'},
    'RFD-08': {'name': 'Refund Notice', 'section': 'Section 54', 'severity': 'low'},
    'GSTR-3A': {'name': 'Default Notice', 'section': 'Section 46', 'severity': 'medium'}
}

@app.post("/legal/analyze-notice")
async def analyze_legal_notice(
    file: UploadFile = File(...),
    client_id: int = None
):
    """
    Analyze a GST notice using AI and draft a formal reply.
    1. Extracts notice type, deadline, issue
    2. Drafts professional reply citing GST sections
    """
    print(f"⚖️ Legal Eagle: Analyzing notice {file.filename}")
    
    # Save the file
    import uuid
    unique_filename = f"notice_{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    file_content = await file.read()
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Extract text using AI
    try:
        if GEN_AI_AVAILABLE and file.content_type.startswith('image/'):
            import base64
            b64_data = base64.b64encode(file_content).decode('utf-8')
            
            # First: Use Qwen2.5-VL to extract notice details from image
            extraction_prompt = """Analyze this GST Notice document and extract:
1. NOTICE_TYPE: The form number (e.g., ASMT-10, DRC-01, REG-17)
2. NOTICE_DATE: The date on the notice
3. DUE_DATE: The deadline to respond
4. ISSUE: Brief description of the issue/violation alleged
5. DEMAND_AMOUNT: Any tax/penalty amount demanded (if any)
6. PERIOD: The tax period this relates to (e.g., Jan 2026)
7. OFFICER_NAME: Name of issuing officer
8. ARN/DIN: Reference number

Return as JSON only, no markdown."""
            
            print("🔍 Extracting notice details with Qwen2.5-VL...")
            extraction_response = call_vision_model(b64_data, extraction_prompt, file.content_type)
            
            # Parse extraction response
            extraction_text = clean_json_response(extraction_response)
            
            try:
                notice_details = json.loads(extraction_text)
            except:
                notice_details = {
                    'NOTICE_TYPE': 'Unknown',
                    'ISSUE': extraction_text[:200]
                }
            
            # Get notice metadata
            notice_type = notice_details.get('NOTICE_TYPE', 'Unknown')
            notice_info = GST_NOTICE_TYPES.get(notice_type, {'name': 'Unknown Notice', 'section': 'N/A', 'severity': 'medium'})
            
            # Second: Use Hermes 3 405B to draft the reply (logic/reasoning task)
            reply_prompt = f"""You are a senior CA drafting a formal reply to a GST notice.

Notice Type: {notice_type} - {notice_info['name']}
Issue: {notice_details.get('ISSUE', 'Not specified')}
Period: {notice_details.get('PERIOD', 'Not specified')}

Draft a professional reply that:
1. Begins with "Respected Sir/Madam,"
2. References the notice number and date
3. Addresses each point in the notice
4. Cites relevant GST Section ({notice_info['section']}) and Rules
5. Provides a clear defense/explanation
6. Ends with "Yours faithfully,"

Keep the tone formal and respectful. Use proper legal formatting."""
            
            print("📝 Drafting reply with Hermes 3 405B...")
            draft_reply = call_logic_model(reply_prompt)

            
        else:
            # Fallback for non-image files
            notice_details = {
                'NOTICE_TYPE': 'Upload image of notice',
                'ISSUE': 'Unable to analyze PDF directly. Please upload as image.'
            }
            draft_reply = "Please upload the notice as an image (JPG/PNG) for AI analysis."
            notice_type = 'Unknown'
            notice_info = {'name': 'Unknown', 'section': 'N/A', 'severity': 'medium'}
        
        # Store notice in database (create notices table if not exists)
        conn = get_db_connection()
        try:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS legal_notices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    notice_type TEXT,
                    notice_date TEXT,
                    due_date TEXT,
                    issue_summary TEXT,
                    demand_amount REAL,
                    period TEXT,
                    officer_name TEXT,
                    reference_no TEXT,
                    file_path TEXT,
                    status TEXT DEFAULT 'pending',
                    draft_reply TEXT,
                    final_reply TEXT,
                    submitted_on TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO legal_notices (
                    client_id, notice_type, notice_date, due_date, issue_summary,
                    demand_amount, period, officer_name, reference_no, file_path,
                    draft_reply, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                client_id,
                notice_type,
                notice_details.get('NOTICE_DATE'),
                notice_details.get('DUE_DATE'),
                notice_details.get('ISSUE'),
                notice_details.get('DEMAND_AMOUNT'),
                notice_details.get('PERIOD'),
                notice_details.get('OFFICER_NAME'),
                notice_details.get('ARN/DIN'),
                file_path,
                draft_reply,
                'pending'
            ))
            conn.commit()
            notice_id = cursor.lastrowid
        finally:
            conn.close()
        
        return {
            "id": notice_id,
            "notice_type": notice_type,
            "notice_name": notice_info['name'],
            "section": notice_info['section'],
            "severity": notice_info['severity'],
            "details": notice_details,
            "draft_reply": draft_reply,
            "file_path": file_path,
            "status": "analyzed"
        }
        
    except Exception as e:
        print(f"❌ Legal Eagle error: {e}")
        return {
            "error": str(e),
            "status": "failed"
        }

@app.get("/legal/notices")
async def get_legal_notices(client_id: int = None):
    """Get all legal notices, optionally filtered by client"""
    conn = get_db_connection()
    try:
        # Create table if not exists
        conn.execute('''
            CREATE TABLE IF NOT EXISTS legal_notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER,
                notice_type TEXT,
                notice_date TEXT,
                due_date TEXT,
                issue_summary TEXT,
                demand_amount REAL,
                period TEXT,
                officer_name TEXT,
                reference_no TEXT,
                file_path TEXT,
                status TEXT DEFAULT 'pending',
                draft_reply TEXT,
                final_reply TEXT,
                submitted_on TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        if client_id:
            notices = conn.execute(
                "SELECT * FROM legal_notices WHERE client_id = ? ORDER BY created_at DESC",
                (client_id,)
            ).fetchall()
        else:
            notices = conn.execute(
                "SELECT * FROM legal_notices ORDER BY created_at DESC"
            ).fetchall()
        
        result = []
        for n in notices:
            notice_info = GST_NOTICE_TYPES.get(n['notice_type'], {'name': 'Unknown', 'section': 'N/A', 'severity': 'medium'})
            result.append({
                "id": n['id'],
                "client_id": n['client_id'],
                "notice_type": n['notice_type'],
                "notice_name": notice_info['name'],
                "severity": notice_info['severity'],
                "notice_date": n['notice_date'],
                "due_date": n['due_date'],
                "issue_summary": n['issue_summary'],
                "demand_amount": n['demand_amount'],
                "status": n['status'],
                "created_at": n['created_at']
            })
        
        # Summary
        pending_count = len([n for n in result if n['status'] == 'pending'])
        urgent_count = len([n for n in result if n['severity'] in ['high', 'critical'] and n['status'] == 'pending'])
        
        return {
            "notices": result,
            "summary": {
                "total": len(result),
                "pending": pending_count,
                "urgent": urgent_count
            }
        }
    finally:
        conn.close()

@app.get("/legal/notice/{notice_id}")
async def get_notice_detail(notice_id: int):
    """Get detailed view of a specific notice including draft reply"""
    conn = get_db_connection()
    try:
        notice = conn.execute(
            "SELECT * FROM legal_notices WHERE id = ?",
            (notice_id,)
        ).fetchone()
        
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        
        notice_info = GST_NOTICE_TYPES.get(notice['notice_type'], {'name': 'Unknown', 'section': 'N/A', 'severity': 'medium'})
        
        return {
            "id": notice['id'],
            "client_id": notice['client_id'],
            "notice_type": notice['notice_type'],
            "notice_name": notice_info['name'],
            "section": notice_info['section'],
            "severity": notice_info['severity'],
            "notice_date": notice['notice_date'],
            "due_date": notice['due_date'],
            "issue_summary": notice['issue_summary'],
            "demand_amount": notice['demand_amount'],
            "period": notice['period'],
            "officer_name": notice['officer_name'],
            "reference_no": notice['reference_no'],
            "draft_reply": notice['draft_reply'],
            "final_reply": notice['final_reply'],
            "status": notice['status'],
            "file_path": notice['file_path']
        }
    finally:
        conn.close()

@app.put("/legal/notice/{notice_id}")
async def update_notice(notice_id: int, final_reply: str = None, status: str = None):
    """Update notice with final reply or status change"""
    conn = get_db_connection()
    try:
        updates = []
        params = []
        
        if final_reply:
            updates.append("final_reply = ?")
            params.append(final_reply)
        
        if status:
            updates.append("status = ?")
            params.append(status)
            if status == 'submitted':
                updates.append("submitted_on = ?")
                params.append(datetime.now().isoformat())
        
        if updates:
            params.append(notice_id)
            conn.execute(
                f"UPDATE legal_notices SET {', '.join(updates)} WHERE id = ?",
                params
            )
            conn.commit()
        
        return {"status": "updated", "notice_id": notice_id}
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

        # Use Hermes 3 405B for HSN/ledger classification (reasoning task)
        print("🏷️ Classifying with Hermes 3 405B...")
        response = call_logic_model(prompt)
        
        # Extract JSON from response
        text = clean_json_response(response)
        result = json.loads(text)
        return result
    
    except Exception as e:
        print(f"⚠️ Hermes 3 classification failed: {e}")
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
        
        # Use Hermes 3 405B for notice analysis (legal reasoning task)
        print("📋 Analyzing notice with Hermes 3 405B...")
        ai_response = call_logic_model(prompt)
        ai_response = ai_response.replace("```json", "").replace("```", "").strip()
        
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

# =============================================================================
# GST INTELLIGENCE MODULE - NEWS AGGREGATOR API
# =============================================================================

@app.get("/api/gst-news")
async def get_gst_news():
    """
    Fetch GST news from multiple sources:
    1. Google News RSS
    2. Economic Times Policy
    3. Taxscan Expert Analysis
    
    Returns filtered, deduplicated, and sorted news items.
    """
    try:
        from gst_engine import fetch_gst_news
        news = fetch_gst_news()
        return {"success": True, "count": len(news), "news": news}
    except Exception as e:
        print(f"❌ GST News API Error: {e}")
        return {"success": False, "count": 0, "news": [], "error": str(e)}

@app.get("/api/gst-news/ai-summary")
async def get_gst_news_with_ai():
    """
    Fetch GST news with AI-powered summary.
    
    Returns:
    - news: List of all news items
    - ai_summary: AI-generated summary with:
      - daily_digest: Overview of key developments
      - critical_alerts: Urgent items requiring action
      - rate_changes: Any GST rate modifications
      - compliance_reminders: Filing deadlines
      - news_summaries: Plain-English explanations
    """
    try:
        from gst_engine import fetch_gst_news_with_ai_summary
        result = fetch_gst_news_with_ai_summary()
        return {
            "success": True, 
            "count": result["total_count"],
            "high_impact_count": result["high_impact_count"],
            "news": result["news"],
            "ai_summary": result["ai_summary"]
        }
    except Exception as e:
        print(f"❌ GST News AI Summary Error: {e}")
        return {
            "success": False, 
            "count": 0, 
            "news": [], 
            "ai_summary": None,
            "error": str(e)
        }


