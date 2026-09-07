# 🛡️ VoiceGuard

### AI-Powered Voice Clone Detection & Security Decision Platform

**Detect. Verify. Prevent.**

VoiceGuard is a cybersecurity platform designed to analyze speech/audio and identify suspicious or potentially AI-generated/voice-cloned audio.

The platform combines:
- Audio validation
- Acoustic feature extraction
- Voice classification
- Confidence scoring
- Anomaly/risk assessment
- Automated security decisions
- Incident generation
- SHA-256 integrity fingerprints
- Security dashboard and analysis history

> ⚠️ **Current Model Status:** VoiceGuard currently uses a measurable acoustic-feature baseline (`baseline-audio-v1`). It is a prototype detection pipeline and should not be represented as a production-grade deepfake detector until a properly trained and evaluated anti-spoofing model is integrated.

---

# 🇮🇳 Smart India Hackathon 2026

| Field | Details |
|---|---|
| **Problem ID** | **SIH26104** |
| **Theme** | **Blockchain & Cybersecurity** |
| **Category** | **Software** |
| **Team** | **Binary Builders** |

---

# 🎯 Vision

Voice cloning and AI-generated speech can be used in:
- Financial fraud
- Impersonation attacks
- Social engineering
- Fake customer-support calls
- Identity-based attacks
- Unauthorized voice authentication

VoiceGuard is designed as a security layer that analyzes incoming voice/audio and produces an actionable security assessment.

```text
VOICE INPUT
    ↓
AUDIO VALIDATION
    ↓
PREPROCESSING
    ↓
FEATURE EXTRACTION
    ↓
VOICE ANALYSIS
    ↓
CLASSIFICATION + ANOMALY SCORE
    ↓
RISK ENGINE
    ↓
SECURITY DECISION
    ↓
ALLOW / VERIFY / ALERT / BLOCK
    ↓
INCIDENT LOG
    ↓
DASHBOARD
```

---

# ✨ Current Features

## Dashboard
- Total analysis count
- Genuine/suspicious statistics
- Risk information
- Detection distribution
- Security status
- Recent analysis history
- Backend connection status

## 🎙️ Voice Analysis
- Audio file upload
- Recorded audio input
- Audio validation
- Backend analysis
- Classification result
- Confidence score
- Anomaly/risk information
- Security decision
- Analysis history

## 🧠 Audio Detection Pipeline

The current prototype uses `baseline-audio-v1`.

The baseline analyzes measurable acoustic characteristics including:
- RMS energy
- Zero-crossing rate
- Spectral characteristics
- MFCC-based features
- Other audio statistics

The resulting measurements are used to produce a classification and confidence/risk assessment.

### Important
The current baseline is **not a trained production deepfake/voice-clone detector**.

A future production model should be trained and evaluated on a representative anti-spoofing dataset.

---

# 🛡️ Risk & Security Decisions

```text
LOW       → ALLOW
MEDIUM    → VERIFY
HIGH      → ALERT
CRITICAL  → BLOCK
```

The security decision is generated from the analysis/risk pipeline rather than being entered manually in the dashboard.

---

# 📋 Security Incidents

Suspicious/high-risk analyses can produce security incidents containing:
- Incident ID
- Analysis ID
- Filename
- Classification
- Confidence
- Anomaly score
- Risk level
- Security action
- SHA-256 integrity fingerprint
- Timestamp
- Status

### SHA-256 clarification
SHA-256 is used as an **integrity fingerprint** for an audio/event artifact. It does **not** prove that a voice is genuine or human-generated.

---

# 🏗️ Architecture

```text
┌──────────────────────────────────────────────┐
│                 React Frontend               │
│                                              │
│ Dashboard │ Analyze Voice │ Incidents       │
└──────────────────────┬───────────────────────┘
                       │ REST API
                       ▼
┌──────────────────────────────────────────────┐
│                 FastAPI Backend              │
│                                              │
│ Validation │ Analysis │ Risk │ Incidents     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             Audio / ML Pipeline              │
│                                              │
│ Librosa │ NumPy │ SciPy │ Baseline Model    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│               Data Layer                     │
│                                              │
│ Database │ Analysis Records │ Incidents      │
└──────────────────────────────────────────────┘
```

---

# 🧰 Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Axios

### Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic

### Audio / ML
- PyTorch
- Librosa
- NumPy
- SciPy
- MFCC / spectral audio features

### Database
- PostgreSQL for production/deployment
- SQLite-compatible development configuration where applicable

### Infrastructure
- Docker
- Docker Compose
- REST API

---

# 📁 Project Structure

