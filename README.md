# Voice Agent Demo

This demo consists of an Express backend, a React frontend, and optional Telegram bot.
The app now uses the `sycoraxai-voice-assistants` package to connect to TargetAI.

## Setup

1. Install dependencies in the root and `client` directories:
   ```bash
   npm install
   cd client && npm install
   ```
2. Copy `.env.example` to `.env` and fill in your TargetAI credentials.
3. Start the server:
   ```bash
   npm start
   ```
   The React client is served from the Express app on port `3001` by default.

## Environment Variables

```
TARGETAI_API_KEY=your-api-key
TARGETAI_BASE_URL=https://app.targetai.ai
TARGETAI_AGENT_UUID=c64c4978-2a6a-4d9b-92eb-635d6f079a02
REACT_APP_TARGETAI_RUNTIME_URL=https://runtime.targetai.ai
REACT_APP_TARGETAI_TOKEN_URL=http://localhost:3001/token
REACT_APP_TARGETAI_AGENT_UUID=c64c4978-2a6a-4d9b-92eb-635d6f079a02
```

## Testing

From the `client` directory run `npm test` to execute the default React tests.
