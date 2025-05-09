const fs = require('fs');
const path = require('path');

// Paths to the config files
const sourceConfigPath = path.join(__dirname, 'config.js');
const clientConfigPath = path.join(__dirname, 'client', 'src', 'config.js');

// Read the CommonJS config file
let configContent = fs.readFileSync(sourceConfigPath, 'utf8');

// Replace CommonJS export with ES module exports
configContent = configContent
  .replace('const COMPANIES', 'export const COMPANIES')
  .replace('const DEFAULT_AGENT_ID', 'export const DEFAULT_AGENT_ID')
  .replace('const DEFAULT_LANGUAGE', 'export const DEFAULT_LANGUAGE')
  .replace('const DEFAULT_COMPANY_NAME', 'export const DEFAULT_COMPANY_NAME')
  .replace('module.exports = {', 'export default {');

// Write to the client config file
fs.writeFileSync(clientConfigPath, configContent);

console.log('Config files synchronized successfully!'); 