# ShortsNuker v1.0.0 Release Notes

## Summary

ShortsNuker v1.0.0 is the first public release package for the YouTube-only Chrome Manifest V3 extension.

## Features

* Remove YouTube Shorts.
* Strict Search Title Match for YouTube search results.
* Theme Color Test for visible user-controlled styling.
* Theme Surface Test for visible masthead, search box, sidebar, card, comment, metadata, button, icon, and chip styling where targetable.
* Hide views and likes for visible YouTube view-count and like-count surfaces.
* Popup toggles for all features.
* Persistent settings through Chrome extension storage.
* Extension icons.

## Install Steps

1. Download or clone the repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `ShortsNuker` extension folder.
6. Open or refresh YouTube.

## Privacy

ShortsNuker does not collect personal data, does not use analytics or telemetry, does not track users, and does not call external servers.

## Known Limitations

* YouTube layout changes may require selector updates.
* Theme Color Test is a simple proof-of-capability visual test.
* Theme Surface Test uses YouTube DOM/CSS selectors. YouTube layout changes may require selector updates.
* Hide views and likes uses YouTube DOM/CSS selectors and conservative text/ARIA relation checks. New count surfaces may require selector updates.

## Verification Checklist

* Manifest V3 verified.
* YouTube-only host match verified.
* Storage permission present only for toggle persistence.
* Popup and content script verified.
* Icons present.
* No background service worker used.
* No npm, build tooling, external libraries, analytics, telemetry, or tracking.
