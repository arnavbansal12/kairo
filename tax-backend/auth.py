# auth.py
# -----------------------------------------------------------------------------
# ENTERPRISE AUTHENTICATION MODULE - JWT Token Based
# Secure user authentication with password hashing and session management
# -----------------------------------------------------------------------------

import hashlib
import secrets
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import sqlite3

# =============================================================================
# CONFIGURATION
# =============================================================================

# JWT Secret Key (in production, use environment variable)
JWT_SECRET = "taxai_enterprise_secret_key_2026_very_secure"
TOKEN_EXPIRY_HOURS = 24 * 7  # 1 week

# =============================================================================
# PASSWORD HASHING (Simple but secure)
# =============================================================================

def hash_password(password: str, salt: str = None) -> tuple:
    """
    Hash password using SHA-256 with salt.
    Returns (hashed_password, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)
    
    salted = f"{salt}{password}"
    hashed = hashlib.sha256(salted.encode()).hexdigest()
    
    return f"{salt}:{hashed}", salt


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, expected_hash = stored_hash.split(":")
        salted = f"{salt}{password}"
        computed_hash = hashlib.sha256(salted.encode()).hexdigest()
        return computed_hash == expected_hash
    except:
        return False


# =============================================================================
# JWT TOKEN GENERATION (Simple implementation)
# =============================================================================

def generate_token(user_id: int, username: str, email: str) -> str:
    """
    Generate a simple JWT-like token.
    Format: base64(payload).signature
    """
    payload = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "exp": int(time.time()) + (TOKEN_EXPIRY_HOURS * 3600),
        "iat": int(time.time())
    }
    
    # Encode payload
    import base64
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    
    # Create signature
    signature_input = f"{payload_b64}.{JWT_SECRET}"
    signature = hashlib.sha256(signature_input.encode()).hexdigest()[:32]
    
    return f"{payload_b64}.{signature}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify token and return payload if valid.
    Returns None if invalid or expired.
    """
    try:
        import base64
        
        parts = token.split(".")
        if len(parts) != 2:
            return None
        
        payload_b64, provided_signature = parts
        
        # Verify signature
        signature_input = f"{payload_b64}.{JWT_SECRET}"
        expected_signature = hashlib.sha256(signature_input.encode()).hexdigest()[:32]
        
        if provided_signature != expected_signature:
            return None
        
        # Decode payload
        payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        payload = json.loads(payload_json)
        
        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            return None
        
        return payload
        
    except Exception as e:
        print(f"Token verification error: {e}")
        return None


# =============================================================================
# DATABASE HELPERS
# =============================================================================

def init_users_table(db_path: str = "tax_data.db"):
    """Create users table if it doesn't exist and migrate if needed."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    table_exists = cursor.fetchone() is not None
    
    if table_exists:
        # Check if we need to migrate (add missing columns)
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'display_name' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT 'User'")
            print("✅ Added display_name column to users table")
        
        if 'avatar_url' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL")
            print("✅ Added avatar_url column to users table")
        
        if 'preferences' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'")
            print("✅ Added preferences column to users table")
        
        if 'last_login' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP DEFAULT NULL")
            print("✅ Added last_login column to users table")
        
        if 'whatsapp_phone' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN whatsapp_phone TEXT UNIQUE DEFAULT NULL")
            print("✅ Added whatsapp_phone column to users table")
    else:
        # Create fresh table
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT DEFAULT 'User',
                avatar_url TEXT DEFAULT NULL,
                preferences TEXT DEFAULT '{"darkMode": true}',
                whatsapp_phone TEXT UNIQUE DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT NULL
            )
        """)
        print("✅ Created users table")
    
    # Create default admin user if no users exist (for testing)
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        default_password, _ = hash_password("password123")
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, display_name, preferences)
            VALUES (?, ?, ?, ?, ?)
        """, ("rahul", "rahul@example.com", default_password, "Rahul", 
              '{"darkMode": true, "notifications": {"email": true, "desktop": false}}'))
        print("✅ Created default user: rahul@example.com / password123")
    
    conn.commit()
    conn.close()


def get_user_by_email(email: str, db_path: str = "tax_data.db") -> Optional[Dict]:
    """Get user by email address."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: int, db_path: str = "tax_data.db") -> Optional[Dict]:
    """Get user by ID."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def create_user(username: str, email: str, password: str, display_name: str = None, 
                db_path: str = "tax_data.db") -> Optional[Dict]:
    """Create a new user account."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        password_hash, _ = hash_password(password)
        display = display_name or username.title()
        
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES (?, ?, ?, ?)
        """, (username.lower(), email.lower(), password_hash, display))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "id": user_id,
            "username": username.lower(),
            "email": email.lower(),
            "display_name": display
        }
        
    except sqlite3.IntegrityError as e:
        conn.close()
        if "email" in str(e):
            raise ValueError("Email already registered")
        elif "username" in str(e):
            raise ValueError("Username already taken")
        raise ValueError("Registration failed")


def update_user_preferences(user_id: int, preferences: Dict, db_path: str = "tax_data.db") -> bool:
    """Update user preferences (dark mode, notifications, etc.)."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        prefs_json = json.dumps(preferences)
        cursor.execute("UPDATE users SET preferences = ? WHERE id = ?", (prefs_json, user_id))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        conn.close()
        print(f"Error updating preferences: {e}")
        return False


