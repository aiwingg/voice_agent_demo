const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Retell = require('retell-sdk'); // Using the Node SDK for Retell
const axios = require('axios'); // Add axios for making HTTP requests

const app = express();

// Enable CORS if needed for API endpoints
app.use(cors());
app.use(bodyParser.json());

// Your API endpoint to create a web call
const API_KEY = 'key_7335fefc4661ce2fd9f790780ad5';
const AGENT_ID = 'agent_2fb93b1ea040be9ea681f2bc93';
app.post('/api/create-web-call', async (req, res) => {
  try {
    // Extract Telegram ID from request body
    const telegramId = req.body.telegramId || '9280291870';
    
    // Make request to AI Wingg webhook
    const webhookResponse = await axios.post('https://aiwing-vtd-tool-server-39f1cb3ea6a7.herokuapp.com/rag/webhook', {
      call_inbound: {
        from_number: telegramId
      }
    });

    // Extract dynamic variables from the response
    let dynamicVars = webhookResponse.data.call_inbound.dynamic_variables;
    delete dynamicVars['purchase_history'];
    dynamicVars['planned_delivery_date'] = "2025-08-29 Friday"
    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: AGENT_ID,
      metadata: { demo: true },
      retell_llm_dynamic_variables: dynamicVars,
    });

    res.status(201).json(webCallResponse);
  } catch (error) {
    console.error('Error creating web call:', error);
    res.status(500).json({ error: 'Error creating web call' });
  }
});

// Serve React build
app.use(express.static(path.join(__dirname, 'client', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
