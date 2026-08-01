---
paths: ["src/app/manifest.ts", "src/app/layout.tsx", "public/sw.js"]
---

- Mobile strategy is PWA-only — no Capacitor, no React Native, no app
  store submission. Don't introduce native mobile tooling here without
  re-confirming with the user first, cf. ADR-0001.
