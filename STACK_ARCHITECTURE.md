# Technology Stack & Architecture - Simple & Ready-to-Use

## Recommended Stack (Hackathon-Optimized)

### Frontend (PWA)
- **Framework**: Next.js 14 (App Router)
- **PWA**: next-pwa plugin
- **Styling**: Tailwind CSS + shadcn/ui (copy-paste components)
- **Camera**: react-webcam (simple hook)
- **State**: React Context (built-in, no extra lib)

### Backend
- **Framework**: Next.js API Routes (same repo as frontend)
  - **Limitation**: 10s timeout (Hobby), 60s (Pro), 300s (Enterprise)
  - **Limitation**: 4.5MB request body limit
  - **Solution**: Use background jobs for heavy tasks
- **Auth**: Clerk (5-minute setup, free tier)
- **Realtime**: Pusher (drop-in WebSocket alternative)
- **Background Jobs**: Trigger.dev or Inngest (handles long-running tasks)

### Database
- **MongoDB Atlas** (Free tier: 512MB)
  - User profiles
  - Exercise plans
  - Progress tracking
  - Session history

### Queue/Scheduling
- **Vercel Cron Jobs** (built-in, zero config)
- **OR Trigger.dev** (visual workflow builder, easy)

### AI Services (All Ready-to-Use APIs)

**Pose Detection:**
- **MediaPipe Pose** (runs in browser, FREE, no training)
  - 33 body landmarks in real-time
  - Works offline after load
  - Simple JavaScript API

**AI Analysis:**
- **GPT-4 Vision** (OpenAI)
  - Send video frames → get feedback
  - No training needed
  - Works out of the box

**LLM:**
- **Claude 3.5 Sonnet** (Anthropic)
  - Exercise plan generation
  - Progress analysis
  - Personalized coaching

**Voice:**
- **ElevenLabs API**
  - Text-to-speech
  - Natural voices
  - Streaming support

**Video Generation:**
- **Replicate API** (Pre-trained models, no training)
  - Stable Video Diffusion
  - Simple REST API
  - Pay per generation

### Storage
- **Cloudinary** (Free tier: 25GB)
  - Auto video optimization
  - Built-in CDN
  - Simple upload widget

### Deployment
- **Vercel** (Next.js optimized, one-click deploy)
- **MongoDB Atlas Cloud** (managed)

## Simplified Architecture

```text
┌─────────────────────────────────────────┐
│        PWA (Next.js)                    │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ react-webcam │  │ MediaPipe Pose  │ │
│  │ (Camera)     │  │ (Browser-side)  │ │
│  └──────────────┘  └─────────────────┘ │
└──────────────┬──────────────────────────┘
               │ REST API (Fast requests)
               │ Direct Upload (Videos)
┌──────────────▼──────────────────────────┐
│     Next.js API Routes (Serverless)     │
│  • Max 10-60s execution time            │
│  • Quick AI calls only                  │
│  • Triggers background jobs             │
└──┬────────┬──────────┬──────────────────┘
   │        │          │
   │        │     ┌────▼─────────────────┐
   │        │     │  Trigger.dev/Inngest │
   │        │     │  (Background Jobs)   │
   │        │     │  • Video generation  │
   │        │     │  • Batch processing  │
   │        │     │  • No timeout limit  │
   │        │     └──────────────────────┘
   │        │          │
   ▼        ▼          ▼
┌────────┐ ┌─────────────────────────────┐
│MongoDB │ │   External APIs             │
│ Atlas  │ │  • GPT-4 Vision (OpenAI)    │
└────────┘ │  • Claude (Anthropic)       │
           │  • ElevenLabs (Voice)       │
           │  • Replicate (Video)        │
           │  • Cloudinary (Storage)     │
           └─────────────────────────────┘
```

## Simple Data Flows

### 1. Initial Assessment (2-3 API calls)
```text
User uploads video → Cloudinary
  ↓
Extract 5-10 frames → Send to GPT-4 Vision
  ↓
Get mobility analysis → Send to Claude
  ↓
Receive exercise plan → Save to MongoDB
```

### 2. Exercise Session (Real-time in browser)
```text
Camera on → MediaPipe detects pose (browser-side, FREE)
  ↓
Calculate angles/positions (simple math in React)
  ↓
When exercise completes → Send summary to GPT-4 Vision
  ↓
Get feedback → Send to Claude for natural language
  ↓
Send text to ElevenLabs → Play audio feedback
  ↓
Save session to MongoDB
```

### 3. Video Generation (Background job - handles serverless timeout)
```text
User completes assessment
  ↓
Next.js API route → Trigger background job (Trigger.dev)
  ↓
Background job calls Replicate API (can take 2-5 min)
  ↓
Job polls Replicate until video ready
  ↓
Save to Cloudinary → Store URL in MongoDB
  ↓
Webhook/polling notifies user (Pusher or PWA notification)
```

## Next.js Serverless Limitations & Solutions

### Issues with Next.js API Routes (Serverless):

**1. Timeout Limits**
- Vercel Hobby: 10 seconds max
- Vercel Pro: 60 seconds max
- Vercel Enterprise: 300 seconds max

**Problem for your app:**
- Video generation can take 2-5 minutes
- Multiple AI API calls in sequence might timeout
- Large video processing will fail

**2. Request Body Size Limit**
- Max 4.5MB on Vercel
- Videos are usually larger

**3. No Persistent Connections**
- Can't maintain WebSocket connections
- Can't run background workers

### Solutions (Already in Stack):

**For Video Uploads:**
- ✅ Use Cloudinary direct upload from browser
- Video never touches your Next.js backend
- No size limit issues

**For Long AI Processing:**
- ✅ Use Trigger.dev or Inngest (background jobs)
- No timeout limits
- Can run for hours if needed
- Free tier available

