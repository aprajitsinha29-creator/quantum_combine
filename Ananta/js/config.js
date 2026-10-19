// Ananta Quantum Studio - Client Configuration
//
// No API key is embedded here. Anything in this file is served to every
// visitor, so provider credentials live only in server environment variables
// and all AI calls go through the backend (/api/gemini). A user may still
// supply their own key in the copilot settings panel, which is kept in this
// browser's localStorage and never committed.
(function() {
  window.ANANTA_CONFIG = {
    GEMINI_API_KEY: (typeof localStorage !== 'undefined' && localStorage.getItem('ananta_gemini_key')) || '',
    OPENAI_API_KEY: '',
    DEFAULT_PROVIDER: 'gemini'
  };
})();
