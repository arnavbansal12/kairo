"""
WhatsApp Integration Module - Helper functions for backend
Handles communication with Node.js WhatsApp service
"""
import requests
from typing import Optional, Dict

# WhatsApp Service Configuration
WHATSAPP_SERVICE_URL = "http://localhost:3001"


def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Send a WhatsApp message via the Node.js service.
    
    Args:
        phone: Phone number (with or without country code)
        message: Text message to send
    
    Returns:
        True if message sent successfully, False otherwise
    """
    try:
        response = requests.post(
            f"{WHATSAPP_SERVICE_URL}/send-message",
            json={"phone": phone, "message": message},
            timeout=10
        )
        return response.status_code == 200 and response.json().get("success", False)
    except Exception as e:
        print(f"❌ Error sending WhatsApp message: {e}")
        return False


def send_whatsapp_media(phone: str, media_data: str, mimetype: str, 
                        caption: str = None, filename: str = None) -> bool:
    """
    Send media (image, PDF, etc.) via WhatsApp.
    
    Args:
        phone: Phone number
        media_data: Base64 encoded media data
        mimetype: MIME type (e.g., 'image/jpeg', 'application/pdf')
        caption: Optional caption for the media
        filename: Optional filename
    
    Returns:
        True if media sent successfully, False otherwise
    """
    try:
        response = requests.post(
            f"{WHATSAPP_SERVICE_URL}/send-media",
            json={
                "phone": phone,
                "media_data": media_data,
                "mimetype": mimetype,
                "caption": caption,
                "filename": filename
            },
            timeout=30
        )
        return response.status_code == 200 and response.json().get("success", False)
    except Exception as e:
        print(f"❌ Error sending WhatsApp media: {e}")
        return False


def check_whatsapp_status() -> Dict:
    """
    Check if WhatsApp service is running and connected.
    
    Returns:
        Dict with status information
    """
    try:
        response = requests.get(f"{WHATSAPP_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"status": "error", "whatsapp_connected": False}
    except Exception as e:
        print(f"❌ WhatsApp service not reachable: {e}")
        return {"status": "offline", "whatsapp_connected": False, "error": str(e)}
