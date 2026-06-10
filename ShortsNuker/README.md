# Shorts Nuker

## Purpose

Shorts Nuker is a Chrome Manifest V3 extension that removes YouTube Shorts shelves, cards, and Shorts links from YouTube pages.

On YouTube search results pages, it also removes video results whose titles share zero exact normalized words with the current search query. This filter uses exact word overlap only, not semantic matching.

## Folder Structure

```text
ShortsNuker/
manifest.json
content.js
README.md
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
