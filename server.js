require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // Used for making HTTP requests

const app = express();

// Enable CORS if needed for API endpoints
app.use(cors());
app.use(bodyParser.json());

// Token endpoint for TargetAI
const API_KEY = process.env.TARGETAI_API_KEY;
const BASE_URL = process.env.TARGETAI_BASE_URL;

app.post('/token', async (req, res) => {
  try {
    const resp = await axios.post(`${BASE_URL}/token`, req.body || {}, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    res.json({ token: resp.data.token });
  } catch (err) {
    console.error('Error creating TargetAI token:', err.message);
    res.status(500).json({ error: 'Error creating token' });
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
