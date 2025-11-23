# team-6 Platanus Hack Project

**Current project logo:** project-logo.png

<img src="./project-logo.png" alt="Project Logo" width="200" />

Submission Deadline: 23rd Nov, 9:00 AM, Chile time.

Track: ✨ consumer AIE

team-6

- Dafne Arriagada ([@Dafnemami](https://github.com/Dafnemami))
- Emilio Izzo ([@emilioizzo6](https://github.com/emilioizzo6))
- Carlos Paredes ([@CarloGauss33](https://github.com/CarloGauss33))
- Valentina Campaña ([@aerotecnia99](https://github.com/aerotecnia99))

Before Submitting:

- ✅ Set a project name and description in platanus-hack-project.json

- ✅ Provide a 1000x1000 png project logo, max 500kb

- ✅ Provide a concise and to the point readme.

---

## Real-Time Scam Detection

### The Problem

Phone scams are a growing epidemic in Latin America, particularly in Chile. Scammers use sophisticated techniques like impersonating family members in distress, fake banking representatives, or false job offers to exploit victims. These attacks often target vulnerable populations, including the elderly, causing significant financial and emotional damage. Traditional call blocking isn't enough—scammers constantly evolve their tactics and many attacks happen in real-time conversations.

### Our Solution

An AI-powered phone call protection system that detects scam attempts in real-time for Chilean and Latin American users.

### How It Works

1. **Call Intercept**: When a suspected scam call comes in, the system intercepts it and joins an AI agent via conference call
2. **Real-Time Transcription**: Whisper API transcribes the conversation as it happens
3. **Scam Detection**: Claude Haiku analyzes the transcription to identify scam patterns and risk indicators
4. **User Protection**: The system alerts users to potential scams during or after the call

### Technologies

- **Backend**: Node.js with Express
- **AI Models**:
  - OpenAI Whisper (speech-to-text)
  - Claude Haiku (scam detection analysis)
  - ElevenLabs (voice generation)
- **Telephony**: Twilio (call handling and conferencing)
- **Database**: MongoDB
- **Real-time**: WebSocket for live updates
- **Notifications**: Kapso API (WhatsApp notifications and OTP)

### Features

- Real-time call monitoring and analysis
- Trusted contacts management
- Scam pattern recognition tailored for Chilean/Latin American scams
- **Impersonation prevention**: Detects when scammers impersonate family members or known contacts and sends immediate WhatsApp alerts
- WhatsApp notifications and OTP via Kapso API
- Onboarding flow for new users
