#!/bin/bash
set -e

echo "🛡️  VoiceGuard - Setup Script"
echo "=============================="

# Create directories if needed
mkdir -p backend/app/{api,core,models,schemas,services,ml}
mkdir -p frontend/src/{pages,components,services,hooks,types,utils}
mkdir -p ml/{datasets,preprocessing,features,models,training,evaluation,notebooks}
mkdir -p docs

# Backend setup
echo "📦 Setting up backend..."
cd backend
python -m venv venv
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
pip install -r requirements.txt
cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend
npm install --legacy-peer-deps
cd ..

# Environment setup
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL:"
echo "   docker run -d --name voiceguard-db -e POSTGRES_USER=voiceguard -e POSTGRES_PASSWORD=voiceguard -e POSTGRES_DB=voiceguard -p 5432:5432 postgres:16-alpine"
echo ""
echo "2. Run backend:"
echo "   cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "3. Run frontend (new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "Access: http://localhost:5173"
