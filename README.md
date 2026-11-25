# Solo Oracle

A small iOS + Android app for solo tabletop RPG play, built with Expo (React Native, TypeScript). One codebase runs on both platforms.

## Features

- **Dice**: d2, d4, d6, d8, d10, d12, d20, d100 and any custom die (d7, d37…). Type a formula or tap buttons.
  - `2d6+3`, `1d20 adv`, `1d20 dis`, `4d6kh3` (keep highest 3), `2d20kl1` (keep lowest), `4d6dl1` / `dh1` (drop lowest/highest), `3d6!` (exploding), `d%`.
  - Save named formulas; tap to roll, long-press to load into the editor. Roll history with dropped dice struck through.
- **Playing cards**: draw X from a 52-card deck (optionally 54 with jokers).
- **Tarot**: draw X from the 78-card Rider–Waite–Smith deck (or Major Arcana only). Each card comes up upright or reversed (50/50, can be turned off) with short keywords for both.
- **Lists**: make your own lists/tables (one entry per line, paste-friendly) and pick X entries, with or without repeats.

Cards and tarot have two modes: by default every draw shuffles a full deck (no duplicates within a draw). Turn on **Keep drawing from one deck** to draw from the same deck until you reshuffle.

Randomness uses the device's secure random source (`expo-crypto`) with rejection sampling, so there's no modulo bias. Everything (saved formulas, lists, history, the in-progress deck) is stored on the phone only.

## Run it on your phone

1. Install Node.js 20+ and the **Expo Go** app on your phone.
2. `npm install`
3. `npx expo start`, then scan the QR code (Camera app on iOS, Expo Go on Android).

To make an installable build for the App Store / Play Store, use EAS: `npx eas-cli@latest build`.

## Develop

- `npm test` runs the randomizer/dice-parser tests (Node test runner via tsx).
- `npm run typecheck`
- Logic lives in `src/lib/` (pure, tested); screens in `src/screens/`.

## Try it on an iPhone without a computer

Every push to `main` builds the web version and publishes it to GitHub Pages:
https://mahmoud-shihab.github.io/solo-oracle/

Open it in Safari, then Share → Add to Home Screen. One-time setup: in the repo go to Settings → Pages and set Source to "GitHub Actions".
