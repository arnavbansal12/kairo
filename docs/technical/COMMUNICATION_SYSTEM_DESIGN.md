# 📱 Tax.AI Communication System - Complete Design

**Version:** 3.0  
**Feature:** Multi-Channel Communication (WhatsApp + Call + Email)  
**Date:** January 6, 2026

---

## 🎯 OVERVIEW

### **The Vision:**
A unified communication hub that handles:
- 📱 **WhatsApp AI Agent** - Automated chat responses
- 📞 **Auto-Call System** - Scheduled automated calls
- 📧 **Email Automation** - Smart email reminders
- 💬 **SMS Integration** - Text message alerts
- 🔔 **Push Notifications** - In-app alerts

**Goal:** Workers never miss follow-ups, clients get timely reminders automatically!

---

## 📱 PART 1: WhatsApp AI Agent

### **What It Does:**
An AI-powered chatbot that handles common client queries automatically.

### **Use Cases:**

#### **1. Invoice Reminders (Automated)**
```
🤖 Bot (10:00 AM):
"Hi Ratan! This is Tax.AI assistant.

We received your payment of ₹75,000 on Jan 5.
Could you please send the GST invoice?

Reply:
1 - Sending today
2 - Need more time
3 - Talk to accountant"

Client: "1"

🤖 Bot:
"Great! We'll wait for the invoice today.
Reply SENT when you've emailed it.
Thank you! 😊"
```

#### **2. Payment Confirmations**
```
Client uploads payment screenshot on WhatsApp

🤖 Bot (Instant):
"✅ Payment received!
Amount: ₹75,000
Date: Jan 5, 2026

We've added this to your account.
GST invoice required within 3 days.

Reply OK to confirm."
```

#### **3. Quick Queries**
```
Client: "What's my pending amount?"

🤖 Bot:
"Hi Ratan! Your account summary:

Paid: ₹4,20,000 (45 invoices)
Pending: ₹1,50,000 (3 invoices)

Details:
• Jan 5: ₹75,000 (invoice pending)
• Dec 28: ₹50,000 (complete)
• Dec 15: ₹25,000 (invoice pending)

Need more info? Type DETAILS"
```

#### **4. Document Upload**
```
Client sends screenshot/PDF on WhatsApp

🤖 Bot:
"📄 Document received!

Analyzing... 🔍

✅ Detected: Payment Receipt
Amount: ₹50,000
Date: Jan 6

Is this for:
1 - New payment
2 - Pending invoice from Jan 3
3 - Something else

Reply with number or describe."
```

---

### **WhatsApp Bot Architecture:**

#### **Technology Stack:**
```javascript
// Option 1: WhatsApp Business API (Official)
{
  provider: "Meta (Facebook)",
  cost: "$0.005 per message",
  features: ["Official checkmark", "Business profile", "Quick replies"],
  requirements: "Facebook Business Manager account"
}

// Option 2: Twilio WhatsApp API (Recommended)
{
  provider: "Twilio",
  cost: "$0.0042 per message",
  features: ["Easy setup", "Good documentation", "Reliable"],
  requirements: "Twilio account + WhatsApp approval"
}

// Option 3: WhatsApp Web API (Unofficial - Not Recommended)
{
  provider: "Third-party libraries",
  cost: "Free",
  features: ["Quick setup", "No approval needed"],
  limitations: "Can be banned by WhatsApp, unreliable"
}
```

**Recommendation:** Use Twilio WhatsApp API for reliability

---

### **Bot Conversation Flows:**

#### **Flow 1: Invoice Reminder**
```
Trigger: Payment received, no invoice after 3 days

┌─────────────────────────────────────┐
│ Bot sends reminder                   │
│ "Hi! Invoice needed for ₹75k"       │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    v                 v
[Client          [Client
 replies]         ignores]
    │                 │
    v                 v
Bot parses      Wait 24 hours
response        Send follow-up
    │                 │
    v                 v
Update          Mark as
database        "No Response"
```

#### **Flow 2: Payment Confirmation**
```
Trigger: Client sends payment screenshot

┌─────────────────────────────────────┐
│ Bot receives image                   │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│ Gemini AI extracts:                  │
│ • Amount                             │
│ • Date                               │
│ • Payment method                     │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│ Match with database:                 │
│ • Find client by phone number        │
│ • Suggest matching payment           │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│ Bot asks confirmation:               │
│ "Is this for invoice INV-045?"      │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    v                 v
[Client          [Client
 confirms]        denies]
    │                 │
    v                 v
Auto-save       Ask for
to database     clarification
```

---

### **Bot Features:**

#### **1. Natural Language Understanding**
```javascript
// Example NLU patterns
const patterns = {
  invoice_query: [
    "where is my invoice",
    "need invoice",
    "send invoice",
    "invoice kaha hai"  // Hindi support
  ],
  
  payment_status: [
    "payment done",
    "paid",
    "amount sent",
    "paisa bhej diya"  // Hindi
  ],
  
  balance_query: [
    "how much pending",
    "balance",
    "kitna baaki hai"  // Hindi
  ]
};

// Gemini AI processes the intent
```

