import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow tunnel hostnames (e.g. `cloudflared tunnel --url http://localhost:5173`)
    // so the app can be opened on a phone over HTTPS — required for mic access.
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
});
