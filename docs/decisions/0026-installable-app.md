# 0026. Installable app (PWA)

## Context

The owner's father is not comfortable with technology. Typing an address or finding the login page in a
browser every time is a barrier; he should open the admin by tapping an icon, like any other app.

## Decision

- A web app manifest (`app/manifest.ts`) makes the site installable: name "Disco", it opens `/admin` full
  screen (`standalone`) with the store colours. The icons are a record on the accent colour, drawn as an
  SVG (`app/icon.svg`, also the favicon) and rendered to PNG for the manifest (192 and 512 pixels, a
  maskable 512 whose disc stays inside the safe zone) and for iOS (`app/apple-icon.png`).
- The proxy skips `manifest.webmanifest`. The browser fetches it without cookies, so a signed-out request
  would be redirected to the login page and the install would silently fail.
- A small closable card at the top of the admin explains "add to home screen" with the steps for Chrome
  on Android and Safari on iPhone and iPad. It is hidden once the app runs installed, once it is closed
  (remembered in `localStorage`, in memory if storage is blocked) and on desktop.
- No service worker. Photos and data need the network, and a cache that goes stale could show old
  prices or availability. It can be added later if offline use turns out to matter.
- The session lasts: Supabase keeps refreshing it and its cookie lives for months, so the owner's father
  stays signed in on his phone unless he signs out.

## Consequences

- The PNG icons are committed files. If the SVG changes, render them again (Chromium screenshot at each
  size) so they match.
- Installing needs HTTPS, which Vercel and any normal host provide.
- Chrome decides when to offer its own install banner; the card works without it.
