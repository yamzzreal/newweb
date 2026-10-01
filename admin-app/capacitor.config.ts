import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.myid.yamzzmarket.admin',
  appName: 'Yamzz Admin',
  webDir: 'www',
  server: {
    url: 'https://jasteb.yamzzmarket.my.id/admin.html',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
