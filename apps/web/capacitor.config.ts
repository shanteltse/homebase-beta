import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homebase.app',
  appName: 'HomeBase',
  webDir: 'out',
  backgroundColor: '#faf7f4',
  server: {
    url: 'https://homebase-beta-web.vercel.app',
    cleartext: false
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#faf7f4',
  }
};

export default config;
