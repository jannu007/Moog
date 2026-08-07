import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novawave.synth',
  appName: 'NovaWave Synth',
  webDir: 'dist',
  android: {
    path: 'android-capacitor'
  }
};

export default config;
