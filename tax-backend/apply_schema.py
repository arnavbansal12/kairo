
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get DB URL
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("❌ Error: DATABASE_URL not found in .env")
    exit(1)

# Read SQL Schema
schema_path = "../supabase_schema.sql"
if not os.path.exists(schema_path):
    print(f"❌ Error: Schema file not found at {schema_path}")
    exit(1)

with open(schema_path, "r") as f:
    sql_script = f.read()

try:
    print("🔌 Connecting to Supabase Postgres...")
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    print("🚀 Executing schema script...")
    cursor.execute(sql_script)
    conn.commit()
    
    print("✅ Schema applied successfully!")
    
    # Verify tables
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    tables = cursor.fetchall()
    print("\n📊 Tables in public schema:")
    for table in tables:
        print(f"   - {table[0]}")
        
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"\n❌ Migration Error: {e}")
