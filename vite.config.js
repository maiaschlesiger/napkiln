import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Accept any hostname so tunnels (cloudflared, ngrok, named domains) can
    // reach the dev server for phone testing over HTTPS — required for mic
    // access. Fine for a prototype; tighten to a domain list if this ever
    // serves anything sensitive.
    allowedHosts: true,
    host: true,
  },
  preview: {
    allowedHosts: true,
    host: true,
  },
});
