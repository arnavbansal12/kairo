# =============================================================================
# WHATSAPP INTEGRATION ENDPOINTS
# =============================================================================
# These endpoints allow the Node.js WhatsApp service to interact with the backend
# and allow the backend to send messages via WhatsApp
# =============================================================================

from pydantic import BaseModel
from typing import Optional
import base64
import io

class WhatsAppMessageRequest(BaseModel):
    phone: str
    message: str

class WhatsAppMediaRequest(BaseModel):
    phone: str
    media_data: str
    mimetype: str
    caption: Optional[str] = None
    filename: Optional[str] = None

class WhatsAppPhoneUpdate(BaseModel):
    phone: str

class DocumentProcessRequest(BaseModel):
    phone: str
    user_id: int
    media_data: str
    mimetype: str
    filename: str


@app.get("/whatsapp/status")
async def whatsapp_status():
    """Check WhatsApp bot connection status"""
    try:
        status = check_whatsapp_status()
        return status
    except Exception as e:
        print(f"❌ Error checking WhatsApp status: {e}")
        return {"status": "error", "whatsapp_connected": False, "error": str(e)}


@app.get("/whatsapp/user/{phone}")
async def get_user_by_whatsapp_phone(phone: str):
    """Get user information by WhatsApp phone number"""
    try:
        user = get_user_by_whatsapp(phone)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Don't return sensitive data
        return {
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "display_name": user["display_name"],
                "preferences": json.loads(user.get("preferences", "{}"))
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting user by WhatsApp: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/auth/whatsapp")
async def update_whatsapp_phone(request: WhatsAppPhoneUpdate, authorization: str = None):
    """Link or update WhatsApp phone number for authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        success = update_user_whatsapp(payload["user_id"], request.phone)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update WhatsApp phone")
        
        print(f"✅ WhatsApp phone linked for user {payload['user_id']}: {request.phone}")
        
        return {
            "success": True,
            "message": "WhatsApp phone linked successfully",
            "phone": request.phone
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Error updating WhatsApp phone: {e}")
        raise HTTPException(status_code=500, detail="Failed to update WhatsApp phone")


@app.delete("/auth/whatsapp")
async def remove_whatsapp_phone(authorization: str = None):
    """Remove WhatsApp phone number from authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token =authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        success = remove_user_whatsapp(payload["user_id"])
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove WhatsApp phone")
        
        print(f"✅ WhatsApp phone removed for user {payload['user_id']}")
        
        return {
            "success": True,
            "message": "WhatsApp phone removed successfully"
        }
    except Exception as e:
        print(f"❌ Error removing WhatsApp phone: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove WhatsApp phone")


@app.get("/whatsapp/status/{phone}")
async def get_whatsapp_account_status(phone: str):
    """Get account status for a WhatsApp user"""
    try:
        user = get_user_by_whatsapp(phone)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user statistics
        conn = get_db_connection()
        
        # Count active clients
        active_clients = conn.execute(
            "SELECT COUNT(DISTINCT client_id) FROM invoices WHERE client_id IN (SELECT id FROM clients)"
        ).fetchone()[0]
        
        # Count pending invoices
        pending_invoices = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE review_status = 'pending'"
        ).fetchone()[0]
        
        # Count flagged items
        flagged_items = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE review_status = 'needs_review' OR review_status = 'needs_clarification'"
        ).fetchone()[0]
        
        conn.close()
        
        return {
            "active_clients": active_clients,
            "pending_invoices": pending_invoices,
            "flagged_items": flagged_items,
            "last_login": user.get("last_login", "Never")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting WhatsApp status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/whatsapp/summary/{phone}")
async def get_whatsapp_dashboard_summary(phone: str):
    """Get dashboard summary for a WhatsApp user"""
    try:
        user = get_user_by_whatsapp(phone)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        conn = get_db_connection()
        
        # Get financial summary
        summary = conn.execute("""
            SELECT 
                COUNT(*) as invoice_count,
                SUM(CAST(json_extract(json_data, '$.total_amount') AS REAL)) as total_revenue,
                SUM(CAST(json_extract(json_data, '$.gst_amount') AS REAL)) as total_gst
            FROM invoices
        """).fetchone()
        
        # Get client count
        client_count = conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
        
        conn.close()
        
        return {
            "invoice_count": summary[0] or 0,
            "total_revenue": round(summary[1] or 0, 2),
            "total_gst": round(summary[2] or 0, 2),
            "client_count": client_count
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting WhatsApp summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/whatsapp/process-document")
async def process_whatsapp_document(request: DocumentProcessRequest):
    """Process a document uploaded via WhatsApp"""
    try:
        # Decode base64 media
        media_bytes = base64.b64decode(request.media_data)
        
        # Create file-like object
        file_obj = io.BytesIO(media_bytes)
        file_obj.name = request.filename
        
        # Determine if it's an image or PDF
        is_pdf = request.mimetype == "application/pdf" or request.filename.lower().endswith(".pdf")
        
        if is_pdf:
            # Handle PDF (existing PDF processing logic)
            # For now, return a simple response
            return {
                "success": True,
                "message": "PDF processing not yet implemented for WhatsApp uploads",
                "invoice": {
                    "invoice_number": "PENDING",
                    "total_amount": 0,
                    "gst_amount": 0,
                    "invoice_date": datetime.now().strftime("%Y-%m-%d")
                }
            }
        else:
            # Process image with OCR (use existing OCR logic)
            base64_image = base64.b64encode(media_bytes).decode('utf-8')
            
            # Call vision model for OCR
            prompt = """Analyze this invoice image and extract all information in JSON format.
Include: vendor_name, invoice_number, invoice_date, total_amount, gst_amount, 
taxable_value, hsn_code, items (if visible)."""
            
            response = call_vision_model(prompt, base64_image)
            invoice_data = json.loads(clean_json_response(response))
            
            # TODO: Save to database
            
            return {
                "success": True,
                "message": "Invoice processed successfully",
                "invoice": invoice_data
            }
            
    except Exception as e:
        print(f"❌ Error processing WhatsApp document: {e}")
        return {
            "success": False,
            "error": str(e),
            "invoice": {
                "invoice_number": "ERROR",
                "total_amount": 0,
                "gst_amount": 0,
                "invoice_date": datetime.now().strftime("%Y-%m-%d")
            }
        }


print("✅ WhatsApp Integration Endpoints loaded!")
print("📱 WhatsApp endpoints:")
print("   GET    /whatsapp/status")
print("   GET    /whatsapp/user/{phone}")
print("   PUT    /auth/whatsapp")
print("   DELETE /auth/whatsapp")
print("   GET    /whatsapp/status/{phone}")
print("   GET    /whatsapp/summary/{phone}")
print("   POST   /whatsapp/process-document")
