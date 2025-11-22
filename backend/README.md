# Call Interceptor Backend

FastAPI backend for the Call Interceptor POC.

## Features

- Audio recording upload and storage (MinIO/S3)
- Speech-to-text transcription (OpenAI Whisper)
- AI-powered scam detection (Anthropic Claude)
- MongoDB for data persistence
- WebSocket support for real-time updates

## Setup

### Prerequisites

- Python 3.11+
- uv package manager
- Docker and Docker Compose (for MongoDB and MinIO)

### Installation

1. Install dependencies with uv:
```bash
uv sync
```

2. Copy environment variables:
```bash
cp .env.example ../.env
```

3. Update `.env` with your API keys:
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- ELEVENLABS_API_KEY (optional for future features)

### Running

1. Start MongoDB and MinIO:
```bash
cd ..
docker-compose up -d
```

2. Run the development server:
```bash
uv run python run.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Recordings

- `POST /api/v1/recordings/upload` - Upload audio recording
- `GET /api/v1/recordings/{id}` - Get recording details
- `GET /api/v1/recordings/` - List all recordings
- `DELETE /api/v1/recordings/{id}` - Delete recording

### Health

- `GET /health` - Health check endpoint
- `GET /` - API info

## Architecture

```
backend/
├── app/
│   ├── api/           # API endpoints
│   ├── core/          # Core configuration and utilities
│   ├── models/        # Data models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic services
│   └── main.py        # FastAPI application
├── pyproject.toml     # Project dependencies
└── run.py            # Application entry point
```

## Development

Run with auto-reload:
```bash
uv run python run.py
```

Format code:
```bash
uv run black app/
```

Run linter:
```bash
uv run ruff check app/
```
