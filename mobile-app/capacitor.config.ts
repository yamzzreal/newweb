import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.myid.yamzzmarket',
  appName: 'Yamzz Market',
  webDir: 'www',
  server: {
    url: 'https://jasteb.yamzzmarket.my.id',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