**For Real-time Updates:**
- ✅ Use Pusher (managed WebSockets)
- Simple API, works with serverless
- Free tier: 200k messages/day

**Workflow:**
```text
Next.js API (< 10s):
  → Quick tasks (auth, DB queries, simple AI calls)
  → Trigger background jobs

Background Jobs (no limit):
  → Video generation (2-5 min)
  → Batch AI processing
  → Long-running analysis

Pusher (real-time):
  → Notify user when job completes
  → Live pose feedback updates
```

### When Next.js Serverless is PERFECT:
- ✅ User authentication
- ✅ Quick database queries
- ✅ Single AI API call (GPT-4 Vision takes ~2-5s)
- ✅ Saving session data
- ✅ Fetching user data

### When you NEED background jobs:
- ❌ Video generation (use Trigger.dev)
- ❌ Processing 100+ video frames
- ❌ Batch operations
- ❌ Anything > 10 seconds

### Alternative: Skip Serverless Entirely (if preferred)

If you want to avoid serverless limitations completely:

**Option A: Railway (Easiest)**
- Deploy Next.js as a long-running server (not serverless)
- No timeout limits
- No request size limits
- Still simple to deploy
- Free $5/month credit

**Option B: Google Cloud Run**
- Container-based deployment
- Up to 60-minute timeout
- Auto-scales to zero (like serverless)
- Pay only for actual usage

**Trade-offs:**
- Slightly more complex than Vercel
- Need to manage deployment yourself
- But: No serverless limitations

**Recommendation:** Stick with Next.js on Vercel + Trigger.dev for hackathon (easier setup). The background jobs handle the timeout issues perfectly.

## Complete Tech Stack (Copy-Paste Ready)

```yaml
Frontend:
  - next: 14.x
  - react: 18.x
  - tailwindcss: 3.x
  - shadcn/ui: (CLI components)
  - react-webcam: 7.x
  - @mediapipe/pose: Latest
  - next-pwa: 5.x

Backend (Same Repo):
  - Next.js API Routes (built-in)
  - @clerk/nextjs: Latest (auth)
  - mongoose: 8.x (MongoDB client)

AI Services (All REST APIs):
  - openai: Latest (GPT-4 Vision)
  - @anthropic-ai/sdk: Latest (Claude)
  - elevenlabs: Latest (Voice)
  - replicate: Latest (Video)

Storage:
  - cloudinary: Latest

Optional:
  - pusher-js: Latest (real-time updates)
  - @trigger.dev/sdk: Latest (background jobs)
```

## Setup Steps (Under 2 hours)

1. **Create Next.js project** (5 min)
   ```bash
   npx create-next-app@latest wellness-pwa
   cd wellness-pwa
   npx shadcn-ui@latest init
   ```

2. **Setup MongoDB Atlas** (10 min)
   - Create free cluster
   - Get connection string
   - Add to `.env.local`

3. **Setup Auth (Clerk)** (5 min)
   - Create account at clerk.com
   - Install `@clerk/nextjs`
   - Add API keys

4. **Setup AI APIs** (10 min)
   - OpenAI: Get API key
   - Anthropic: Get API key
   - ElevenLabs: Use your credits
   - Replicate: Get API key
   - Add all to `.env.local`

5. **Setup Cloudinary** (5 min)
   - Create free account
   - Get upload preset
   - Add credentials

6. **Add MediaPipe** (5 min)
   ```bash
   npm install @mediapipe/pose
   ```

7. **Deploy to Vercel** (2 min)
   ```bash
   vercel deploy
   ```

## Folder Structure (Simple)

```
wellness-pwa/
├── app/
│   ├── api/              # API routes
│   │   ├── assess/       # POST: analyze assessment
│   │   ├── session/      # POST: save session
│   │   ├── feedback/     # POST: generate feedback
│   │   └── video/        # POST: generate video
│   ├── dashboard/        # User dashboard
│   ├── exercise/         # Exercise session page
│   └── assessment/       # Initial assessment
├── components/
│   ├── Camera.tsx        # Webcam + MediaPipe
│   ├── PoseOverlay.tsx   # Visual pose feedback
│   └── VoiceCoach.tsx    # Audio player
├── lib/
│   ├── mongodb.ts        # DB connection
│   ├── openai.ts         # GPT-4 client
│   ├── claude.ts         # Anthropic client
│   └── elevenlabs.ts     # Voice client
└── public/
    └── manifest.json     # PWA manifest
```

## Cost Estimate (Hackathon)

**Free:**
- Next.js/Vercel: Free
- MongoDB Atlas: Free (512MB)
- Cloudinary: Free (25GB)
- Clerk: Free (10k users)
- MediaPipe: FREE (browser-based)

**Paid (Pay-as-you-go):**
- GPT-4 Vision: ~$10 (50-100 assessments)
- Claude API: ~$5 (text generation)
- ElevenLabs: Your credits
- Replicate: ~$5-10 (20-30 videos)

**Total: ~$20-25 + ElevenLabs credits**

## Why This Stack is Perfect for Hackathon

1. **Single Codebase**: Frontend + Backend in one Next.js project
2. **No Custom Training**: All AI models ready-to-use
3. **Free Pose Detection**: MediaPipe runs in browser (unlimited free)
4. **Generous Free Tiers**: Can demo without spending much
5. **Simple Deploy**: One command to Vercel
6. **No DevOps**: Everything is managed/serverless
7. **Fast Development**: Copy-paste components, simple APIs

## Key Libraries (Install)

```bash
npm install mongoose openai @anthropic-ai/sdk elevenlabs replicate cloudinary
npm install @clerk/nextjs react-webcam
npm install @mediapipe/pose @mediapipe/camera_utils
```

Done! Start coding in 30 minutes.
