// Company to agent mapping
// Format: {company_id: [agent_id, language, company_name]}
const COMPANIES = {
  '123': ['agent_d1b78ff3f73322fc34dd89abb5', 'ru', 'Крокус ООО'],
  '456': ['agent_d1b78ff3f73322fc34dd89abb5', 'en', 'Flower Tech'],
  '789': ['agent_d1b78ff3f73322fc34dd89abb5', 'ru', 'ТД Восток']
};

// Default values
const DEFAULT_AGENT_ID = 'agent_d1b78ff3f73322fc34dd89abb5';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_COMPANY_NAME = 'Sycorax AI';

// Export both the company mapping and default values
module.exports = {
  COMPANIES,
  DEFAULT_AGENT_ID,
  DEFAULT_LANGUAGE,
  DEFAULT_COMPANY_NAME
}; 