```text
Voiceguard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── ml/
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.*
├── docker/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 🔌 API

## Health

```http
GET /api/health
```

```http
GET /api/system/health
```

## Analysis

```http
POST /api/analysis/analyze
```

Analyzes an uploaded audio file.

Typical analysis information includes:
- classification
- confidence
- anomaly score
- risk
- security action
- model
- analysis ID

## Analysis History

```http
GET /api/analyses
```

## Incidents

```http
GET /api/incidents
```

---

# 🚀 Local Installation

## Requirements
- Python 3.11+
- Node.js 20+
- npm
- PostgreSQL for production-style deployment
- Docker & Docker Compose (optional)

## 1. Clone

```bash
git clone https://github.com/Abhineet1124/Voiceguard.git
cd Voiceguard
```

## 🐍 Backend

```bash
cd backend
```

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Linux/macOS

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

## ⚛️ Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

The Vite development server proxies API requests to the backend.

---

# 🐳 Docker

```bash
docker compose up --build
```

---

# 🧪 Testing

## Backend Health

```bash
curl http://localhost:8000/api/health
```

## API Documentation

Open:

```text
http://localhost:8000/docs
```

FastAPI provides interactive API documentation.

---

# 🔄 End-to-End Workflow

```text
1. User uploads or records audio
2. Frontend validates input
3. Audio sent to FastAPI
4. Backend validates audio
5. Audio features extracted
6. baseline-audio-v1 performs analysis
7. Classification generated
8. Confidence/anomaly information calculated
9. Risk level determined
10. Security action determined
11. Analysis stored
12. Incident generated when applicable
13. Dashboard/history updated
```

---

# 🔐 Security

VoiceGuard follows:
- Audio upload validation
- File-size restrictions
- Audio-format validation
- Environment variables for secrets
- CORS configuration
- Database connection management
- Integrity fingerprints
- Error handling
- Frontend/backend separation

### Never commit secrets

Do not commit:
```text
.env
API keys
database passwords
private credentials
production secrets
```

Use:
```text
.env.example
```
for configuration templates.

---

# 📊 Current Development Status

| Component | Status |
|---|---|
| React/Vite frontend | ✅ Working |
| Tailwind cybersecurity UI | ✅ Working |
| Dashboard | ✅ Implemented |
| Audio upload | ✅ Implemented |
| Microphone recording | ✅ Implemented |
| FastAPI backend | ✅ Working |
| Health API | ✅ Tested |
| Audio analysis API | ✅ Tested |
| Analysis history | ✅ Implemented |
| Risk assessment | ✅ Implemented |
| Security decision | ✅ Implemented |
| Incident structure | ✅ Implemented |
| SHA-256 integrity fingerprint | ✅ Implemented |
| Baseline audio model | ✅ Implemented |
| Production anti-spoofing model | ⏳ Future |
| Advanced analytics | ⏳ In progress |
| Blockchain anchoring | ⏳ Future |
| Authentication | ⏳ Future |
| Production security hardening | ⏳ Future |

---

# 🗺️ Roadmap

## Phase 1 — Foundation
**Completed**
- React dashboard
- FastAPI backend
- API structure
- Database structure
- Dark cybersecurity UI
- Basic audio analysis contract

## Phase 2 — Audio Pipeline
**In Progress**
- Audio validation
- Preprocessing
- Resampling
- Normalization
- Feature extraction
- Audio playback
- Processing states
- Improved recording workflow

## Phase 3 — ML Detection
**Next Major ML Milestone**
- Proper anti-spoofing dataset
- CNN/transformer-based model
- Training pipeline
- Validation pipeline
- Model evaluation
- Confidence calibration
- ROC-AUC
- Precision
- Recall
- F1 score
- False acceptance/rejection analysis

## Phase 4 — Risk Engine
- Risk calibration
- Threat scoring
- Security policies
- Configurable decision thresholds
- Action recommendations

## Phase 5 — Security Logging
- Structured event logging
- Tamper-evident event records
- Hash chaining
- Incident lifecycle
- Event verification

## Phase 6 — Analytics
- Historical trends
- Detection statistics
- Risk distribution
- Model performance monitoring
- Exportable reports

## Phase 7 — Real-Time Voice
- Browser microphone streaming
- Real-time processing
- Streaming analysis
- Live risk indicators
- Call/security workflow integration

## Phase 8 — Security Hardening
- Authentication
- Authorization
- Rate limiting
- Input hardening
- Audit logging
- Secure deployment configuration

## Phase 9 — SIH Demo & Production Polish
- Complete demo workflow
- Performance optimization
- Deployment
- Documentation
- Monitoring
- Presentation-ready analytics

---

# 🧠 Future AI Improvements

The long-term model should move beyond handcrafted/rule-based acoustic scoring.

```text
Raw Audio
    ↓
Log-Mel Spectrogram
    ↓
CNN / Transformer Encoder
    ↓
Speaker / Channel Robustness
    ↓
Anti-Spoofing Classifier
    ↓
Calibration
    ↓
Risk Engine
```

Potential future capabilities:
- AI voice-clone detection
- Replay attack detection
- Synthetic speech detection
- Speaker verification
- Multilingual Indian-language support
- Cross-dataset evaluation
- Robustness against compression/noise
- Model monitoring
- Continuous model improvement

---

# 🇮🇳 Indian Cybersecurity Applications

Potential applications:
- Banking fraud prevention
- UPI/social-engineering protection
- Call-center security
- Customer authentication
- Government service protection
- Telecom security
- Digital identity protection
- Fraud investigation

---

# 🏆 Smart India Hackathon

VoiceGuard is being developed as a Smart India Hackathon 2026 project under:

**SIH26104 — Blockchain & Cybersecurity**

The system is designed around:

> **Detect → Verify → Prevent**

The goal is to demonstrate how AI-based audio analysis can become part of a larger cybersecurity decision system.

---

# ⚠️ Project Disclaimer

VoiceGuard is a research/prototype cybersecurity project.

Detection results should not be treated as definitive proof of authenticity without appropriate validation.

The current `baseline-audio-v1` model is an experimental baseline. Production deployment requires a properly trained, independently evaluated anti-spoofing model and security validation.

---

# 📄 License

MIT License

---

# 👥 Team

**Binary Builders**

Smart India Hackathon 2026

---

# 🔗 Repository

https://github.com/Abhineet1124/Voiceguard

---

**Last Updated:** 2026

**Current Focus:** Complete audio pipeline → production-grade anti-spoofing model → risk engine → security logging → SIH demo polish
