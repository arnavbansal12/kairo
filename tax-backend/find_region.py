
import psycopg2
import sys

project_id = "otwqwtjojtsbisfeigyt"
password = "Arnavbansal%402007"

regions = [
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-eu-west-1.pooler.supabase.com",
    "aws-0-eu-west-2.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
    "aws-0-ap-northeast-1.pooler.supabase.com",
    "aws-0-ap-northeast-2.pooler.supabase.com",
    "aws-0-ap-south-1.pooler.supabase.com",
    "aws-0-sa-east-1.pooler.supabase.com",
    "aws-0-ca-central-1.pooler.supabase.com"
]

print(f"🔍 Searching for project {project_id} across {len(regions)} regions...")

for host in regions:
    # Transaction pooler string (port 6543)
    conn_str = f"postgresql://postgres.{project_id}:{password}@{host}:6543/postgres"
    
    try:
        print(f"Testing {host}...", end=" ")
        conn = psycopg2.connect(conn_str, connect_timeout=3)
        print("✅ SUCCESS!")
        print(f"FOUND HOST: {host}")
        conn.close()
        sys.exit(0)
    except psycopg2.OperationalError as e:
        msg = str(e)
        if "Tenant or user not found" in msg:
            print("❌ Tenant not found")
        elif "password authentication failed" in msg:
            print("✅ FOUND! (Password error means tenant exists)")
            print(f"FOUND HOST: {host}")
            sys.exit(0)
        else:
            print(f"⚠️ Error: {msg}")
            # If we get a timeout or other error, it might still be the right one, implies network reachability
