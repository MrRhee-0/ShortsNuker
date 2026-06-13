# Shorts Nuker

## Purpose

Shorts Nuker is a Chrome Manifest V3 extension for YouTube-only page cleanup and testing controls.

## Features

* Removes YouTube Shorts shelves, cards, and Shorts links.
* Removes YouTube search results whose titles share zero exact normalized words with the current search query.
* Includes a simple Theme Color Test that changes YouTube background colors as a visual proof of capability.
* Includes a Theme Surface Test that skins nested YouTube interface surfaces where targetable.
* Hides visible YouTube view counts and like counts when enabled.

The strict search filter uses exact word overlap only. It does not use semantic matching, synonym matching, fuzzy matching, or stemming.

## Popup Controls

Click the extension icon to open the ShortsNuker popup.

* Remove Shorts: turns Shorts DOM removal on or off.
* Strict Search Title Match: turns strict YouTube search result title filtering on or off.
* Theme Color Test: turns the simple background color test on or off.
* Theme Surface Test: turns stronger masthead, search box, sidebar, card, comment, metadata, button, icon, and chip styling on or off.
* Hide views and likes: turns visible view-count and like-count text hiding on or off while preserving Like and Dislike controls.

Settings persist through Chrome extension storage. Default states are Remove Shorts on, Strict Search Title Match on, Theme Color Test off, Theme Surface Test off, and Hide views and likes off.

If Theme Color Test and Theme Surface Test are both on, Theme Surface Test may visually override the simpler background-color layer.

## Folder Structure

```text
ShortsNuker/
manifest.json
content.js
popup.html
popup.js
popup.css
README.md
icons/
  icon16.png
  icon32.png
  icon48.png
  icon128.png
```

## Chrome Loading Steps

* Open `chrome://extensions/`
* Enable Developer mode
* Click Load unpacked
* Select the `ShortsNuker` folder
* Refresh YouTube

## Scope

This extension only affects YouTube pages.

It removes page DOM elements but does not block network requests.

The Theme Color Test is currently a simple visual test only.

Theme Surface Test uses YouTube DOM/CSS selectors. YouTube layout changes may require selector updates.

Hide views and likes uses YouTube DOM/CSS selectors plus conservative text and ARIA relation checks. New YouTube count text surfaces may require selector updates.
