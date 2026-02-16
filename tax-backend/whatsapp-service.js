require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;

// Initialize Express app for health checks and admin endpoints
const app = express();
app.use(express.json());

// WhatsApp Client with session persistence
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ============================================
// WhatsApp Event Handlers
// ============================================

// QR Code Event - Display QR for initial authentication
client.on('qr', (qr) => {
    console.log('\n========================================');
    console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP');
    console.log('========================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n========================================');
    console.log('⏳ QR Code expires in 30 seconds');
    console.log('========================================\n');
});

// Ready Event - Client is authenticated and ready
client.on('ready', () => {
    console.log('✅ WhatsApp Bot is ready and connected!');
    console.log(`📞 Bot Number: ${client.info.wid.user}`);
    console.log('🤖 Now listening for messages...\n');
});

// Authentication Success
client.on('authenticated', () => {
    console.log('🔐 Authentication successful! Session saved.');
});

// Authentication Failure
client.on('auth_failure', (message) => {
    console.error('❌ Authentication failed:', message);
    console.log('💡 You may need to delete .wwebjs_auth folder and re-authenticate');
});

// Disconnected Event
client.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp disconnected:', reason);
    console.log('🔄 Attempting to reconnect...');
});

// ============================================
// Message Handler - Main Bot Logic
// ============================================

client.on('message_create', async (msg) => {
    try {
        // Ignore messages from status broadcast
        if (msg.from === 'status@broadcast') return;

        // Get sender info
        const contact = await msg.getContact();
        const senderName = contact.pushname || contact.name || msg.from;
        const senderPhone = msg.from.replace('@c.us', '');

        console.log(`\n📨 Message from ${senderName} (${senderPhone}): ${msg.body}`);

        // Handle media messages (document uploads)
        if (msg.hasMedia) {
            await handleMediaMessage(msg, senderPhone, senderName);
            return;
        }

        // Handle text commands and queries
        if (msg.body.startsWith('!')) {
            await handleCommand(msg, senderPhone, senderName);
        } else {
            // Natural language query - route to AI
            await handleAIQuery(msg, senderPhone, senderName);
        }

    } catch (error) {
        console.error('❌ Error handling message:', error);
        await msg.reply('⚠️ Sorry, I encountered an error processing your message. Please try again.');
    }
});

// ============================================
// Command Handler
// ============================================

async function handleCommand(msg, phone, name) {
    const command = msg.body.toLowerCase().trim();

    switch (command) {
        case '!help':
            await msg.reply(
                `🤖 *Tax AI Assistant - Commands*\n\n` +
                `📝 *Commands:*\n` +
                `!help - Show this help message\n` +
                `!status - Get your account status\n` +
                `!report [month] - Get tax report\n` +
                `!summary - Dashboard summary\n\n` +
                `💡 *Natural Queries:*\n` +
                `Just send a message like:\n` +
                `"What's my GST for December?"\n` +
                `"Show pending invoices"\n\n` +
                `📎 *Upload Documents:*\n` +
                `Send invoice images or PDFs directly\n\n` +
                `Need help? Just ask! 😊`
            );
            break;

        case '!status':
            await getAccountStatus(msg, phone, name);
            break;

        case '!summary':
            await getDashboardSummary(msg, phone, name);
            break;

        case command.match(/^!report/)?.input:
            const month = command.split(' ')[1] || 'current';
            await getTaxReport(msg, phone, name, month);
            break;

        default:
            await msg.reply(
                `❓ Unknown command: ${command}\n\n` +
                `Type *!help* to see available commands.`
            );
    }
}

// ============================================
// AI Query Handler
// ============================================

async function handleAIQuery(msg, phone, name) {
    try {
        // Get user info from backend
        const user = await getUserByPhone(phone);

        if (!user) {
            await msg.reply(
                `👋 Hi ${name}!\n\n` +
                `I don't have you in my system yet. Please register on our web app first:\n` +
                `🌐 [Your Web App URL]\n\n` +
                `Then link your WhatsApp in Settings → Account.`
            );
            return;
        }

        // Show typing indicator (simulate)
        await msg.reply('🤔 Let me check that for you...');

        // Call AI endpoint
        const response = await axios.post(`${BACKEND_URL}/search/ai`, {
            query: msg.body,
            context: {
                username: user.display_name || user.username,
                client_id: null,
                active_tab: 'dashboard',
                selected_month: null
            }
        });

        const aiResponse = response.data.response;

        // Send AI response
        await msg.reply(`🤖 *Jarvis AI:*\n\n${aiResponse}`);

    } catch (error) {
        console.error('❌ Error calling AI:', error);
        await msg.reply(
            `⚠️ Sorry, I couldn't process your query right now.\n` +
            `Please try again in a moment.`
        );
    }
}

// ============================================
// Media/Document Handler
// ============================================

