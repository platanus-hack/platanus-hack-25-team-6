# Call Interceptor Frontend

React PWA frontend for the Call Interceptor scam detection system.

## Features

- Audio recording using Web Audio API
- Real-time recording status display
- Automatic upload and processing
- Live updates of analysis results
- Browser notifications for scam alerts
- Progressive Web App (installable)
- Responsive design for mobile and desktop

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Components

### AudioRecorder
Records audio using the browser's MediaRecorder API and uploads to the backend.

### RecordingsList
Displays all recordings with their analysis status and results. Polls for updates on processing recordings.

### Hooks

#### useAudioRecorder
Manages audio recording state and MediaRecorder API.

#### useNotifications
Handles browser notification permissions and displays scam alerts.

## Browser Compatibility

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

Note: Microphone access requires HTTPS or localhost.

## PWA Features

- Offline support via service worker
- Installable on mobile and desktop
- Native app-like experience
- Push notifications support

To install:
1. Visit the app in a supported browser
2. Look for the "Install" prompt or menu option
3. Click "Install" to add to home screen
