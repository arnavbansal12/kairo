
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

try:
    supabase: Client = create_client(url, key)
    response = supabase.table("users").select("count", count="exact").execute()
    print(f"✅ Successfully connected to Supabase! URL: {url}")
    # print(f"Response: {response}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