#### **2. Multi-Language Support**
- English (primary)
- Hindi (for Indian clients)
- Hinglish (mixed)

**Example:**
```
Client: "bhai invoice bhej do yaar"

🤖 Bot understands: "Please send invoice"

🤖 Bot replies (Hindi):
"Ji bilkul! Aapka invoice abhi bhej rahe hain.
Kripya check karein."

Translation:
"Of course! Sending your invoice now.
Please check."
```

#### **3. Quick Reply Buttons**
```
🤖 Bot:
"How can I help you today?"

[📄 Invoice Status]  [💰 Payment Info]
[📊 Account Summary] [👤 Talk to Human]
```

#### **4. File Upload Support**
- ✅ Images (payment screenshots)
- ✅ PDFs (invoices, receipts)
- ✅ Documents (bank statements)

#### **5. Smart Scheduling**
```javascript
// Send reminders at optimal times
const schedule = {
  morning: "10:00 AM",   // High response rate
  afternoon: "2:00 PM",  // Post-lunch check
  evening: "5:00 PM"     // Before closing
};

// Avoid these times
const avoid = {
  early: "Before 9 AM",  // Too early
  lunch: "12-1 PM",      // Lunch time
  late: "After 8 PM"     // Personal time
};
```

---

### **WhatsApp Bot Backend:**

```python
# tax-backend/whatsapp_bot.py

from twilio.rest import Client
from google import generativeai as genai

# Twilio setup
TWILIO_ACCOUNT_SID = "your_account_sid"
TWILIO_AUTH_TOKEN = "your_auth_token"
TWILIO_WHATSAPP_NUMBER = "whatsapp:+14155238886"

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Receives messages from WhatsApp
    """
    data = await request.form()
    
    from_number = data.get('From')  # Client's WhatsApp number
    message_body = data.get('Body')  # Text message
    media_url = data.get('MediaUrl0')  # Attached image/file
    
    # Process with AI
    response = await process_whatsapp_message(
        phone=from_number,
        text=message_body,
        media=media_url
    )
    
    # Send reply
    send_whatsapp_message(from_number, response)
    
    return {"status": "ok"}

async def process_whatsapp_message(phone, text, media):
    """
    AI processes the message and generates response
    """
    # Find client by phone number
    client = db.execute(
        "SELECT * FROM clients WHERE phone = ?", 
        (phone.replace('whatsapp:', ''),)
    ).fetchone()
    
    if not client:
        return "Hi! Please share your name to get started."
    
    # If media (image/PDF) is attached
    if media:
        # Download and process with Gemini Vision
        extracted_data = await extract_from_image(media)
        
        if extracted_data.get('type') == 'payment':
            # Save payment
            save_incomplete_transaction(
                client_id=client['id'],
                amount=extracted_data['amount'],
                date=extracted_data['date']
            )
            return f"✅ Payment of ₹{extracted_data['amount']} received! Invoice needed within 3 days."
    
    # Text-only message - use Gemini for intent
    intent = await detect_intent(text)
    
    if intent == 'invoice_query':
        # Get pending invoices
        pending = get_pending_invoices(client['id'])
        return format_invoice_status(pending)
    
    elif intent == 'balance_query':
        balance = get_client_balance(client['id'])
        return f"Your pending amount: ₹{balance}"
    
    else:
        return "I didn't understand. Reply:\n1 - Invoice status\n2 - Payment info\n3 - Talk to human"

def send_whatsapp_message(to_number, message_text):
    """
    Send message via Twilio
    """
    message = client.messages.create(
        from_=TWILIO_WHATSAPP_NUMBER,
        body=message_text,
        to=to_number
    )
    
    # Log in database
    db.execute("""
        INSERT INTO communications 
        (client_phone, channel, direction, message, timestamp)
        VALUES (?, 'whatsapp', 'outgoing', ?, ?)
    """, (to_number, message_text, datetime.now()))
    
    return message.sid
```

---

## 📞 PART 2: Auto-Call System

### **What It Does:**
Automated voice calls to clients with pre-recorded messages or AI voice.

### **Use Cases:**

#### **1. Invoice Reminder Call**
```
📞 System calls: +91-9876543210 (Ratan Diesels)
🕐 Scheduled: 10:00 AM

🤖 Voice (AI Generated):
"Hello, this is Tax.AI calling on behalf of 
[Your Mama's Office Name].

We received your payment of Rupees 75,000 
on January 5th.

We're waiting for the GST invoice.

Could you please send it today?

Press 1 to confirm you'll send today.
Press 2 if you need more time.
Press 3 to talk to our accountant.

Thank you!"
```

