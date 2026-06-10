# Shorts Nuker

## Purpose

Shorts Nuker is a Chrome Manifest V3 extension that removes YouTube Shorts shelves, cards, and Shorts links from YouTube pages.

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

It removes Shorts from the page DOM but does not block network requests.
