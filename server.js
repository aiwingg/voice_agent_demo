const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Retell = require('retell-sdk'); // Using the Node SDK for Retell
const { DEFAULT_AGENT_ID, DEFAULT_LANGUAGE, DEFAULT_COMPANY_NAME } = require('./config');
const { getCompanyData } = require('./google-sheets');

const app = express();

// Trust proxy (required for Heroku)
app.set('trust proxy', 1);

// Force HTTPS on Heroku
app.use((req, res, next) => {
  // Check if we're on Heroku and not using HTTPS
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    // Redirect to HTTPS
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  // HSTS - Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Enable CORS if needed for API endpoints (if client is on same domain, this may be optional)
app.use(cors());
app.use(bodyParser.json());

// Your API endpoint to create a web call
const API_KEY = 'key_7335fefc4661ce2fd9f790780ad5';

app.post('/api/create-web-call', async (req, res) => {
  try {
    // Get company ID from request body, or use default if not provided
    const { company_id } = req.body;
    let agent_id = DEFAULT_AGENT_ID;
    let language = DEFAULT_LANGUAGE;
    let company_name = DEFAULT_COMPANY_NAME;
    let valid_company = true;

    // Check if company_id exists and is valid
    if (company_id) {
      const companyData = await getCompanyData(company_id);
      if (companyData) {
        [agent_id, language, company_name] = companyData;
      } else {
        valid_company = false;
      }
    }

    const retellClient = new Retell({ apiKey: API_KEY });
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: agent_id,
      metadata: { 
        demo: true,
        language: language,
        company_name: company_name,
        valid_company: valid_company
      },
      retell_llm_dynamic_variables: {
        'user_number': '9280291870',
        'name': company_name,
        'purchase_history': '- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]\n - Филе ЦБ Халяль "Для жарки" мон зам Благояр (342.38 руб / кг) [01-00003115]\n - Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]\n - 1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]\n - 1 сорт Тушка ЦБ Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]'
      },
    });
    
    // Add the additional metadata to the response
    webCallResponse.metadata = {
      language: language,
      company_name: company_name,
      valid_company: valid_company
    };
    
    res.status(201).json(webCallResponse);
  } catch (error) {
    console.error("Error creating web call:", error);
    res.status(500).json({ error: "Error creating web call" });
  }
});

// Endpoint to get company data
app.get('/api/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const companyData = await getCompanyData(companyId);
    
    if (!companyData) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json({
      companyId,
      agentId: companyData[0],
      language: companyData[1],
      companyName: companyData[2]
    });
  } catch (error) {
    console.error('Error fetching company data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the React app
app.use('/demo', express.static(path.join(__dirname, 'client/build')));

// Serve static files from the root path as well (for assets)
app.use(express.static(path.join(__dirname, 'client/build')));

// Handle all routes under /demo
app.get('/demo/*', (req, res, next) => {
  // If the request is for a static file, let it pass through
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|json)$/)) {
    return next();
  }
  // Otherwise, serve the index.html
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Redirect root to /demo
app.get('/', (req, res) => {
  res.redirect('/demo');
});

// Handle 404s for the root path
app.get('*', (req, res) => {
  res.redirect('/demo');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});