#### **2. Payment Follow-up**
```
📞 Auto-call: Overdue payment

🤖 Voice:
"Hello, this is a payment reminder.

Your invoice number INV-045 for Rupees 1,20,000
is pending since 10 days.

Please arrange payment at your earliest convenience.

Press 1 to confirm payment done.
Press 2 to discuss payment plan.
Press 3 to talk to manager.

Thank you!"
```

#### **3. Confirmation Calls**
```
📞 Auto-call: New client onboarding

🤖 Voice:
"Welcome to [Office Name]!

Your account has been created.
Your client ID is CLT-045.

You can now:
- Send payments via NEFT to [Account]
- Upload invoices via WhatsApp
- Check status anytime

Press 1 to hear account details again.
Press 2 to talk to our team.

Thank you!"
```

---

### **Auto-Call Technology Stack:**

#### **Option 1: Twilio Voice API (Recommended)**
```javascript
{
  provider: "Twilio",
  cost: "₹1.5 per minute",
  features: [
    "Text-to-Speech (TTS)",
    "Speech Recognition",
    "Call recording",
    "IVR (Interactive Voice Response)",
    "Call analytics"
  ],
  languages: ["English", "Hindi", "Regional languages"]
}
```

#### **Option 2: Exotel (India-Specific)**
```javascript
{
  provider: "Exotel",
  cost: "₹0.50 per minute",
  features: [
    "India DID numbers",
    "Cloud call center",
    "SMS + Voice combo",
    "Good Indian language support"
  ],
  best_for: "Indian businesses"
}
```

**Recommendation:** Use Exotel for India, Twilio for global

---

### **Auto-Call Backend:**

```python
# tax-backend/auto_call.py

from exotel import ExotelClient

EXOTEL_SID = "your_sid"
EXOTEL_TOKEN = "your_token"
EXOTEL_NUMBER = "+91XXXXXXXXXX"

exotel = ExotelClient(EXOTEL_SID, EXOTEL_TOKEN)

@app.post("/calls/schedule")
async def schedule_call(data: dict):
    """
    Schedule an automated call
    """
    client_id = data.get('client_id')
    call_type = data.get('type')  # 'invoice_reminder', 'payment_followup'
    schedule_time = data.get('schedule_time')  # ISO datetime
    
    # Get client details
    client = db.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    
    # Create call record
    call_id = db.execute("""
        INSERT INTO scheduled_calls
        (client_id, phone, type, schedule_time, status)
        VALUES (?, ?, ?, ?, 'scheduled')
        RETURNING id
    """, (client_id, client['phone'], call_type, schedule_time)).fetchone()[0]
    
    # Schedule with task queue (Celery/APScheduler)
    scheduler.add_job(
        make_call,
        'date',
        run_date=schedule_time,
        args=[call_id]
    )
    
    return {"call_id": call_id, "status": "scheduled"}

async def make_call(call_id):
    """
    Execute the actual call
    """
    call = db.execute("SELECT * FROM scheduled_calls WHERE id = ?", (call_id,)).fetchone()
    
    # Generate TwiML/XML for call flow
    twiml = generate_call_script(call['type'], call['client_id'])
    
    # Make call via Exotel
    response = exotel.call(
        from_=EXOTEL_NUMBER,
        to=call['phone'],
        url=f"https://yourdomain.com/calls/script/{call_id}"
    )
    
    # Update status
    db.execute("""
        UPDATE scheduled_calls
        SET status = 'in_progress', call_sid = ?
        WHERE id = ?
    """, (response.sid, call_id))
    
    return response

def generate_call_script(call_type, client_id):
    """
    Generate voice script based on type
    """
    client = get_client(client_id)
    
    if call_type == 'invoice_reminder':
        pending = get_pending_invoices(client_id)
        
        script = f"""
        <Response>
            <Say language="en-IN">
                Hello, this is Tax AI calling.
                
                We received your payment of Rupees {pending[0]['amount']}
                on {pending[0]['date']}.
                
                We need the GST invoice.
                
                Press 1 to confirm you will send today.
                Press 2 if you need more time.
                Press 3 to talk to our accountant.
            </Say>
            
            <Gather numDigits="1" action="/calls/handle-response/{call_id}">
                <Say>Please press a key now.</Say>
            </Gather>
        </Response>
        """
        
    return script

@app.post("/calls/handle-response/{call_id}")
async def handle_call_response(call_id: int, request: Request):
    """
    Handle IVR button press
    """
    data = await request.form()
    pressed = data.get('Digits')  # '1', '2', or '3'
    
    if pressed == '1':
        # Client will send today
        db.execute("""
            UPDATE scheduled_calls
            SET response = 'will_send_today', status = 'completed'
            WHERE id = ?
        """, (call_id,))
        
        return """
        <Response>
            <Say>Thank you! We will wait for the invoice today.</Say>
            <Hangup/>
        </Response>
        """
    
    elif pressed == '2':
        # Need more time
        return """
        <Response>
            <Say>No problem. How many days do you need? Press 1 for one day, 2 for two days, 3 for three days.</Say>
            <Gather numDigits="1" action="/calls/set-extension/{call_id}">
            </Gather>
        </Response>
        """
    
    elif pressed == '3':
        # Connect to human
        return """
        <Response>
            <Say>Connecting you to our accountant. Please wait.</Say>
            <Dial>+91XXXXXXXXXX</Dial>
        </Response>
        """
```