def update_last_login(user_id: int, db_path: str = "tax_data.db"):
    """Update user's last login timestamp."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


# =============================================================================
# WHATSAPP INTEGRATION FUNCTIONS
# =============================================================================

def get_user_by_whatsapp(phone: str, db_path: str = "tax_data.db") -> Optional[Dict]:
    """Get user by WhatsApp phone number."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Normalize phone number (remove spaces, dashes, etc.)
    normalized_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    cursor.execute("SELECT * FROM users WHERE whatsapp_phone = ?", (normalized_phone,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def update_user_whatsapp(user_id: int, phone: str, db_path: str = "tax_data.db") -> bool:
    """Link WhatsApp phone number to user account."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Normalize phone number
        normalized_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        cursor.execute("UPDATE users SET whatsapp_phone = ? WHERE id = ?", (normalized_phone, user_id))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    except sqlite3.IntegrityError:
        conn.close()
        raise ValueError("WhatsApp phone number already linked to another account")
    except Exception as e:
        conn.close()
        print(f"Error updating WhatsApp phone: {e}")
        return False


def remove_user_whatsapp(user_id: int, db_path: str = "tax_data.db") -> bool:
    """Remove WhatsApp phone number from user account."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE users SET whatsapp_phone = NULL WHERE id = ?", (user_id,))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        conn.close()
        print(f"Error removing WhatsApp phone: {e}")
        return False



# =============================================================================
# AUTHENTICATION FUNCTIONS
# =============================================================================

def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """
    Authenticate user with email and password.
    Returns user dict with token if successful, None otherwise.
    """
    user = get_user_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    # Update last login
    update_last_login(user["id"])
    
    # Generate token
    token = generate_token(user["id"], user["username"], user["email"])
    
    # Parse preferences
    try:
        preferences = json.loads(user.get("preferences", "{}"))
    except:
        preferences = {}
    
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "preferences": preferences,
        "token": token
    }


def get_current_user(token: str) -> Optional[Dict]:
    """Get current user from token."""
    payload = verify_token(token)
    
    if not payload:
        return None
    
    user = get_user_by_id(payload["user_id"])
    
    if not user:
        return None
    
    # Parse preferences
    try:
        preferences = json.loads(user.get("preferences", "{}"))
    except:
        preferences = {}
    
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "display_name": user["display_name"],
        "avatar_url": user.get("avatar_url"),
        "preferences": preferences
    }


# =============================================================================
# INITIALIZATION
# =============================================================================

# Initialize users table on module import
try:
    init_users_table()
except Exception as e:
    print(f"Warning: Could not initialize users table: {e}")


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("AUTH MODULE TEST")
    print("="*60)
    
    # Test password hashing
    print("\n1. Testing password hashing...")
    hashed, _ = hash_password("test123")
    print(f"   Hashed: {hashed[:50]}...")
    print(f"   Verify correct: {verify_password('test123', hashed)}")
    print(f"   Verify wrong: {verify_password('wrong', hashed)}")
    
    # Test token generation
    print("\n2. Testing token generation...")
    token = generate_token(1, "testuser", "test@example.com")
    print(f"   Token: {token[:50]}...")
    payload = verify_token(token)
    print(f"   Verified payload: {payload}")
    
    # Test user authentication
    print("\n3. Testing user authentication...")
    result = authenticate_user("rahul@example.com", "password123")
    if result:
        print(f"   ✅ Login successful!")
        print(f"   User: {result['display_name']} ({result['email']})")
        print(f"   Token: {result['token'][:50]}...")
    else:
        print("   ❌ Login failed")
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60 + "\n")
