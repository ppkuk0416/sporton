// Public site configuration. Never put private API keys or service-account keys here.
window.SPORTON_CONFIG = {
    // Empty uses /api/domestic on Node hosting; GitHub Pages falls back to collected JSON.
    // For Pages + a separate Node service set e.g. https://your-service.example.
    domesticApiBase: '',
    // Optional public Firebase web-app configuration, shared by all visitors.
    firebase: null
};