---

ENDOFFILE
cat COMMUNICATION_SYSTEM_DESIGN.md

## 📧 PART 3: Email Automation System

### **What It Does:**
Automated professional emails for reminders, reports, and notifications.

### **Use Cases:**

#### **1. Invoice Reminder Email**
```
From: tax.ai@yourdomain.com
To: ratan@ratandiesels.com
Subject: Invoice Required - Payment ₹75,000 (Jan 5)

Hi Ratan,

We hope this email finds you well.

This is a friendly reminder regarding your payment:

Payment Details:
• Amount: ₹75,000
• Date: January 5, 2026
• Payment Method: NEFT
• Transaction ID: NEFT12345678

We have received your payment successfully. However, we 
are still awaiting the GST invoice for our records.

Could you please send the invoice at your earliest 
convenience?

You can:
• Reply to this email with the invoice attached
• Upload via WhatsApp: +91-XXXXXXXXXX
• Upload to portal: https://taxai.app/upload

If you have any questions, please don't hesitate to reach out.

Best regards,
[Your Mama's Office Name]

---
Powered by Tax.AI
```

#### **2. Monthly Summary Report**
```
From: reports@yourdomain.com
To: ratan@ratandiesels.com
Subject: Monthly Account Summary - January 2026

Dear Ratan,

Please find your account summary for January 2026:

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Transactions:    8
Total Amount:          ₹6,00,000
Complete:              5 (₹4,50,000)
Pending Invoices:      3 (₹1,50,000)

📄 PENDING ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Jan 5  - ₹75,000  - Invoice needed
2. Jan 12 - ₹50,000  - GST number needed
3. Jan 20 - ₹25,000  - Invoice needed

⚠️ ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please send the 3 pending invoices to complete
your records.

📎 ATTACHMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Detailed_Statement_Jan2026.pdf

[View Online] [Download PDF] [Contact Us]

Thank you for your cooperation!

Best regards,
[Office Name] Team
```

#### **3. Payment Due Reminder**
```
From: accounts@yourdomain.com
To: client@example.com
Subject: Payment Reminder - Invoice INV-045 (₹1,20,000)

Dear Client,

This is a gentle reminder regarding the following invoice:

Invoice Number: INV-045
Invoice Date:   December 28, 2025
Amount:         ₹1,20,000
Due Date:       January 10, 2026
Days Overdue:   5 days

We kindly request you to arrange payment at your earliest
convenience.

Payment Options:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bank Transfer:
  Account: XXXX XXXX XXXX 1234
  IFSC: SBIN0001234
  
UPI: yourmama@bank

Cash/Cheque:
  Visit our office during business hours

[Make Payment] [Request Extension] [Contact Us]

If you have already made the payment, please share the
transaction details.

Thank you!

Best regards,
Accounts Team
```

---

### **Email Automation Backend:**

```python
# tax-backend/email_automation.py

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import jinja2

# Email configuration
SMTP_HOST = "smtp.gmail.com"  # or your email provider
SMTP_PORT = 587
SMTP_USER = "your-email@gmail.com"
SMTP_PASSWORD = "your-app-password"

# Email templates
template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader('email_templates')
)

@app.post("/email/send-invoice-reminder")
async def send_invoice_reminder(client_id: int):
    """
    Send invoice reminder email
    """
    client = get_client(client_id)
    pending = get_pending_invoices(client_id)
    
    if not client.get('email'):
        return {"error": "Client has no email"}
    
    # Generate email from template
    template = template_env.get_template('invoice_reminder.html')
    html_body = template.render(
        client_name=client['name'],
        pending_invoices=pending,
        office_name="Your Mama's Office",
        contact_phone="+91-XXXXXXXXXX"
    )
    
    # Send email
    result = send_email(
        to=client['email'],
        subject=f"Invoice Required - Payment ₹{pending[0]['amount']}",
        html_body=html_body
    )
    
    # Log communication
    db.execute("""
        INSERT INTO communications
        (client_id, channel, direction, subject, body, timestamp, status)
        VALUES (?, 'email', 'outgoing', ?, ?, ?, ?)
    """, (client_id, result['subject'], html_body, datetime.now(), result['status']))
    
    return result

def send_email(to, subject, html_body, attachments=None):
    """
    Send email via SMTP
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to
    
    # Attach HTML body
    html_part = MIMEText(html_body, 'html')
    msg.attach(html_part)
    
    # Attach files if any
    if attachments:
        for file_path in attachments:
            with open(file_path, 'rb') as f:
                attachment = MIMEApplication(f.read())
                attachment.add_header('Content-Disposition', 'attachment', 
                                     filename=os.path.basename(file_path))
                msg.attach(attachment)
    
    # Send via SMTP
    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return {"status": "sent", "subject": subject}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@app.post("/email/send-monthly-report")
async def send_monthly_report(client_id: int, month: str):
    """
    Send monthly account summary
    """
    client = get_client(client_id)
    
    # Generate PDF report
    pdf_path = generate_monthly_report_pdf(client_id, month)
    
    # Get summary data
    summary = get_monthly_summary(client_id, month)
    
    # Render email template
    template = template_env.get_template('monthly_report.html')
    html_body = template.render(
        client_name=client['name'],
        month=month,
        summary=summary,
        pdf_filename=os.path.basename(pdf_path)
    )
    
    # Send with PDF attachment
    return send_email(
        to=client['email'],
        subject=f"Monthly Account Summary - {month}",
        html_body=html_body,
        attachments=[pdf_path]
    )
```

