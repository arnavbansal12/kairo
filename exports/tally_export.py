import pandas as pd
import google.generativeai as genai
import time

# --- CONFIGURATION ---
API_KEY = "AIzaSyBX_quyfpaIubgmp6e9BJxzdrSiglrNFmE"
genai.configure(api_key=API_KEY)

# --- 1. DEFINE YOUR TALLY DATA (FROM SCREENSHOTS) ---
# I have extracted these text values directly from your uploaded images.
VALID_LEDGERS = [
    "SALE 0%",
    "SALE EX U.P 12% RGD",
    "SALE EX U.P 12% URGD",
    "SALE EX U.P 18% URGD",
    "SALE U.P 12% RGD",
    "SALE U.P 12% URGD",
    "SALE U.P 18% RGD",
    "SALE U.P 18% URGD",
    "SALE UP 5% RGD",
    "SALE UP 5% URGD"
]

VALID_GROUPS = [
    "Sales Accounts",
    "Sundry Debtors",
    "Sundry Creditors",
    "Bank Accounts",
    "Direct Expenses",
    "Indirect Expenses",
    "Duties & Taxes"
]

# --- 2. AI CLASSIFICATION FUNCTION ---
def get_tally_details_from_ai(description, amount):
    """
    Uses Gemini to intelligently select the correct Ledger, Group, and HSN
    based on the transaction description.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    You are an accounting assistant for an Indian business using Tally.
    
    Task: Map the transaction description '{description}' (Amount: {amount}) to the correct Tally Ledger and Group.
    
    Constraints:
    1. 'Ledger Name' MUST be chosen strictly from this list: {VALID_LEDGERS}
    2. 'Parent Group' MUST be chosen strictly from this list: {VALID_GROUPS}
    3. Provide a valid 4-6 digit HSN code for this item/service.
    
    Logic: 
    - If it looks like a local sale (within UP), use 'SALE U.P...'. 
    - If it looks like an interstate sale, use 'SALE EX U.P...'.
    - Estimate GST rate (5%, 12%, 18%) based on the item type.
    - If unsure, default to 'SALE U.P 18% RGD' and 'Sales Accounts'.

    Output format: Return ONLY a string in this format: LedgerName|ParentGroup|HSN
    Example: SALE U.P 18% RGD|Sales Accounts|8517
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean up response
        return response.text.strip()
    except Exception as e:
        print(f"AI Error: {e}")
        return "SALE U.P 18% RGD|Sales Accounts|0000"

# --- 3. MAIN DATA PROCESSING ---
# Example Input Data (Replace this with your actual app data source)
data = [
    {"Date": "2026-01-03", "Party": "Shivansh Bura", "Item": "Gaming Laptop", "Amount": 85000},
    {"Date": "2026-01-03", "Party": "Rahul Traders", "Item": "Cotton Fabric", "Amount": 12000},
    {"Date": "2026-01-04", "Party": "Global Tech", "Item": "Software Service", "Amount": 5000}
]

processed_rows = []

print("Processing rows with AI...")

for row in data:
    # 1. Call AI to get classification
    ai_result = get_tally_details_from_ai(row['Item'], row['Amount'])
    ledger, group, hsn = ai_result.split('|')
    
    # 2. Structure the row strictly for Tally Import
    # Note: Tally usually requires 'Voucher Type', 'Voucher Date', etc.
    new_row = {
        "Voucher Date": row['Date'],
        "Voucher Type": "Sales",  # Defaulting to Sales based on your ledgers
        "Party Name": row['Party'],
        "Item Description": row['Item'],
        "HSN/SAC": hsn.strip(),
        "Amount": row['Amount'],
        "Ledger Name": ledger.strip(),  # The column you asked for
        "Parent Group": group.strip()   # The column you asked for
    }
    processed_rows.append(new_row)
    
    # Sleep briefly to avoid hitting API rate limits if processing many rows
    time.sleep(1) 

# --- 4. EXPORT TO EXCEL ---
df = pd.DataFrame(processed_rows)

# Reorder columns to ensure 'Ledger Name' and 'Parent Group' are prominent
columns_order = ["Voucher Date", "Voucher Type", "Party Name", "Item Description", "HSN/SAC", "Ledger Name", "Parent Group", "Amount"]
df = df[columns_order]

output_filename = "Tally_Import_File_Fixed.xlsx"
df.to_excel(output_filename, index=False)

print(f"Success! File '{output_filename}' generated.")
print("Instructions: Open Tally > Import > Transactions > Select this file > Map columns manually if asked.")