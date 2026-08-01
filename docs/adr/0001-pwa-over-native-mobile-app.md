# ADR-0001: Use a PWA rather than a native/packaged mobile app

> An ADR (Architecture Decision Record) is written ONCE, at the time of
> the decision, and is never re-edited afterwards. If it becomes
> obsolete, write a new ADR that replaces it (see "Status" section) —
> do not rewrite history.

- **Date**: 2026-08-01
- **Status**: Accepted

## Context

The product needs to be usable as a "real" mobile app on both iOS and
Android — installable, with an icon, ideally with push notifications —
while staying simple to develop (one small team, one codebase already
chosen: Next.js App Router, self-hosted on a VPS) and simple to
install for end users.

Crucially, the app will **never be distributed through the App Store
or Play Store** — it's an app for a closed group of friends, shared
directly, not published for the public. This removes the main reason
teams usually reach for a packaged native shell (store discoverability
and a store-native install flow).

The dev environment available for this project is Linux. Building and
signing an iOS app requires Xcode, which only runs on macOS — a real
constraint on any option that needs a native iOS build.

## Decision

Ship the product as a **PWA** (Progressive Web App): the existing
Next.js app, with a web manifest, iOS-specific meta tags, and a
minimal service worker — installed via the browser's native "Add to
Home Screen" flow (Android: Chrome install prompt; iOS: Safari →
Share → "Sur l'écran d'accueil"). No separate native codebase, no app
store submission.

## Alternatives considered

| Option | Why rejected |
|---|---|
| React Native / Expo (full native rewrite) | Means maintaining a second UI codebase entirely separate from the Next.js web app — the biggest complexity cost, for a benefit (true native feel, store presence) that isn't needed since there's no store distribution anyway. |
| Capacitor (wrap the Next.js app in a native WebView shell) | Was the initial recommendation when store presence was still assumed to matter. Once store distribution was ruled out, its main advantage (App Store/Play Store presence) became moot — it would only add native build tooling (Android Studio, and eventually Xcode/macOS for iOS) without a corresponding benefit. |
| iOS distribution without the App Store (TestFlight / Ad-Hoc / Enterprise) | Even without a *public* store listing, installing a real native iOS app on a friend's device without a jailbreak still requires an Apple Developer Program account ($99/yr) and either TestFlight (review, 90-day build expiry) or Ad-Hoc (manual UDID registration per device). All of that friction for a "friends app" that a PWA sidesteps entirely, with zero Apple account and zero macOS dependency. |

## Consequences

- No Xcode/macOS dependency anywhere in the toolchain — the whole app
  can be built and deployed from the existing Linux setup.
- Installing the app is just sharing a URL; no store account, no
  review process, no waiting.
- Push notifications work on both platforms, but iOS support requires
  iOS 16.4+ (Safari web push for home-screen-installed PWAs). Anyone
  on an older iOS version won't get push notifications, though the
  app itself still installs and works.
- No access to deeper native APIs (advanced background processing,
  certain native-only integrations). Not a practical limitation for
  this product: proof-of-achievement photo/video capture works fine
  through standard web APIs (`<input capture>` / `getUserMedia`).
- If store distribution or a more "native" feel ever becomes a real
  requirement later (e.g. the app grows beyond a closed friend group),
  this decision would need to be revisited — most likely by wrapping
  the same Next.js app in Capacitor at that point, since it doesn't
  require a UI rewrite.

## What has not changed since
