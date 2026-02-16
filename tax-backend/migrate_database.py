"""
Database migration for multi-tenant architecture
Adds user_id columns to enable data isolation between users
"""

import sqlite3

def migrate_database_for_multi_tenancy(db_path="tax_data.db"):
    """
    Add user_id columns to all data tables to enable proper multi-tenant isolation.
    
    This migration:
    1. Adds user_id column to clients table
    2. Adds user_id column to invoices table  
    3. Adds user_id column to documents table
    4. Creates indexes for better query performance
    5. Sets default user_id = 1 for existing data
    """
    print("\n" + "="*60)
    print("🔧 STARTING DATABASE MIGRATION FOR MULTI-TENANCY")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # =====================================================================
        # MIGRATE CLIENTS TABLE
        # =====================================================================
       
        print("\n📦 Checking clients table...")
        cursor.execute("PRAGMA table_info(clients)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'user_id' not in columns:
            print("   ⚙️  Adding user_id column to clients...")
            cursor.execute("ALTER TABLE clients ADD COLUMN user_id INTEGER DEFAULT 1")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id)")
            print("   ✅ Clients table migrated successfully!")
        else:
            print("   ℹ️  user_id column already exists in clients")
        
        # =====================================================================
        # MIGRATE INVOICES TABLE
        # =====================================================================
        
        print("\n📦 Checking invoices table...")
        cursor.execute("PRAGMA table_info(invoices)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'user_id' not in columns:
            print("   ⚙️  Adding user_id column to invoices...")
            cursor.execute("ALTER TABLE invoices ADD COLUMN user_id INTEGER DEFAULT 1")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)")
            print("   ✅ Invoices table migrated successfully!")
        else:
            print("   ℹ️  user_id column already exists in invoices")
        
        # =====================================================================
        # MIGRATE DOCUMENTS TABLE
        # =====================================================================
        
        print("\n📦 Checking documents table...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(documents)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'user_id' not in columns:
                print("   ⚙️  Adding user_id column to documents...")
                cursor.execute("ALTER TABLE documents ADD COLUMN user_id INTEGER DEFAULT 1")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id)")
                print("   ✅ Documents table migrated successfully!")
            else:
                print("   ℹ️  user_id column already exists in documents")
        else:
            print("   ℹ️  Documents table doesn't exist yet (will be created with user_id)")
        
        # =====================================================================
        # COMMIT CHANGES
        # =====================================================================
        
        conn.commit()
        
        # =====================================================================
        # VERIFICATION
        # =====================================================================
        
        print("\n📊 Verifying migration...")
        
        # Count records per table
        cursor.execute("SELECT COUNT(*) FROM clients")
        client_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM invoices")
        invoice_count = cursor.fetchone()[0]
        
        print(f"   📁 Clients: {client_count} records (all assigned to user_id=1)")
        print(f"   📄 Invoices: {invoice_count} records (all assigned to user_id=1)")
        
        print("\n" + "="*60)
        print("✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\n💡 Next steps:")
        print("   1. All existing data is now owned by user_id = 1")
        print("   2. New users will get their own isolated data")
        print("   3. API endpoints must be updated to filter by user_id")
        print("\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


if __name__ == "__main__":
    # Run migration
    success = migrate_database_for_multi_tenancy()
    
    if success:
        print("✅ Migration script completed successfully!")
    else:
        print("❌ Migration script failed!")
