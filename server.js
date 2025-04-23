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
const AGENT_ID = 'agent_838c0e063de92ecdacfa548307';

app.post('/api/create-web-call', async (req, res) => {
  try {
    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: AGENT_ID,
      metadata: { demo: true },
      retell_llm_dynamic_variables: {
        'user_number': '9280291870',
        'name': 'Крокус ООО',
        'purchase_history': '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]\n - Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]\n - Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]\n - 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]\n - 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
      },
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