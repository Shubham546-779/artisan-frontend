import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'www.ArtisanBaazar.com',
  appName: 'Artisan',
  webDir: 'dist',
  server: {
    url: 'https://artisan-frontend-9mf1.onrender.com',
    cleartext: true,
  }
};

export default config;