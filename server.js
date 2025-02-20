

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Retell = require('retell-sdk'); // Using the Node SDK for Retell

const app = express();

// Enable CORS if needed for API endpoints (if client is on same domain, this may be optional)
app.use(cors());
app.use(bodyParser.json());

// Your API endpoint to create a web call
const API_KEY = 'key_7335fefc4661ce2fd9f790780ad5';
const AGENT_ID = 'agent_b19c554e70917646fe6425fc68';

app.post('/api/create-web-call', async (req, res) => {
  try {
    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: AGENT_ID,
      metadata: { demo: true },
      retell_llm_dynamic_variables: {},
    });
    res.status(201).json(webCallResponse);
  } catch (error) {
    console.error("Error creating web call:", error);
    res.status(500).json({ error: "Error creating web call" });
  }
});

// Serve the static files from the React app build
app.use(express.static(path.join(__dirname, 'client', 'build')));

// For any other requests, serve the React app's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});