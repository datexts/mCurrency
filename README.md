# mCurrency - Blue Theme #4695F4
by mStudio - Martin Yeung

## Stack
- Vite + React + TypeScript + Tailwind
- iOS Native Experience, single-page app

## Features (v10)
- Large blue pill 3 decimals (e.g. $5.587)
- Small gray $5.5877000 with currency symbol
- Left side only currency name (no code/symbol clutter)
- Calculator shows large number (3 decimals) when tapping pill
- Edit page full drag with ✓/✕
- About page: Terms functional, location shows "Australia" only
- Theme: Blue #4695F4 from mCR - mStudio Cantonese Radio, matching brand
- Icon: mC with C bigger, currency symbols ¥ $ ฿ € £ scattered

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Build
```bash
npm run build
npm run preview
```

## Changes for iPhone (Sep 2026)
- Full screen on iPhone (phone frame only shows on desktop)
- Settings and Pro status saved on the device
- Round flag images (circle-flags, MIT licence) in src/assets/flags
- Full-blue app icon: mCurrency_icons/Icon-1024-fullblue.png

## Icons
All icons in /mCurrency_icons/
- Icon-1024.png - App Store (1024x1024, solid, no alpha) - use this for App Store Connect
- Icon-1024-transparent.png - Preview
- Other sizes for Xcode AppIcon: 60, 76, 120, 152, 167, 180, 512

## Deploy to GitHub Pages
1. Push this folder to a GitHub repo (branch: main)
2. Repo Settings > Pages > Source: GitHub Actions
3. Wait for the Actions run to go green
4. Open https://datexts.github.io/<repo-name>/

## License
mStudio © 2026 - Sydney Australia