async function handleMediaMessage(msg, phone, name) {
    try {
        await msg.reply('📎 Received your document! Processing...');

        // Download media
        const media = await msg.downloadMedia();

        if (!media) {
            await msg.reply('❌ Failed to download the document. Please try again.');
            return;
        }

        // Get user info
        const user = await getUserByPhone(phone);

        if (!user) {
            await msg.reply(
                `⚠️ Please register on our web app and link your WhatsApp first.`
            );
            return;
        }

        // Send to backend for processing
        const response = await axios.post(`${BACKEND_URL}/whatsapp/process-document`, {
            phone: phone,
            user_id: user.id,
            media_data: media.data,
            mimetype: media.mimetype,
            filename: media.filename || 'document'
        });

        if (response.data.success) {
            const invoice = response.data.invoice;
            await msg.reply(
                `✅ *Document Processed Successfully!*\n\n` +
                `📄 Invoice: ${invoice.invoice_number || 'N/A'}\n` +
                `💰 Amount: ₹${invoice.total_amount || 'N/A'}\n` +
                `📊 GST: ₹${invoice.gst_amount || 'N/A'}\n` +
                `📅 Date: ${invoice.invoice_date || 'N/A'}\n\n` +
                `Your invoice has been added to the system! 🎉`
            );
        } else {
            await msg.reply(
                `⚠️ Document processed but some data couldn't be extracted.\n` +
                `You may need to review it on the web app.`
            );
        }

    } catch (error) {
        console.error('❌ Error processing media:', error);
        await msg.reply(
            `❌ Sorry, I couldn't process this document.\n` +
            `Please try uploading it through the web app.`
        );
    }
}

// ============================================
// Backend API Helpers
// ============================================

async function getUserByPhone(phone) {
    try {
        const response = await axios.get(`${BACKEND_URL}/whatsapp/user/${phone}`);
        return response.data.user;
    } catch (error) {
        if (error.response?.status === 404) {
            return null; // User not found
        }
        throw error;
    }
}

async function getAccountStatus(msg, phone, name) {
    try {
        const user = await getUserByPhone(phone);
        if (!user) {
            await msg.reply('⚠️ User not found. Please register first.');
            return;
        }

        const response = await axios.get(`${BACKEND_URL}/whatsapp/status/${phone}`);
        const status = response.data;

        await msg.reply(
            `📊 *Account Status for ${name}*\n\n` +
            `✅ Active Clients: ${status.active_clients || 0}\n` +
            `📄 Pending Invoices: ${status.pending_invoices || 0}\n` +
            `🔴 Flagged Items: ${status.flagged_items || 0}\n` +
            `📅 Last Login: ${status.last_login || 'N/A'}\n\n` +
            `All systems operational! 🚀`
        );
    } catch (error) {
        console.error('❌ Error getting status:', error);
        await msg.reply('⚠️ Could not retrieve account status. Please try again.');
    }
}

async function getDashboardSummary(msg, phone, name) {
    try {
        const response = await axios.get(`${BACKEND_URL}/whatsapp/summary/${phone}`);
        const summary = response.data;

        await msg.reply(
            `📈 *Dashboard Summary*\n\n` +
            `💰 Total Revenue: ₹${summary.total_revenue || 0}\n` +
            `📊 Total GST: ₹${summary.total_gst || 0}\n` +
            `📄 Invoices: ${summary.invoice_count || 0}\n` +
            `👥 Clients: ${summary.client_count || 0}\n\n` +
            `Keep up the great work! 💪`
        );
    } catch (error) {
        console.error('❌ Error getting summary:', error);
        await msg.reply('⚠️ Could not retrieve dashboard summary.');
    }
}

async function getTaxReport(msg, phone, name, month) {
    try {
        const response = await axios.get(`${BACKEND_URL}/whatsapp/report/${phone}`, {
            params: { month }
        });

        // If report is a PDF/document, send as media
        if (response.data.report_url) {
            const media = await MessageMedia.fromUrl(response.data.report_url);
            await msg.reply(media, { caption: `📊 Tax Report for ${month}` });
        } else {
            await msg.reply(
                `📊 *Tax Report - ${month}*\n\n` +
                `${response.data.report_text || 'Report generated successfully!'}`
            );
        }
    } catch (error) {
        console.error('❌ Error getting report:', error);
        await msg.reply('⚠️ Could not generate tax report.');
    }
}

// ============================================
// Express API for Backend Integration
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp_connected: client.info ? true : false,
        bot_number: client.info?.wid?.user || null
    });
});

// Send message endpoint (called by Python backend)
app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }

        // Format phone number (add @c.us if not present)
        const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

        await client.sendMessage(chatId, message);

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// Send media endpoint (called by Python backend)
app.post('/send-media', async (req, res) => {
    try {
        const { phone, media_data, mimetype, caption, filename } = req.body;

        if (!phone || !media_data || !mimetype) {
            return res.status(400).json({ error: 'Phone, media_data, and mimetype are required' });
        }

        const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

        const media = new MessageMedia(mimetype, media_data, filename);
        await client.sendMessage(chatId, media, { caption });

        res.json({ success: true, message: 'Media sent successfully' });
    } catch (error) {
        console.error('❌ Error sending media:', error);
        res.status(500).json({ error: 'Failed to send media', details: error.message });
    }
});

// ============================================
// Initialize Services
// ============================================

// Start Express server
app.listen(PORT, () => {
    console.log(`🌐 WhatsApp Service API running on port ${PORT}`);
});

// Initialize WhatsApp client
console.log('🚀 Starting WhatsApp Bot...\n');
client.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down WhatsApp Bot...');
    await client.destroy();
    process.exit(0);
});
