import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snipchat.app',
  appName: 'SnipChat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      // Camera plugin config — permissions handled via AndroidManifest / Info.plist
    },
  },
};

export default config;
