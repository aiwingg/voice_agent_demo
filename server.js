const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Retell = require('retell-sdk'); // Using the Node SDK for Retell
const fetch = require('node-fetch');

const app = express();

// Enable CORS if needed for API endpoints (if client is on same domain, this may be optional)
app.use(cors());
app.use(bodyParser.json());

// Your API endpoint to create a web call
const API_KEY = 'key_7335fefc4661ce2fd9f790780ad5';
const DEFAULT_AGENT_ID = 'agent_838c0e063de92ecdacfa548307';
const GOOGLE_SHEETS_WEBAPP_URL =
  process.env.GOOGLE_SHEETS_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbwnxiN-uV0ZkR3N6UdNckKlYt1vbt0pWWMzs/exec';

const DEFAULT_PURCHASE_HISTORY =
  '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]\n - Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]\n - Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]\n - 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]\n - 1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]';

const STATIC_COMPANY_DATA = {
  '9280291870': {
    companyId: '9280291870',
    companyName: 'Крокус ООО',
    agentId: 'agent_838c0e063de92ecdacfa548307',
    metadata: { demo: true },
    retell_llm_dynamic_variables: {
      user_number: '9280291870',
      name: 'Крокус ООО',
      purchase_history: DEFAULT_PURCHASE_HISTORY
    },
    source: 'fallback'
  },
  krokus: {
    companyId: 'krokus',
    companyName: 'Крокус ООО',
    agentId: 'agent_838c0e063de92ecdacfa548307',
    metadata: { demo: true },
    retell_llm_dynamic_variables: {
      user_number: '9280291870',
      name: 'Крокус ООО',
      purchase_history: DEFAULT_PURCHASE_HISTORY
    },
    source: 'fallback'
  }
};

const NORMALIZED_STATIC_KEYS = Object.keys(STATIC_COMPANY_DATA).reduce((acc, key) => {
  const normalized = key.trim().toLowerCase();
  acc[normalized] = STATIC_COMPANY_DATA[key];
  return acc;
}, {});

async function tryFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Lookup request failed with status ${response.status}`);
  }
  return response.json();
}

async function fetchCompanyConfig(companyId) {
  if (!companyId) {
    return null;
  }

  const normalizedId = companyId.trim().toLowerCase();
  const fromStatic = NORMALIZED_STATIC_KEYS[normalizedId];

  const baseUrl = GOOGLE_SHEETS_WEBAPP_URL;
  const attempts = [];

  if (baseUrl) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    attempts.push(`${baseUrl}${separator}companyId=${encodeURIComponent(companyId)}`);
    attempts.push(`${baseUrl}${separator}company_id=${encodeURIComponent(companyId)}`);
  }

  for (const url of attempts) {
    try {
      const payload = await tryFetchJson(url, { timeout: 5000 });
      if (!payload) {
        continue;
      }

      const resolvedAgentId =
        payload.agent_id || payload.agentId || payload.agent || fromStatic?.agentId || DEFAULT_AGENT_ID;
      const resolvedMetadata = {
        ...(payload.metadata || {}),
        ...(fromStatic?.metadata || {})
      };
      const resolvedDynamicVariables =
        payload.retell_llm_dynamic_variables || payload.dynamicVariables || fromStatic?.retell_llm_dynamic_variables;

      return {
        companyId: payload.company_id || payload.companyId || companyId,
        companyName: payload.company_name || payload.companyName || payload.name || fromStatic?.companyName,
        agentId: resolvedAgentId,
        metadata: Object.keys(resolvedMetadata).length ? resolvedMetadata : undefined,
        retell_llm_dynamic_variables: resolvedDynamicVariables,
        source: 'google-sheets'
      };
    } catch (error) {
      console.warn(`Failed to fetch company config from ${url}:`, error.message);
    }
  }

  if (fromStatic) {
    return { ...fromStatic };
  }

  return null;
}

app.get('/api/company-config', async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId query parameter is required' });
  }

  try {
    const config = await fetchCompanyConfig(companyId);

    if (!config) {
      return res.status(404).json({ error: 'Company not found in configuration' });
    }

    return res.json(config);
  } catch (error) {
    console.error('Error resolving company configuration:', error);
    return res.status(500).json({ error: 'Failed to resolve company configuration' });
  }
});

app.post('/api/create-web-call', async (req, res) => {
  try {
    const retellClient = new Retell({ apiKey: API_KEY });
    const {
      companyId,
      agentId: agentOverride,
      metadata: metadataOverride,
      dynamicVariables
    } = req.body || {};

    const metadataPayload =
      metadataOverride && typeof metadataOverride === 'object' ? metadataOverride : {};
    const dynamicPayload =
      dynamicVariables && typeof dynamicVariables === 'object' ? dynamicVariables : undefined;

    let agentId = agentOverride || DEFAULT_AGENT_ID;
    let metadata = { ...metadataPayload };
    let llmVariables = dynamicPayload;

    if (companyId) {
      const companyConfig = await fetchCompanyConfig(companyId);
      if (companyConfig) {
        agentId = companyConfig.agentId || agentId;
        metadata = {
          ...(companyConfig.metadata || {}),
          ...metadata
        };
        if (companyConfig.retell_llm_dynamic_variables) {
          llmVariables = {
            ...(companyConfig.retell_llm_dynamic_variables || {}),
            ...(llmVariables || {})
          };
        }
      }
    }

    if (!metadata || Object.keys(metadata).length === 0) {
      metadata = { demo: true };
    }

    const callPayload = {
      agent_id: agentId,
      metadata
    };

    if (llmVariables && Object.keys(llmVariables).length > 0) {
      callPayload.retell_llm_dynamic_variables = llmVariables;
    }

    const webCallResponse = await retellClient.call.createWebCall(callPayload);
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