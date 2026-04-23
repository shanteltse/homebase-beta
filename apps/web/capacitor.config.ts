import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homebase.app',
  appName: 'HomeBase',
  webDir: 'out',
  server: {
    url: 'https://homebase-beta-web.vercel.app',
    cleartext: false
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