---

## 💬 PART 4: SMS Integration

### **What It Does:**
Quick text message alerts for urgent matters.

### **Use Cases:**

#### **1. Payment Received Confirmation**
```
SMS to: +91-9876543210

Tax.AI: Payment ₹75,000 received on Jan 5.
Thank you! GST invoice needed within 3 days.
Upload: https://short.link/abc123

Reply STOP to unsubscribe
```

#### **2. Urgent Reminder**
```
SMS to: +91-9876543210

URGENT: Invoice INV-045 (₹1.2L) overdue by 10 days.
Please arrange payment ASAP.
Contact: +91-XXXXXXXXXX

Reply PAID if done
```

#### **3. OTP for Portal Access**
```
SMS to: +91-9876543210

Your Tax.AI verification code: 847293

Valid for 10 minutes.
Do not share with anyone.
```

---

### **SMS Backend:**

```python
# tax-backend/sms_service.py

from twilio.rest import Client

TWILIO_ACCOUNT_SID = "your_sid"
TWILIO_AUTH_TOKEN = "your_token"
TWILIO_PHONE = "+1234567890"

twilio = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.post("/sms/send")
async def send_sms(phone: str, message: str):
    """
    Send SMS via Twilio
    """
    try:
        result = twilio.messages.create(
            body=message,
            from_=TWILIO_PHONE,
            to=phone
        )
        
        # Log
        db.execute("""
            INSERT INTO communications
            (client_phone, channel, direction, message, timestamp, status)
            VALUES (?, 'sms', 'outgoing', ?, ?, 'sent')
        """, (phone, message, datetime.now()))
        
        return {"status": "sent", "sid": result.sid}
    
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@app.post("/sms/payment-confirmation")
async def sms_payment_confirmation(client_id: int, amount: float):
    """
    Send payment confirmation SMS
    """
    client = get_client(client_id)
    
    message = f"""Tax.AI: Payment ₹{amount:,.0f} received on {date.today().strftime('%b %d')}.
Thank you! GST invoice needed within 3 days.
Upload: https://yourdomain.com/upload

Reply STOP to unsubscribe"""
    
    return await send_sms(client['phone'], message)
```

---

## 🎯 PART 5: Unified Communication Center

### **The Complete Communication Tab:**

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Communication Center                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Compose Message] [Schedule] [Templates] [Analytics]        │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Quick Actions                                         │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ [📱 Send WhatsApp]  [📞 Schedule Call]               │   │
│ │ [📧 Send Email]      [💬 Send SMS]                    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Today's Schedule (6 pending)                          │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 10:00 AM - Call Ratan Diesels (Invoice reminder)     │   │
│ │            [Call Now] [Reschedule] [Cancel]          │   │
│ │                                                       │   │
│ │ 11:30 AM - WhatsApp ABC Traders (Payment due)        │   │
│ │            [Send Now] [Edit] [Cancel]                │   │
│ │                                                       │   │
│ │ 2:00 PM  - Email Sharma Industries (Monthly report)  │   │
│ │            [Send Now] [Preview] [Cancel]             │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Recent Communications                                 │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 📱 Jan 6, 9:30 AM - WhatsApp to Ratan               │   │
│ │    "Invoice reminder sent"                           │   │
│ │    Status: ✅ Delivered, Read at 9:35 AM            │   │
│ │    Response: "Sending today"                         │   │
│ │    [View Thread] [Follow Up]                         │   │
│ │                                                       │   │
│ │ 📞 Jan 6, 10:15 AM - Call to ABC Traders            │   │
│ │    Duration: 2:34 minutes                            │   │
│ │    Status: ✅ Completed                              │   │
│ │    Response: Pressed 1 (Will send today)            │   │
│ │    [Listen Recording] [Add Note]                     │   │
│ │                                                       │   │
│ │ 📧 Jan 5, 3:00 PM - Email to Sharma                 │   │
│ │    Subject: "Monthly Report - December 2025"        │   │
│ │    Status: ✅ Opened at 4:15 PM                      │   │
│ │    [View Email] [Send Follow-up]                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Communication Statistics                              │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ Today:                                               │   │
│ │ • WhatsApp: 15 sent, 12 delivered, 8 replied        │   │
│ │ • Calls: 5 completed, 2 missed, 3 scheduled          │   │
│ │ • Emails: 8 sent, 6 opened, 2 clicked               │   │
│ │ • SMS: 3 sent, 3 delivered                           │   │
│ │                                                       │   │
│ │ This Week:                                           │   │
│ │ • Total: 145 communications                          │   │
│ │ • Response Rate: 78%                                 │   │
│ │ • Avg Response Time: 2.5 hours                       │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### **Compose Message Modal:**

