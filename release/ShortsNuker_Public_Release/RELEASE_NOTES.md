# ShortsNuker v1.0.0 Release Notes

ShortsNuker v1.0.0 packages the current YouTube-only Manifest V3 extension for public release.

## Features

* Remove YouTube Shorts.
* Strict Search Title Match.
* Theme Color Test.
* Theme Surface Test.
* Hide views and likes.
* Popup toggles.
* Persistent settings.

## Install

Open `chrome://extensions/`, enable Developer mode, click Load unpacked, and select the folder containing `manifest.json`.

## Privacy

No analytics, telemetry, tracking, external servers, browsing history collection, account login, or data sale.

## Known Limitations

* YouTube layout changes may require selector updates.
* Theme Color Test is a proof-of-capability feature.
* Theme Surface Test uses YouTube DOM/CSS selectors. YouTube layout changes may require selector updates.
* Hide views and likes uses YouTube DOM/CSS selectors and conservative text/ARIA relation checks. New count surfaces may require selector updates.
