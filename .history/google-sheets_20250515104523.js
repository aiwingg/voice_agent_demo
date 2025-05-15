const { google } = require('googleapis');

// Initialize the Google Sheets API
const sheets = google.sheets('v4');

// Cache for company data to avoid frequent API calls
let companiesCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to initialize the Google Sheets client
async function initializeGoogleSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return auth;
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    throw error;
  }
}

// Function to fetch companies from Google Sheets
async function fetchCompaniesFromSheets() {
  try {
    // Check if we have valid cached data
    if (companiesCache && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      return companiesCache;
    }

    const auth = await initializeGoogleSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Companies!A2:D'; // Assuming headers are in row 1 and data starts from row 2

    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the spreadsheet');
    }

    // Transform the data into the expected format
    const companies = {};
    rows.forEach(row => {
      const [companyId, agentId, language, companyName] = row;
      if (companyId && agentId && language && companyName) {
        companies[companyId] = [agentId, language, companyName];
      }
    });

    // Update cache
    companiesCache = companies;
    lastFetchTime = Date.now();

    return companies;
  } catch (error) {
    console.error('Error fetching companies from Google Sheets:', error);
    throw error;
  }
}

// Function to get company data (with caching)
async function getCompanyData(companyId) {
  try {
    const companies = await fetchCompaniesFromSheets();
    return companies[companyId] || null;
  } catch (error) {
    console.error('Error getting company data:', error);
    throw error;
  }
}

module.exports = {
  fetchCompaniesFromSheets,
  getCompanyData
}; 