```
┌─────────────────────────────────────────────────────────┐
│ ✉️ Compose Message                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ To:      [Ratan Diesels ▼]  (Select client)            │
│                                                          │
│ Channel: ● WhatsApp  ○ Call  ○ Email  ○ SMS            │
│                                                          │
│ Template: [Invoice Reminder ▼]  [Create New]           │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Message Preview:                                   │ │
│ │                                                    │ │
│ │ Hi Ratan!                                          │ │
│ │                                                    │ │
│ │ We received your payment of ₹75,000 on Jan 5.    │ │
│ │ Could you please send the GST invoice?            │ │
│ │                                                    │ │
│ │ Thank you!                                         │ │
│ │                                                    │ │
│ │ [Edit Message]                                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Schedule:                                                │
│ ○ Send Now                                              │
│ ● Send Later: [Jan 7] at [10:00 AM]                    │
│                                                          │
│ Additional Options:                                      │
│ ☑ Track delivery/read status                            │
│ ☑ Send follow-up if no response in 2 days              │
│ □ Attach file                                           │
│                                                          │
│ [Send Message] [Save as Draft] [Cancel]                │
└─────────────────────────────────────────────────────────┘
```

---


## 📝 PART 6: Message Templates System

### **Pre-built Templates:**

#### **Template 1: Invoice Reminder (WhatsApp)**
```
Template ID: invoice_reminder_wa
Language: English + Hindi

Hi {client_name}! 👋

We received your payment of ₹{amount} on {date}.

We're waiting for the GST invoice. 📄

Could you please send it today?

Reply:
1 - Sending today
2 - Need more time
3 - Talk to accountant

Thank you! 🙏

---
Hindi Version:

नमस्ते {client_name}! 👋

हमें आपका ₹{amount} का भुगतान {date} को मिल गया।

हम GST इनवॉइस का इंतजार कर रहे हैं। 📄

कृपया आज भेज दें?

जवाब दें:
1 - आज भेज रहा हूं
2 - और समय चाहिए
3 - अकाउंटेंट से बात करनी है

धन्यवाद! 🙏
```

#### **Template 2: Payment Due (Email)**
```
Template ID: payment_due_email
Subject: Payment Reminder - Invoice {invoice_number}

Dear {client_name},

This is a gentle reminder regarding:

Invoice: {invoice_number}
Date: {invoice_date}
Amount: ₹{amount}
Due Date: {due_date}
Days Overdue: {days_overdue}

Please arrange payment at your earliest convenience.

[Make Payment Button]

Thank you!
```

#### **Template 3: Monthly Report (Email)**
```
Template ID: monthly_report_email
Subject: Monthly Summary - {month}

Dear {client_name},

Your account summary for {month}:

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━
Transactions:    {txn_count}
Total Amount:    ₹{total_amount}
Complete:        {complete_count}
Pending:         {pending_count}

📎 Detailed report attached.

[View Online] [Download PDF]
```

#### **Template 4: Welcome Message (WhatsApp)**
```
Template ID: welcome_client_wa

Welcome to {office_name}! 🎉

Your account is ready:
• Client ID: {client_id}
• Account Manager: {manager_name}
• Contact: {office_phone}

You can now:
✅ Send payments
✅ Upload invoices
✅ Check status anytime

Need help? Reply HI

Thank you for choosing us! 🙏
```

---

### **Template Management UI:**

```
┌─────────────────────────────────────────────────────────┐
│ 📝 Message Templates                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [+ Create Template]  [Import]  [Export All]            │
│                                                          │
│ Filter: [All ▼] [WhatsApp] [Email] [SMS] [Call]        │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 📱 Invoice Reminder (WhatsApp)        [Edit] [Del] │ │
│ │ Used: 145 times | Success Rate: 85%                │ │
│ │ Avg Response Time: 2.5 hours                       │ │
│ │                                                     │ │
│ │ Preview:                                            │ │
│ │ "Hi {name}! We received your payment..."          │ │
│ │                                                     │ │
│ │ Variables: {client_name}, {amount}, {date}         │ │
│ │ Languages: English, Hindi                          │ │
│ │                                                     │ │
│ │ [Use Template] [Test Send] [View Stats]           │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 📧 Payment Due (Email)                [Edit] [Del] │ │
│ │ Used: 78 times | Open Rate: 92%                   │ │
│ │ Click Rate: 45%                                    │ │
│ │                                                     │ │
│ │ [Use Template] [Test Send] [View Stats]           │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### **Template Backend:**

```python
# tax-backend/templates.py

