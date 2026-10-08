// Public site configuration. Never put private API keys or service-account keys here.
window.SPORTON_CONFIG = {
    // Hosted score API: 10-second polling. Collected JSON remains the outage fallback.
    // Source APIs are queried server-side; no private API keys are exposed here.
    domesticApiBase: 'https://sporton-live-api.parkbeomkuk.chatgpt.site',
    // Optional public Firebase web-app configuration, shared by all visitors.
    firebase: null
};
