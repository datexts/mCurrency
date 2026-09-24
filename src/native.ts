// Native (iOS app) helpers. On the web (GitHub Pages) these do nothing.
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const isNative = Capacitor.isNativePlatform();

// Version shown on the web build. The iOS app reads its real version from Xcode.
export const WEB_VERSION = '1.0';

// Forced update config, hosted on the mStudio GitHub site.
// File content example: { "minVersion": "1.0", "storeUrl": "https://apps.apple.com/app/id0000000000" }
export const UPDATE_CONFIG_URL = 'https://mstudio-solutions.github.io/config/mcurrency.json';

export async function getAppVersion(): Promise<string> {
  if (!isNative) return WEB_VERSION;
  try { return (await CapApp.getInfo()).version || WEB_VERSION; }
  catch { return WEB_VERSION; }
}

// Dark theme -> white status bar text, light theme -> black text
export function setStatusBar(dark: boolean) {
  if (!isNative) return;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

// Run a callback every time the app comes back to the front
export function onResume(cb: () => void): () => void {
  if (!isNative) return () => {};
  const h = CapApp.addListener('resume', cb);
  return () => { h.then(x => x.remove()).catch(() => {}); };
}

// "1.2" vs "1.10" -> compares number by number. Returns -1, 0 or 1.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Hide the ^ v ✓ bar that iOS adds above the keyboard for web inputs
export function setupKeyboard() {
  if (!isNative) return;
  Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
}
