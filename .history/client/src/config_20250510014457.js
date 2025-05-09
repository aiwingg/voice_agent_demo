// Company to agent mapping
// Format: {company_id: [agent_id, language, company_name]}
export const COMPANIES = {
  '123': ['agent_d1b78ff3f73322fc34dd89abb5', 'ru', 'Крокус ООО'],
  '456': ['agent_d1b78ff3f73322fc34dd89abb5', 'en', 'Flower Tech'],
  '789': ['agent_d1b78ff3f73322fc34dd89abb5', 'ru', 'ТД Восток']
};

// Default values
export const DEFAULT_AGENT_ID = 'agent_d1b78ff3f73322fc34dd89abb5';
export const DEFAULT_LANGUAGE = 'ru';
export const DEFAULT_COMPANY_NAME = 'МТТ';

// Export both the company mapping and default values
export default {
  COMPANIES,
  DEFAULT_AGENT_ID,
  DEFAULT_LANGUAGE,
  DEFAULT_COMPANY_NAME
}; 