/**
 * Konfigurasi frontend Perpustakaan Digital.
 * Ubah API_BASE_URL jika backend dijalankan di host/port lain.
 */
window.APP_CONFIG = {
  API_BASE_URL: window.localStorage.getItem('perpus_api_base_url') || '/api',
};
