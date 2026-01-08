# 🧾 Tax.AI - AI-Powered GST Compliance System

> An enterprise-grade Mini-ERP for CA offices that automates invoice processing using Google Gemini AI.

![Version](https://img.shields.io/badge/version-2.1.1-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Invoice Processing** | Upload PDF/images → Gemini extracts all fields automatically |
| ✅ **GST Validation** | Real-time GSTIN checksum verification |
| 📊 **Analytics Dashboard** | 4 interactive charts with revenue trends |
| 🎙️ **Voice Search (Jarvis)** | Natural language queries → SQL conversion |
| 📋 **Invoice Register** | Excel-like grid with sorting, filtering, inline edit |
| 📤 **Tally Export** | One-click XML export for Tally Prime |
| 👥 **Multi-Tenant** | Client & vendor management for CA offices |
| 💾 **Auto-Backup** | Timestamped database backups on server start |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google Gemini API Key

### Backend Setup
```bash
cd tax-backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd tax-frontend
npm install
npm run dev
```

### Access
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 📁 Project Structure

```
GST_agent/
├── tax-frontend/          # React + Vite UI
│   ├── src/App.jsx        # Main component (2,273 lines)
│   └── src/ClientSelector.jsx
│
├── tax-backend/           # Python FastAPI server
│   ├── main.py            # Core API (1,939 lines)
│   ├── tax_data.db        # SQLite database
│   ├── uploads/           # Uploaded invoices
│   └── backups/           # Auto-backups
│
├── docs/                  # Documentation
│   ├── technical/         # Architecture & design docs
│   ├── guides/            # How-to guides
│   └── project-status/    # Release notes & summaries
│
├── exports/               # Tally export utilities
│   ├── tally_export.py
│   └── Tally_Import_File_Fixed.xlsx
│
└── README.md              # This file
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7, Tailwind CSS, Framer Motion, Recharts |
| **Backend** | Python FastAPI, Uvicorn |
| **AI** | Google Gemini (OCR + NLP) |
| **Database** | SQLite (8 tables) |

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [Project Blueprint](docs/technical/PROJECT_BLUEPRINT.md) | Complete architecture reference |
| [Implementation Roadmap](docs/guides/IMPLEMENTATION_ROADMAP.md) | Week-by-week development plan |
| [Testing Guide](docs/guides/HOW_TO_TEST_NEW_FEATURES.md) | Feature testing instructions |
| [Executive Summary](docs/project-status/EXECUTIVE_SUMMARY.md) | High-level project overview |

---

## 🔑 API Key Setup

1. Get a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Edit `tax-backend/main.py` and replace:
```python
GOOGLE_API_KEY = "your-api-key-here"
```

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `clients` | Multi-tenant client management |
| `vendors` | Vendor master with auto-fill |
| `documents` | Enhanced invoice storage |
| `invoices` | Legacy invoice table |
| `bank_transactions` | Bank statement entries |
| `communications` | WhatsApp/Email log |
| `message_templates` | Communication templates |
| `users` | Multi-user support |

---

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with ❤️ for CA offices across India**
