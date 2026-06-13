# ShortsNuker

A YouTube-only Chrome extension for removing Shorts, enforcing strict title-query search relevance, and testing user-controlled YouTube visual styling.

## Features

* Remove YouTube Shorts
* Strict Search Title Match
* Theme Color Test
* Theme Surface Test
* Hide views and likes
* Popup toggles
* Persistent settings

## Screenshots

Screenshots can be added later to show the popup controls, icon, and YouTube page effects.

## Installation

1. Download or clone the repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `ShortsNuker` extension folder.
6. Open or refresh YouTube.

## Usage

1. Click the ShortsNuker extension icon.
2. Toggle features on or off.
3. Refresh YouTube if a visual change does not apply instantly.

## Popup Controls

* Remove Shorts: removes YouTube Shorts shelves, cards, and links.
* Strict Search Title Match: removes YouTube search results whose titles share zero exact normalized words with the current search query.
* Theme Color Test: applies a simple background-color proof of styling capability.
* Theme Surface Test: applies a stronger interface skin to YouTube surfaces such as the masthead, search box, sidebar, cards, comments, metadata, buttons, icons, and chips where targetable.
* Hide views and likes: hides visible YouTube view-count and like-count text while preserving Like, Dislike, Subscribe, Share, Ask, More, titles, thumbnails, comments, channel names, upload dates, and normal navigation.

If Theme Color Test and Theme Surface Test are both enabled, Theme Surface Test may visually override the simpler background-color layer because it targets more specific YouTube surfaces.

## Permissions

ShortsNuker uses only the `storage` permission. Chrome storage is used only to remember the popup toggle settings across browser sessions.

The content script is scoped to `*://*.youtube.com/*`, so the extension runs only on YouTube pages. It does not target Google Search, Google pages outside YouTube, or non-YouTube websites.

## Privacy

ShortsNuker has no analytics, no telemetry, no tracking, no external servers, no browsing history collection, no account login, and no user data sale. Feature settings are stored by Chrome extension storage on the user's browser.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Technical Overview

* Manifest V3 extension.
* YouTube-only content script.
* Popup UI for feature toggles.
* Chrome storage for persistent settings.
* MutationObserver for YouTube dynamic page updates.
* No background service worker at this stage.

### Service Worker Decision

ShortsNuker is intentionally content-script and popup based. It does not currently need install/update initialization, centralized routing, keyboard commands, context menus, badge state, dynamic rules, or native messaging preparation, so no Manifest V3 background service worker is included.

## Known Limitations

* YouTube layout changes may require selector updates.
* Theme Color Test is currently a simple proof-of-capability feature.
* Theme Surface Test uses YouTube DOM/CSS selectors. YouTube layout changes may require selector updates.
* Hide views and likes uses layered YouTube selectors plus conservative text and ARIA relation checks. New YouTube count text DOM structures may require selector updates.

## Development Notes

* Keep permissions minimal.
* Keep scope YouTube-only.
* Do not add external tracking.
* Do not add external dependencies.
* Do not add network calls, telemetry, analytics, or remote logging.

## License

This repository currently preserves its existing Creative Commons Attribution 4.0 International license. See [LICENSE](LICENSE).