@app.get("/templates")
async def get_templates(channel: str = None):
    """
    Get all message templates
    """
    query = "SELECT * FROM message_templates"
    if channel:
        query += f" WHERE channel = '{channel}'"
    
    templates = db.execute(query).fetchall()
    return templates

@app.post("/templates")
async def create_template(data: dict):
    """
    Create new template
    """
    template_id = db.execute("""
        INSERT INTO message_templates
        (name, channel, subject, body, variables, language)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
    """, (
        data['name'],
        data['channel'],
        data.get('subject'),
        data['body'],
        json.dumps(data.get('variables', [])),
        data.get('language', 'en')
    )).fetchone()[0]
    
    return {"template_id": template_id}

@app.post("/templates/{template_id}/render")
async def render_template(template_id: int, data: dict):
    """
    Render template with actual data
    """
    template = db.execute(
        "SELECT * FROM message_templates WHERE id = ?",
        (template_id,)
    ).fetchone()
    
    # Replace variables
    rendered = template['body']
    for key, value in data.items():
        rendered = rendered.replace(f"{{{key}}}", str(value))
    
    return {
        "subject": template['subject'],
        "body": rendered
    }
```

---

## 📊 PART 7: Communication Analytics

### **Analytics Dashboard:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Communication Analytics - Last 30 Days                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Channel Performance                                   │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ 📱 WhatsApp:  356 sent │ 340 delivered │ 78% replied│   │
│ │ 📞 Calls:     124 made │ 98 answered   │ 2.5min avg │   │
│ │ 📧 Email:     245 sent │ 198 opened    │ 45% clicked│   │
│ │ 💬 SMS:       89 sent  │ 89 delivered  │ 34% replied│   │
│ │                                                       │   │
│ │ [Bar Chart showing volume by channel]                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Response Rates                                        │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │                                                       │   │
│ │ [Line Graph: Response rate over time]                │   │
│ │                                                       │   │
│ │ Best Response Time: 10-11 AM (92%)                   │   │
│ │ Worst Response Time: 8-9 PM (34%)                    │   │
│ │ Average Response Time: 2.8 hours                     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Top Performing Templates                              │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ 1. Invoice Reminder (WA) - 85% response              │   │
│ │ 2. Payment Due (Email) - 76% opened                  │   │
│ │ 3. Monthly Report (Email) - 65% downloaded           │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Client Communication Frequency                        │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ • Ratan Diesels: 15 messages (High engagement)       │   │
│ │ • ABC Traders: 8 messages (Medium)                   │   │
│ │ • Sharma Industries: 3 messages (Low)                │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### **Analytics Backend:**

```python
# tax-backend/analytics.py

