# WhatsApp Bot Integration - Quick Start Guide

## 📱 Overview

Your Tax AI application now has a fully integrated WhatsApp bot! Clients can:
- Chat with Jarvis AI via WhatsApp
- Upload invoices by sending photos/PDFs
- Get account status and reports
- Receive automated notifications

---

## 🚀 Quick Start

### 1. Install Dependencies

**Node.js dependencies (already done):**
```bash
cd /Users/arnavbansal/Desktop/GST_agent/tax-backend
npm install
```

**Python dependencies:**
```bash
pip install requests
```

### 2. Start the WhatsApp Service

```bash
cd /Users/arnavbansal/Desktop/GST_agent/tax-backend
node whatsapp-service.js
```

**First Run:**
- A QR code will be displayed in your terminal
- Open WhatsApp on your phone → Settings → Linked Devices
- Scan the QR code
- You'll see "Client is ready!" when connected

**Subsequent Runs:**
- Session is saved in `.wwebjs_auth/` folder
- Bot auto-reconnects without QR code
- Just start the service and you're ready!

### 3. Start the Python Backend

In a **separate terminal**:

```bash
cd /Users/arnavbansal/Desktop/GST_agent/tax-backend
python main.py
```

### 4. Test the Bot

Send a WhatsApp message to the phone number you used for the bot:

```
!help
```

You should get a response with available commands!

---

## 💬 How to Use

### Commands

- `!help` - Show all available commands
- `!status` - Get your account status
- `!summary` - Get dashboard summary
- `!report [month]` - Get tax report for a month

### Natural Language Queries

Just send a message like normal:
- "What's my GST for December?"
- "Show pending invoices"
- "How many clients do I have?"

Jarvis AI will respond intelligently!

### Upload Documents

Simply send an image or PDF of an invoice via WhatsApp. The bot will:
1. Acknowledge receipt
2. Process with OCR
3. Extract invoice data
4. Confirm with details

---

## 🔗 Linking WhatsApp to User Account

### Option 1: Via Settings (Frontend - Coming Soon)

Users can link their WhatsApp in Settings → Account tab.

### Option 2: Manually (Database)

For testing, manually link a phone number:

```python
from auth import update_user_whatsapp

# Link WhatsApp to user ID 1
update_user_whatsapp(user_id=1, phone="+1234567890")
```

---

## 📁 Files Created

### Node.js Service
- `whatsapp-service.js` - Main WhatsApp bot service
- `package.json` - Node dependencies
- `.env` - Environment configuration

### Python Backend
- `whatsapp_notifications.py` - Helper module for sending WhatsApp messages
- `whatsapp_endpoints.py` - API endpoints for WhatsApp integration
- `auth.py` - Added WhatsApp phone column and helper functions

### Configuration
- `.wwebjs_auth/` - Session data (auto-created after QR scan)

---

## 🔧 Configuration

### Environment Variables (.env)

```env
BACKEND_URL=http://localhost:8000
WHATSAPP_SERVICE_PORT=3001
```

### WhatsApp Service Ports

- **WhatsApp Service**: `http://localhost:3001`
- **Python Backend**: `http://localhost:8000`

---

## 🎯 API Endpoints

### User Management
- `GET /whatsapp/user/{phone}` - Get user by phone number
- `PUT /auth/whatsapp` - Link WhatsApp to user account
- `DELETE /auth/whatsapp` - Unlink WhatsApp

### Bot Integration
- `GET /whatsapp/status` - Check bot connection status
- `GET /whatsapp/status/{phone}` - Get user account status
- `GET /whatsapp/summary/{phone}` - Get dashboard summary
- `POST /whatsapp/process-document` - Process uploaded documents

### Messaging (from Python backend)
- `POST http://localhost:3001/send-message` - Send WhatsApp message
- `POST http://localhost:3001/send-media` - Send media (images, PDFs)

---

## 🧪 Testing

### 1. Test WhatsApp Service Connection

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "whatsapp_connected": true,
  "bot_number": "1234567890"
}
```

### 2. Test Message Sending

```bash
curl -X POST http://localhost:3001/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Hello from Tax AI!"}'
```

### 3. Test User Lookup

```bash
curl http://localhost:8000/whatsapp/user/+1234567890
```

---

## 🚨 Troubleshooting

### QR Code Not Showing
- Make sure no other WhatsApp Web session is active
- Clear `.wwebjs_auth/` folder and restart
- Check terminal for error messages

### Bot Not Responding
- Verify both services are running (Node.js + Python)
- Check if user's phone number is linked to an account
- Look for errors in terminal logs

### "User not found" Error
- User must link WhatsApp phone number first
- Use `update_user_whatsapp()` function or frontend settings

### Connection Lost
- Bot will auto-reconnect automatically
- Session data is preserved in `.wwebjs_auth/`
- If issues persist, delete folder and re-scan QR code

---

## 📊 Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start WhatsApp service
pm2 start whatsapp-service.js --name "tax-ai-whatsapp"

# View logs
pm2 logs tax-ai-whatsapp

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Important Notes for Production

1. **Phone Number**: Use a dedicated business phone number
2. **Uptime**: Keep the service running 24/7 for instant responses
3. **Backups**: Back up `.wwebjs_auth/` folder (contains session)
4. **Monitoring**: Set up alerts if service goes down

---

## 🎉 What's Next?

- ✅ WhatsApp service is ready
- ✅ Backend APIs are integrated
- ⏳ Add WhatsApp settings to frontend UI
- ⏳ Implement automated notifications on invoice upload
- ⏳ Add more AI-powered features

---

## 📝 Notes

- **Session Duration**: WhatsApp Web sessions last indefinitely if the service runs continuously
- **Multi-Device**: WhatsApp multi-device is supported (one bot can work while phone is offline)
- **Rate Limits**: Be mindful of WhatsApp's rate limits (avoid spam)
- **Official API**: For enterprise/critical use, consider WhatsApp Business API

---

## 🆘 Support

If you encounter issues:
1. Check terminal logs for both Node.js and Python services
2. Verify all dependencies are installed
3. Ensure phone number is correctly linked to user
4. Review error messages carefully

**Happy chatting! 🤖💬**
