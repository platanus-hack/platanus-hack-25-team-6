# Call Interceptor - Scam Detection POC

A proof-of-concept application for detecting scam calls using AI-powered transcription and analysis.

## Overview

This application allows users to:
1. **Record** phone conversations via a web interface
2. **Transcribe** audio using OpenAI Whisper
3. **Analyze** conversations for scam indicators using Anthropic Claude
4. **Alert** users with browser notifications when scams are detected

## Architecture

```
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Configuration and database
│   │   ├── models/   # Data models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic (transcription, scam detection)
│   └── pyproject.toml
│
├── frontend/         # React PWA frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   └── services/    # API client
│   └── package.json
│
└── docker-compose.yml   # MongoDB + MinIO services
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **uv** - Fast Python package manager
- **MongoDB** - Document database for storing recordings and analysis
- **MinIO** - S3-compatible object storage for audio files
- **OpenAI Whisper** - Speech-to-text transcription
- **Anthropic Claude** - AI-powered scam detection

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **PWA** - Progressive Web App with offline support
- **Web Audio API** - Browser audio recording
- **Notifications API** - Browser notifications for scam alerts

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- uv package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

## Setup

### 1. Clone and Configure

```bash
# Navigate to project directory
cd /path/to/poc

# Copy environment variables
cp backend/.env.example .env
```

### 2. Update API Keys in `.env`

```env
# Required API keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

### 3. Start Infrastructure

```bash
# Start MongoDB and MinIO
docker-compose up -d

# Verify services are running
docker-compose ps
```

Access MinIO console at http://localhost:9001 (minioadmin/minioadmin123)

### 4. Start Backend

```bash
cd backend

# Install dependencies with uv
uv sync

# Run development server
uv run python run.py
```

Backend will be available at http://localhost:8000

API docs: http://localhost:8000/docs

### 5. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at http://localhost:3000

## Usage

### Live Monitoring Mode (NEW!)
1. **Enable Notifications** - Click "Enable Alerts" to receive scam warnings
2. **Select Mode** - Click "Live Monitoring" tab
3. **Start Monitoring** - Click "Start Live Monitoring" and grant microphone access
4. **Speak or Listen** - The system monitors the conversation in real-time
5. **View Analysis** - See live transcript and risk level updates
6. **Get Instant Alerts** - Receive immediate notifications for scams
7. **Stop** - Click "Stop Monitoring" when done

### Upload & Analyze Mode
1. **Enable Notifications** - Click "Enable Alerts" in the header
2. **Select Mode** - Click "Upload & Analyze" tab
3. **Record Audio** - Click "Start Recording" and speak or play a conversation
4. **Upload** - Click "Upload & Analyze" to process the recording
5. **View Results** - Watch the analysis appear (10-30 seconds)
6. **Get Alerts** - Receive notifications for high-risk detections

## Features

### 🔴 NEW: Real-Time Scam Detection
- **Live audio streaming** via WebSocket
- **OpenAI Realtime API** with GPT-4o for instant analysis
- **Real-time transcription** as you speak
- **Immediate scam alerts** (< 1 second latency)
- **Continuous risk monitoring** during conversations
- See [REALTIME_GUIDE.md](REALTIME_GUIDE.md) for details

### Recording & Storage
- Browser-based audio recording using Web Audio API
- Upload to MinIO (S3-compatible) storage
- Support for multiple audio formats (WebM, WAV, MP3)
- Two modes: **Live Monitoring** or **Upload & Analyze**

### Transcription
- **Real-time**: OpenAI Realtime API with Whisper integration
- **Upload**: OpenAI Whisper for file-based transcription
- Multi-language support
- Duration tracking

### Scam Detection
- **Real-time**: GPT-4o continuous conversation analysis
- **Upload**: Anthropic Claude Sonnet deep analysis
- Risk levels: Low, Medium, High, Critical
- Confidence scoring
- Specific scam indicator detection:
  - Urgency tactics
  - Personal information requests
  - Payment via gift cards/wire transfers
  - Government impersonation
  - Tech support scams
  - Prize/lottery scams
  - Threats and intimidation

### Notifications
- Real-time browser notifications
- Automatic alerts for high-risk calls
- Vibration patterns based on risk level
- Immediate warnings during live calls

### PWA Features
- Installable on mobile and desktop
- Offline support
- Native-like experience

## API Endpoints

### Recordings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/recordings/upload` | Upload audio recording |
| GET | `/api/v1/recordings/{id}` | Get recording details |
| GET | `/api/v1/recordings/` | List all recordings |
| DELETE | `/api/v1/recordings/{id}` | Delete recording |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API info |

## Development

### Backend

```bash
# Run with auto-reload
cd backend
uv run python run.py

# Format code
uv run black app/

# Lint
uv run ruff check app/
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Database

```bash
# Access MongoDB
docker exec -it call-interceptor-mongo mongosh -u admin -p password123

# View recordings collection
use wellness
db.recordings.find().pretty()
```

### Storage

MinIO Console: http://localhost:9001
- Username: minioadmin
- Password: minioadmin123

## Future Enhancements

### Twilio Integration
- Incoming call webhooks
- Conference call routing
- Real-time audio streaming
- Call forwarding based on scam detection

### Celery Task Queue
- Asynchronous processing
- Retry logic for failed transcriptions
- Scheduled cleanup of old recordings

### ElevenLabs Integration
- Text-to-speech warnings
- Voice cloning detection
- Real-time audio generation

### Enhanced Notifications
- SMS alerts via Twilio
- Email notifications
- Family member notifications
- Emergency contact alerts

### Machine Learning
- Custom scam detection models
- Pattern recognition
- Historical analysis
- Caller ID reputation scoring

## Troubleshooting

### Backend fails to start
- Check MongoDB is running: `docker-compose ps`
- Verify API keys in `.env`
- Check Python version: `python --version` (needs 3.11+)

### Frontend can't connect to backend
- Verify backend is running on port 8000
- Check CORS settings in `backend/app/core/config.py`
- Clear browser cache and reload

### Recording not working
- Grant microphone permission in browser
- Check browser compatibility (Chrome/Edge recommended)
- Verify HTTPS or localhost (required for microphone access)

### Transcription fails
- Verify OpenAI API key is valid
- Check audio file format is supported
- Ensure audio has clear speech content

## License

This is a proof-of-concept for educational purposes.

## Security Notes

- Never commit `.env` file with real API keys
- Use HTTPS in production
- Implement proper authentication before deploying
- Sanitize user inputs
- Rotate API keys regularly
- Monitor API usage and costs

## Contributing

This is a POC project. For production use, consider:
- Adding user authentication (JWT, OAuth)
- Implementing rate limiting
- Adding comprehensive error handling
- Writing unit and integration tests
- Setting up CI/CD pipeline
- Implementing proper logging and monitoring