@app.get("/analytics/communications")
async def get_communication_analytics(days: int = 30):
    """
    Get communication statistics
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Channel breakdown
    channel_stats = db.execute("""
        SELECT 
            channel,
            COUNT(*) as sent,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN response IS NOT NULL THEN 1 ELSE 0 END) as replied
        FROM communications
        WHERE timestamp > ?
        GROUP BY channel
    """, (cutoff_date,)).fetchall()
    
    # Response times
    response_times = db.execute("""
        SELECT 
            strftime('%H', timestamp) as hour,
            AVG(
                julianday(response_time) - julianday(timestamp)
            ) * 24 as avg_hours
        FROM communications
        WHERE response_time IS NOT NULL
        AND timestamp > ?
        GROUP BY hour
        ORDER BY hour
    """, (cutoff_date,)).fetchall()
    
    # Template performance
    template_stats = db.execute("""
        SELECT 
            t.name,
            t.channel,
            COUNT(c.id) as uses,
            AVG(CASE WHEN c.response IS NOT NULL THEN 1.0 ELSE 0.0 END) as response_rate
        FROM message_templates t
        LEFT JOIN communications c ON c.template_id = t.id
        WHERE c.timestamp > ?
        GROUP BY t.id
        ORDER BY response_rate DESC
        LIMIT 10
    """, (cutoff_date,)).fetchall()
    
    return {
        "channel_stats": channel_stats,
        "response_times": response_times,
        "template_stats": template_stats
    }
```

---

## 🚀 PART 8: Implementation Guide

### **Phase 1: WhatsApp Bot (Week 1-2)**

**Steps:**
1. Setup Twilio account
2. Get WhatsApp Business approval
3. Implement webhook endpoint
4. Connect Gemini AI for NLU
5. Test with 5 clients
6. Launch to all clients

**Cost:** ₹5,000 setup + ₹0.40/message

---

### **Phase 2: Auto-Call System (Week 3-4)**

**Steps:**
1. Setup Exotel account
2. Record voice prompts
3. Implement IVR logic
4. Test call flows
5. Schedule pilot calls
6. Full rollout

**Cost:** ₹3,000 setup + ₹0.50/minute

---

### **Phase 3: Email Automation (Week 5-6)**

**Steps:**
1. Setup email server (Gmail/SendGrid)
2. Design email templates
3. Implement sending logic
4. Add tracking (opens, clicks)
5. Test with sample clients
6. Enable auto-reminders

**Cost:** Free (Gmail) or ₹1,500/month (SendGrid)

---

### **Phase 4: Integration & Analytics (Week 7-8)**

**Steps:**
1. Build unified Communication Center UI
2. Implement template system
3. Add analytics dashboard
4. Create scheduling system
5. User testing
6. Training & launch

---

## 💰 COST BREAKDOWN

### **One-Time Costs:**
- WhatsApp Business setup: ₹5,000
- Exotel setup: ₹3,000
- Email template design: ₹2,000
- Development (8 weeks): ₹60,000
- **Total:** ₹70,000

### **Monthly Costs:**
- WhatsApp (500 messages): ₹200
- Calls (200 minutes): ₹100
- Email (SendGrid): ₹1,500
- SMS (optional, 100 messages): ₹50
- **Total:** ₹1,850/month

### **ROI Calculation:**
- Time saved per day: 2 hours
- Worker cost: ₹500/hour
- Savings per day: ₹1,000
- Savings per month: ₹30,000

**Payback Period:** 2.3 months

---

## 🎯 FEATURES SUMMARY

### **WhatsApp AI Agent:**
✅ Automated responses
✅ Payment confirmations
✅ Invoice reminders
✅ Natural language understanding
✅ Multi-language support
✅ File upload handling
✅ Smart scheduling

### **Auto-Call System:**
✅ Scheduled calls
✅ IVR (Press 1, 2, 3)
✅ Voice recordings
✅ Call analytics
✅ Human handoff
✅ Follow-up scheduling

### **Email Automation:**
✅ Professional templates
✅ Monthly reports
✅ Invoice reminders
✅ Payment alerts
✅ PDF attachments
✅ Open/click tracking

### **Unified Communication:**
✅ Single dashboard
✅ Message templates
✅ Scheduling system
✅ Analytics
✅ Multi-channel support
✅ Client history

---

## 📱 MOBILE APP FEATURES (Bonus)

### **For Workers:**
- Send quick messages on the go
- View today's schedule
- Make calls directly
- Upload files from phone
- Voice notes

### **For Clients:**
- View account status
- Upload invoices
- Check payment history
- Chat with office
- Get notifications

---

## 🎓 USER GUIDE

### **How to Send WhatsApp:**
1. Go to Communication Center
2. Click [Send WhatsApp]
3. Select client
4. Choose template or write custom
5. Click [Send]

### **How to Schedule Call:**
1. Go to Communication Center
2. Click [Schedule Call]
3. Select client
4. Choose date/time
5. Select call type (invoice reminder, payment follow-up)
6. Click [Schedule]

### **How to Send Email:**
1. Go to Communication Center
2. Click [Send Email]
3. Select client
4. Choose template
5. Add attachments (optional)
6. Click [Send]

---

## 🔧 TECHNICAL REQUIREMENTS

### **Server Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- Internet: High-speed (for real-time messaging)

### **Third-Party Services:**
- Twilio (WhatsApp + SMS)
- Exotel (Calls)
- SendGrid (Email)
- Google Gemini (AI)

### **Database Schema:**
```sql
CREATE TABLE communications (
    id INTEGER PRIMARY KEY,
    client_id INTEGER,
    client_phone TEXT,
    channel TEXT, -- 'whatsapp', 'call', 'email', 'sms'
    direction TEXT, -- 'outgoing', 'incoming'
    template_id INTEGER,
    subject TEXT,
    message TEXT,
    status TEXT, -- 'scheduled', 'sent', 'delivered', 'read', 'replied'
    response TEXT,
    timestamp DATETIME,
    scheduled_time DATETIME,
    response_time DATETIME,
    metadata TEXT -- JSON for extra data
);

CREATE TABLE message_templates (
    id INTEGER PRIMARY KEY,
    name TEXT,
    channel TEXT,
    subject TEXT,
    body TEXT,
    variables TEXT, -- JSON array
    language TEXT,
    created_at DATETIME
);

CREATE TABLE scheduled_calls (
    id INTEGER PRIMARY KEY,
    client_id INTEGER,
    phone TEXT,
    type TEXT,
    schedule_time DATETIME,
    status TEXT,
    call_sid TEXT,
    response TEXT,
    duration INTEGER,
    recording_url TEXT
);
```

---

