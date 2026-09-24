import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mstudio.mcurrency',
  appName: 'mCurrency',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'never',      // app draws edge to edge; safe areas handled in CSS
    backgroundColor: '#000000',
    scrollEnabled: false,       // page itself doesn't bounce; lists inside still scroll
  },
  plugins: {
    Keyboard: {
      resize: 'native',         // app shrinks above the keyboard, so sheets aren't covered
      resizeOnFullScreen: true,
    },
  },
};

export default config;
