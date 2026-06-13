# ShortsNuker Public Release

ShortsNuker v1.0.0 is a YouTube-only Chrome Manifest V3 extension for removing Shorts, enforcing strict title-query search relevance, and testing user-controlled YouTube visual styling.

## Included Features

* Remove YouTube Shorts.
* Strict Search Title Match.
* Theme Color Test.
* Theme Surface Test.
* Hide views and likes.
* Popup toggles.
* Persistent settings.

Theme Surface Test applies a stronger visual skin to nested YouTube interface surfaces where targetable. If both theme tests are enabled, Theme Surface Test may override the simpler Theme Color Test layer.

Hide views and likes hides visible view-count and like-count text, and hides watch/Shorts like-dislike engagement groups while preserving Subscribe, Share, Ask, More, titles, thumbnails, comments, and normal navigation.

## Service Worker Status

No background service worker is included. The extension is intentionally content-script and popup based at this stage.

## Release Files

Use `release/ShortsNuker-v1.0.0.zip` for a load-unpacked release package when present, or load the `ShortsNuker` folder directly from the repository.
