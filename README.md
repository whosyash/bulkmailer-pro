# BulkMailer Pro

A production-grade bulk email sending web application with personalization, template management, daily sending limits, deliverability optimization, and real-time progress tracking.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Email:** Nodemailer with SMTP
- **File Parsing:** csv-parser + xlsx
- **Storage:** Local JSON files (no database required)

---

## Quick Start

### 1. Backend
```bash
cd bulkmailer-pro/backend
npm install
node server.js
# Runs on http://localhost:3001
```

### 2. Frontend
```bash
cd bulkmailer-pro/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Gmail App Password Setup

Gmail requires an App Password for SMTP access (regular passwords are blocked).

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** → Enable **2-Step Verification** (required)
3. Search **"App Passwords"** in the search bar
4. Select app: **Mail** | Device: **Other (Custom name)** → **Generate**
5. Copy the 16-character password
6. Paste it into BulkMailer Pro's Settings → App Password field

> **Important:** Never use your regular Gmail password. App Passwords are specifically for SMTP.

---

## Usage Walkthrough

### Step 1 — Configure Sender (Settings)
1. Go to **Settings**
2. Enter your email, App Password, and display name
3. Select your SMTP provider (Gmail/Outlook/Yahoo/Custom)
4. Click **Test Connection** — wait for the green checkmark
5. Click **Save Configuration**

### Step 2 — Create Templates (Templates)
1. Go to **Templates** → **New Template**
2. Set a name, niche (or `general` for a catch-all), subject, and HTML body
3. Use `{{name}}`, `{{email}}`, `{{company}}`, `{{niche}}` placeholders
4. Click **Save Template**
5. Create niche-specific templates for different recipient segments

### Step 3 — Send Campaign (Compose)
1. Go to **Compose**
2. Upload a CSV or XLSX file (see format below)
3. Review parsed recipients and niche-template mapping
4. Set how many emails to send and confirm limits
5. Click **Start Sending** → watch real-time progress

---

## CSV / XLSX File Format

The first row must be headers. Required and optional columns:

| Column | Required | Alternatives |
|--------|----------|--------------|
| `email` | **Yes** | `Email`, `EMAIL`, `email_address` |
| `name` | Recommended | `Name`, `first_name`, `Full Name` |
| `niche` | Optional | `Niche`, `category`, `industry` |
| `company` | Optional | `Company`, `organization` |

**Example CSV:**
```csv
email,name,niche,company
john@example.com,John Smith,fitness,Fit Co
alice@business.com,Alice Lee,ecommerce,Shop Inc
bob@agency.com,Bob Kim,,Agency XYZ
```

---

## Daily Sending Limits

| Provider | Safe Daily Cap | Provider Hard Limit |
|----------|---------------|---------------------|
| Gmail / Google | **400/day** | 500/day |
| Outlook / Hotmail | **250/day** | 300/day |
| Yahoo Mail | **400/day** | 500/day |
| iCloud Mail | **200/day** | 300/day |
| Custom SMTP | **100/day** | 200/day |

Limits reset at **midnight (local server time)**.

You can override limits in Settings → Daily Sending Limits, but **exceeding the safe cap risks account suspension**.

---

## Rate Limiting (Built-in)

To avoid triggering spam filters:
- **3–8 second random delay** between individual emails
- **2-minute pause** after every 50 emails
- Named sender (Display Name `<email>`) for improved trust score
- Plain-text fallback included with every HTML email
- Unsubscribe footer appended automatically (toggle in Compose)

---

## Troubleshooting — Top 5 Errors

### 1. "Authentication failed — EAUTH"
**Cause:** Wrong email or app password.
**Fix:** Generate a fresh App Password from myaccount.google.com → Security → App Passwords. Make sure 2-Step Verification is ON.

### 2. "Cannot connect to email server — ECONNREFUSED"
**Cause:** Wrong SMTP host or port, or a firewall is blocking port 587.
**Fix:** Verify your SMTP host in Settings. Try port 465 with SSL if 587 with TLS fails.

### 3. "No email column detected"
**Cause:** Your CSV/XLSX doesn't have a column named `email` or any recognized variation.
**Fix:** Rename your email column to `email` (case-insensitive). Check for extra spaces in the header.

### 4. "Daily limit reached"
**Cause:** You've hit your safe sending cap for the day.
**Fix:** Wait until midnight for the counter to reset, or switch to another sender account in Settings.

### 5. Emails landing in spam
**Causes and fixes:**
- Subject line contains spam words → review the yellow warnings in Compose
- No unsubscribe link → keep the "Append unsubscribe footer" option ON
- Sending too fast → the built-in delays handle this; don't disable them
- New Gmail account → warm up gradually (start with 50/day, increase weekly)
- Check [mail-tester.com](https://www.mail-tester.com) for a full spam score

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get saved sender config (password masked) |
| POST | `/api/config/save` | Save sender config |
| POST | `/api/config/verify` | Test SMTP connection (no email sent) |
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/upload` | Parse CSV/XLSX, return recipients |
| GET | `/api/limits` | Get daily limit info |
| POST | `/api/limits/update` | Set custom daily limit |
| POST | `/api/limits/reset` | Reset to default limit |
| POST | `/api/send` | Start a send session |
| GET | `/api/send/stream/:id` | SSE stream for real-time progress |
| GET | `/api/send/status?sessionId=` | Poll session status |
| POST | `/api/send/pause` | Pause/resume session |
| POST | `/api/send/cancel` | Cancel session |
| GET | `/api/send/report/:id` | Get full session report |
| GET | `/api/send/history` | Last 10 send sessions |

---

## Project Structure

```
bulkmailer-pro/
├── backend/
│   ├── server.js
│   ├── routes/         (email, template, config)
│   ├── controllers/    (email, template, config)
│   ├── services/       (mailer, parser, limiter)
│   ├── middleware/     (validateSender, errorHandler)
│   ├── data/           (templates.json, sendLog.json, config.json)
│   └── uploads/        (temp files — auto-cleaned)
└── frontend/
    └── src/
        ├── pages/      (Dashboard, Compose, Templates, Settings)
        ├── components/ (FileUploader, RecipientPreview, ProgressBar…)
        └── services/   (api.js — all axios calls)
```

---

## Legal Disclaimer

BulkMailer Pro is intended for **legitimate email outreach only** — contacting opted-in recipients, following up with existing leads, or sending transactional messages. 

Sending unsolicited bulk email may violate:
- **CAN-SPAM Act** (USA)
- **GDPR** (European Union)
- **CASL** (Canada)
- Your email provider's Terms of Service

Always obtain consent before emailing recipients. Include an unsubscribe mechanism. The authors are not responsible for account suspension, legal action, or any consequences arising from misuse.
