#!/bin/bash

set -e

echo "🚀 Setting up Call Interceptor POC..."
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v uv &> /dev/null; then
    echo "⚠️  uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

echo "✓ All prerequisites found"
echo ""

# Setup environment
echo "📝 Setting up environment..."
if [ ! -f .env ]; then
    cp backend/.env.example .env
    echo "✓ Created .env file"
    echo "⚠️  Please update .env with your API keys:"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo ""
    read -p "Press enter to continue after updating .env..."
else
    echo "✓ .env file already exists"
fi

# Start infrastructure
echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d
echo "✓ MongoDB and MinIO started"
echo ""

# Setup backend
echo "🐍 Setting up backend..."
cd backend
uv sync
echo "✓ Backend dependencies installed"
cd ..
echo ""

# Setup frontend
echo "⚛️  Setting up frontend..."
cd frontend
npm install
echo "✓ Frontend dependencies installed"
cd ..
echo ""

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Start the backend:"
echo "   cd backend"
echo "   uv run python run.py"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "4. Access services:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"
echo ""
echo "Happy coding! 🎉"
