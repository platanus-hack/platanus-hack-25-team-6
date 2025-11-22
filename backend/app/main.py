from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.config import get_settings
from .core.database import connect_to_mongo, close_mongo_connection
from .api import recordings, twilio_calls

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="Call Interceptor API",
    description="API for recording, transcribing, and analyzing phone calls for scam detection",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(recordings.router, prefix=settings.api_prefix)
app.include_router(twilio_calls.router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    return {
        "message": "Call Interceptor API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment
    }
