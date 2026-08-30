# VOICEGUARD
**AI-Powered Real-Time Voice Clone Detection & Prevention System**

Detect. Verify. Prevent.

## Smart India Hackathon 2026
- **Problem ID:** SIH26104
- **Theme:** Blockchain & Cybersecurity
- **Category:** Software
- **Team:** Binary Builders

## Overview
VoiceGuard is a cybersecurity platform that detects whether speech is genuine or AI-generated/cloned in real-time. The system calculates confidence scores and risk assessments, enabling automated security decisions.

## Architecture
```
Voice Input → Validation → Preprocessing → Feature Extraction → ML Detection 
→ Risk Assessment → Decision Engine → Secure Logging → Dashboard
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite + Tailwind CSS
- Recharts for analytics
- Axios for API calls

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy ORM
- Uvicorn

### ML/Audio
- PyTorch
- Librosa
- NumPy, SciPy

## Phase 1: Foundation (Current)
✅ React dashboard with dark cybersecurity aesthetic
✅ FastAPI backend with health checks
✅ PostgreSQL database schema
✅ Audio upload endpoint
✅ Basic analysis contract
✅ Docker configuration

## Phase 2: Audio Pipeline (Next)
- Audio validation (format, duration, sample rate)
- Preprocessing (resampling, normalization, noise reduction)
- Feature extraction (Mel spectrogram, MFCC)
- Audio playback in UI
- Processing status indicators

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optional)

### Quick Start (Local)

1. **Clone and setup:**
```bash
cd voiceguard

# Create .env
cp .env.example .env

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

2. **Start PostgreSQL:**
```bash
# Using Docker
docker run -d \
  --name voiceguard-db \
  -e POSTGRES_USER=voiceguard \
  -e POSTGRES_PASSWORD=voiceguard \
  -e POSTGRES_DB=voiceguard \
  -p 5432:5432 \
  postgres:16-alpine
```

3. **Run backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. **Run frontend (new terminal):**
```bash
cd frontend
npm run dev
```

Access: http://localhost:5173

### Docker Setup
```bash
docker compose up --build
```

Access frontend at http://localhost:5173, backend at http://localhost:8000

## API Endpoints

### Health & Status
- `GET /api/health` - System health check
- `GET /api/system/health` - System status

### Analysis
- `POST /api/analyze` - Analyze uploaded audio
- `GET /api/analyses` - List all analyses
- `GET /api/analysis/{id}` - Get specific analysis

### Coming Soon (Phase 5+)
- `GET /api/incidents` - Security incidents
- `POST /api/logs/verify` - Event chain verification
- `GET /api/dashboard/stats` - Analytics

## Project Structure
```
voiceguard/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Config & database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (Phase 2+)
│   │   ├── ml/            # ML pipeline (Phase 3+)
│   │   └── main.py        # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components (Phase 2+)
│   │   ├── services/      # API client
│   │   └── App.tsx
│   └── package.json
├── docker/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Development Roadmap

| Phase | Focus | Timeline |
|-------|-------|----------|
| 1 | Foundation & Structure | ✅ Complete |
| 2 | Audio Pipeline | In Progress |
| 3 | ML Baseline (CNN) | Week 2 |
| 4 | Risk Engine | Week 3 |
| 5 | Security Logging | Week 3 |
| 6 | Analytics Dashboard | Week 4 |
| 7 | Real-Time Recording | Week 4 |
| 8 | Security Hardening | Week 5 |
| 9 | SIH Demo Polish | Week 5-6 |

## Features (Roadmap)

### Current
- ✅ Web-based dashboard
- ✅ Audio file upload
- ✅ API structure

### Phase 2
- Audio validation & preprocessing
- Mel spectrogram visualization
- Processing status tracking

### Phase 3
- CNN-based detection
- Model inference
- Confidence scoring

### Phase 4
- Risk classification engine
- Decision automation
- Action recommendations

### Phase 5-9
- Security event logging & hashing
- Incident management dashboard
- Analytics with real data
- Live microphone recording
- User authentication
- Rate limiting
- Blockchain integration
- Advanced model architectures

## Testing

### Backend Health Check
```bash
curl http://localhost:8000/api/health
```

### Test Upload
Use the UI or:
```bash
curl -X POST -F "file=@test_audio.wav" \
  http://localhost:8000/api/analyze
```

## Important Notes

1. **No Fake Data:** All metrics, predictions, and statistics are generated from actual inference and database records.
2. **Modular Design:** Features are built incrementally. Placeholder implementations are clearly marked.
3. **SIH Ready:** Every completed phase produces demonstrable proof for hackathon judging.

## Security Considerations

- Input validation on all file uploads
- Size restrictions (50MB default)
- Audio format whitelisting
- No raw audio storage without explicit configuration
- Environment variables for secrets
- CORS configuration
- Database connection pooling

## Future Extensions

- Multilingual Indian language support
- Live phone-call integration
- Banking fraud detection
- Telecom system integration
- Speaker verification
- Multimodal deepfake detection
- Blockchain anchoring for critical events
- Model monitoring & continuous learning

## Documentation

- API docs: http://localhost:8000/docs (auto-generated OpenAPI)
- Architecture: See individual phase documentation
- Dataset guide: Coming Phase 3
- Model training: Coming Phase 3

## Contributing

This is a Smart India Hackathon project. Code follows:
- Clean, readable Python/TypeScript
- Type hints throughout
- Clear separation of concerns
- Comprehensive error handling

## License
MIT License

## Contact
Binary Builders - Smart India Hackathon 2026

---

**Last Updated:** Phase 1 Complete
**Next Focus:** Phase 2 - Audio Pipeline
