(function () {
    "use strict";

    if (window.__shortsNukerActive) {
        return;
    }
    window.__shortsNukerActive = true;

    const DEFAULT_SETTINGS = {
        removeShorts: true,
        strictSearchTitleMatch: true,
        themeColorTest: false,
        themeSurfaceTest: false,
        hideViewsAndLikes: false
    };
    const SHORTS_STYLE_ID = "shorts-nuker-style";
    const THEME_STYLE_ID = "shorts-nuker-theme-style";
    const SURFACE_THEME_STYLE_ID = "shorts-nuker-surface-theme-style";
    const COUNTS_STYLE_ID = "shorts-nuker-counts-style";
    const COUNT_HIDDEN_ATTR = "data-shorts-nuker-count-hidden";
    const COUNT_SCANNED_ATTR = "data-shorts-nuker-count-scanned";
    const COUNT_ORIGINAL_ARIA_ATTR = "data-shorts-nuker-original-aria-hidden";
    const WATCH_LIKE_PILL_FALLBACK_ATTR = "data-shorts-nuker-watch-like-pill-hidden";
    const DEBUG = false;
    const MUTATION_SCAN_DEBOUNCE_MS = 120;
    const DIRECT_SHORTS_SELECTORS = [
        "ytd-reel-shelf-renderer",
        "ytd-rich-shelf-renderer[is-shorts]",
        "ytd-reel-video-renderer",
        "ytd-reel-item-renderer"
    ];
    const SHORTS_LINK_SELECTORS = [
        'a[href^="/shorts/"]',
        'a[href*="youtube.com/shorts/"]'
    ];
    const REMOVABLE_CONTAINER_SELECTORS = [
        "ytd-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-compact-video-renderer",
        "ytd-rich-item-renderer",
        "ytd-rich-grid-media",
        "yt-lockup-view-model",
        "ytd-reel-video-renderer",
        "ytd-reel-item-renderer"
    ];
    const SEARCH_TITLE_SELECTORS = [
        "a#video-title",
        "yt-formatted-string#video-title",
        "h3 a",
        "h3 yt-formatted-string"
    ];
    const SEARCH_RESULT_CONTAINER_SELECTORS = [
        "ytd-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-compact-video-renderer",
        "ytd-rich-item-renderer",
        "ytd-rich-grid-media",
        "yt-lockup-view-model"
    ];
    const COUNT_TEXT_CANDIDATE_SELECTORS = [
        "#metadata-line span",
        "ytd-video-meta-block span",
        "ytd-video-view-count-renderer",
        ".view-count",
        "span.view-count",
        "yt-formatted-string.view-count",
        "#count .view-count",
        "#info .view-count",
        "#info-container .view-count",
        "#vote-count-middle",
        "ytd-comment-action-buttons-renderer #vote-count-middle",
        "ytd-comment-engagement-bar #vote-count-middle",
        "ytd-toggle-button-renderer #text",
        "ytd-segmented-like-dislike-button-renderer #text",
        "segmented-like-dislike-button-view-model #text",
        "like-button-view-model #text",
        "dislike-button-view-model #text",
        "ytd-reel-player-overlay-renderer #text",
        "ytd-reel-player-overlay-renderer span",
        ".yt-spec-button-shape-next__button-text-content",
        ".yt-spec-button-shape-next__button-text-content span",
        "button span",
        "[role=\"button\"] span",
        "yt-formatted-string",
        "span"
    ];
    const RELATED_COUNT_CHILD_SELECTORS = [
        "span",
        "yt-formatted-string",
        "#text",
        "#label",
        "#vote-count-middle",
        ".yt-spec-button-shape-next__button-text-content",
        ".yt-spec-button-shape-next__button-text-content span"
    ].join(", ");
    const COUNT_RELATION_SELECTOR = [
        "[aria-label]",
        "[title]",
        "[data-tooltip-text]",
        "[aria-description]",
        "[aria-valuetext]"
    ].join(", ");
    const CONTROL_CONTAINER_SELECTORS = [
        "button",
        "[role=\"button\"]",
        "ytd-toggle-button-renderer",
        "ytd-segmented-like-dislike-button-renderer",
        "segmented-like-dislike-button-view-model",
        "like-button-view-model",
        "dislike-button-view-model"
    ].join(", ");
    const PROTECTED_TEXT_SELECTORS = [
        "#content-text",
        "#video-title",
        "a#video-title",
        "h1",
        "h2",
        "h3",
        "#channel-name",
        "ytd-channel-name",
        "#owner",
        "#playlist-title"
    ].join(", ");

    let currentSettings = { ...DEFAULT_SETTINGS };
    let observerStarted = false;
    let domObserver = null;
    let pendingScanTimer = null;
    let pendingScanRoots = new Set();
    let extensionContextInvalidated = false;
    let messageHandlersInstalled = false;
    let lastWatchLikeDiagnosticUrl = "";

    function debugLog(...args) {
        if (DEBUG) {
            console.debug("[ShortsNuker]", ...args);
        }
    }

    function isExtensionContextInvalidatedError(error) {
        const message = String((error && error.message) || error || "");
        return /extension context invalidated/i.test(message);
    }

    function markExtensionContextInvalidated() {
        if (extensionContextInvalidated) {
            return;
        }

        extensionContextInvalidated = true;
        cleanupExtensionInstance();
    }

    function isChromeRuntimeAvailable() {
        if (extensionContextInvalidated) {
            return false;
        }

        try {
            if (typeof chrome === "undefined" || !chrome.runtime) {
                return false;
            }

            const runtimeId = chrome.runtime.id;
            debugLog("runtime available", runtimeId || "no runtime id surface");
            return true;
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
            return false;
        }
    }

    function getChromeLastError() {
        try {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                return chrome.runtime.lastError || null;
            }
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
            return error;
        }

        return null;
    }

    function getStorageArea() {
        if (extensionContextInvalidated) {
            return null;
        }

        try {
            if (typeof chrome === "undefined" || !chrome.storage) {
                return null;
            }

            return chrome.storage.sync || chrome.storage.local || null;
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
            return null;
        }
    }

    function loadSettings() {
        const storageArea = getStorageArea();
        if (!storageArea) {
            if (extensionContextInvalidated) {
                return Promise.resolve(null);
            }

            currentSettings = { ...DEFAULT_SETTINGS };
            return Promise.resolve(currentSettings);
        }

        return new Promise((resolve) => {
            try {
                storageArea.get(DEFAULT_SETTINGS, (storedSettings) => {
                    const lastError = getChromeLastError();
                    if (lastError) {
                        if (isExtensionContextInvalidatedError(lastError)) {
                            markExtensionContextInvalidated();
                        }
                        resolve(null);
                        return;
                    }

                    if (extensionContextInvalidated) {
                        resolve(null);
                        return;
                    }

                    currentSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
                    debugLog("settings loaded", currentSettings);
                    resolve(currentSettings);
                });
            } catch (error) {
                if (isExtensionContextInvalidatedError(error)) {
                    markExtensionContextInvalidated();
                    resolve(null);
                    return;
                }

                currentSettings = { ...DEFAULT_SETTINGS };
                resolve(currentSettings);
            }
        });
    }

    function queryAllIncludingRoot(root, selectors) {
        if (!root || !root.querySelectorAll) {
            return [];
        }

        const matches = [];
        if (root.nodeType === Node.ELEMENT_NODE && root.matches(selectors)) {
            matches.push(root);
        }

        root.querySelectorAll(selectors).forEach((element) => {
            matches.push(element);
        });

        return matches;
    }

    function installShortsStyle() {
        if (document.getElementById(SHORTS_STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = SHORTS_STYLE_ID;
        style.textContent = `${DIRECT_SHORTS_SELECTORS.join(", ")} { display: none !important; }`;
        document.documentElement.appendChild(style);
    }

    function removeStyleById(styleId) {
        const style = document.getElementById(styleId);
        if (style) {
            style.remove();
        }
    }

    function installThemeStyle() {
        if (document.getElementById(THEME_STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = THEME_STYLE_ID;
        style.textContent = `
            html,
            body,
            ytd-app,
            #content,
            #page-manager {
                background: #101923 !important;
                color: #f3f7ff !important;
            }

            ytd-page-manager,
            ytd-watch-flexy,
            ytd-browse,
            ytd-search,
            ytd-two-column-browse-results-renderer,
            ytd-rich-grid-renderer,
            #primary,
            #secondary,
            #contents {
                background-color: #142131 !important;
            }

            ytd-rich-item-renderer,
            ytd-video-renderer,
            ytd-compact-video-renderer,
            ytd-grid-video-renderer,
            yt-lockup-view-model {
                background-color: #18283a !important;
            }
        `;
        document.documentElement.appendChild(style);
    }

    function removeThemeStyle() {
        removeStyleById(THEME_STYLE_ID);
    }

    function installSurfaceThemeStyle() {
        if (document.getElementById(SURFACE_THEME_STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = SURFACE_THEME_STYLE_ID;
        style.textContent = `
            :root {
                --shorts-nuker-surface-bg: #09111a;
                --shorts-nuker-surface-panel: rgba(17, 28, 41, 0.94);
                --shorts-nuker-surface-card: rgba(24, 39, 56, 0.88);
                --shorts-nuker-surface-card-hover: rgba(31, 50, 70, 0.95);
                --shorts-nuker-surface-border: rgba(255, 61, 78, 0.55);
                --shorts-nuker-surface-accent: #ff3148;
                --shorts-nuker-surface-text: #f6f8ff;
                --shorts-nuker-surface-muted: #b7c2d1;
                --shorts-nuker-surface-shadow: 0 10px 28px rgba(0, 0, 0, 0.34);
            }

            html,
            body,
            ytd-app,
            #page-manager,
            ytd-page-manager {
                background: var(--shorts-nuker-surface-bg) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            ytd-masthead,
            #masthead-container,
            #container.ytd-masthead,
            #background.ytd-masthead {
                background: rgba(10, 18, 28, 0.98) !important;
                border-bottom: 1px solid var(--shorts-nuker-surface-border) !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            ytd-searchbox,
            ytd-searchbox #container,
            #search-form,
            #search-input,
            input#search {
                background: rgba(8, 16, 25, 0.96) !important;
                border-color: var(--shorts-nuker-surface-border) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            ytd-searchbox #container,
            #search-form {
                border-radius: 8px !important;
                box-shadow: inset 0 0 0 1px rgba(255, 61, 78, 0.18) !important;
            }

            input#search::placeholder {
                color: var(--shorts-nuker-surface-muted) !important;
            }

            [role="listbox"],
            [role="option"],
            yt-searchbox-suggestions,
            ytd-searchbox-suggestion-renderer {
                background: rgba(12, 22, 33, 0.98) !important;
                border-color: var(--shorts-nuker-surface-border) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            [role="option"]:hover,
            ytd-searchbox-suggestion-renderer:hover {
                background: rgba(255, 49, 72, 0.18) !important;
            }

            ytd-guide-renderer,
            ytd-mini-guide-renderer,
            #sections.ytd-guide-renderer,
            ytd-guide-entry-renderer,
            ytd-mini-guide-entry-renderer {
                background: var(--shorts-nuker-surface-panel) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            ytd-guide-entry-renderer:hover,
            ytd-mini-guide-entry-renderer:hover {
                background: rgba(255, 49, 72, 0.14) !important;
            }

            yt-chip-cloud-renderer,
            yt-chip-cloud-chip-renderer,
            yt-chip-cloud-chip-renderer[chip-style] {
                background: rgba(12, 22, 33, 0.86) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            yt-chip-cloud-chip-renderer {
                border: 1px solid rgba(255, 61, 78, 0.38) !important;
                border-radius: 999px !important;
            }

            ytd-video-renderer,
            ytd-rich-item-renderer,
            ytd-rich-grid-media,
            ytd-compact-video-renderer,
            yt-lockup-view-model,
            ytd-comment-thread-renderer,
            ytd-comment-view-model {
                background: var(--shorts-nuker-surface-card) !important;
                border: 1px solid rgba(255, 61, 78, 0.24) !important;
                border-radius: 8px !important;
                box-shadow: var(--shorts-nuker-surface-shadow) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            ytd-video-renderer:hover,
            ytd-rich-item-renderer:hover,
            ytd-rich-grid-media:hover,
            ytd-compact-video-renderer:hover,
            yt-lockup-view-model:hover {
                background: var(--shorts-nuker-surface-card-hover) !important;
                border-color: var(--shorts-nuker-surface-border) !important;
            }

            #content-text,
            #video-title,
            yt-formatted-string,
            ytd-video-meta-block,
            #metadata-line,
            #metadata-line span,
            #description,
            #description-text,
            #byline,
            #channel-name,
            ytd-comment-thread-renderer #author-text,
            ytd-comment-thread-renderer #published-time-text {
                color: var(--shorts-nuker-surface-text) !important;
            }

            #metadata-line,
            #metadata-line span,
            ytd-video-meta-block,
            ytd-comment-thread-renderer #published-time-text,
            ytd-comment-thread-renderer #vote-count-middle {
                color: var(--shorts-nuker-surface-muted) !important;
            }

            button,
            tp-yt-paper-button,
            [role="button"],
            yt-button-shape button,
            .yt-spec-button-shape-next {
                border-color: rgba(255, 61, 78, 0.38) !important;
                color: var(--shorts-nuker-surface-text) !important;
            }

            button:hover,
            tp-yt-paper-button:hover,
            [role="button"]:hover,
            yt-button-shape button:hover,
            .yt-spec-button-shape-next:hover {
                background-color: rgba(255, 49, 72, 0.16) !important;
            }

            yt-icon,
            yt-icon svg,
            yt-icon path,
            ytd-masthead yt-icon,
            ytd-menu-renderer yt-icon,
            ytd-toggle-button-renderer yt-icon,
            ytd-notification-topbar-button-renderer yt-icon {
                color: var(--shorts-nuker-surface-accent) !important;
                fill: var(--shorts-nuker-surface-accent) !important;
                stroke: var(--shorts-nuker-surface-accent) !important;
            }

            a,
            a:visited {
                color: #ff7281 !important;
            }
        `;
        document.documentElement.appendChild(style);
    }

    function removeSurfaceThemeStyle() {
        removeStyleById(SURFACE_THEME_STYLE_ID);
    }

    function installCountsStyle() {
        if (document.getElementById(COUNTS_STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = COUNTS_STYLE_ID;
        style.textContent = `
            [${COUNT_HIDDEN_ATTR}="true"],
            [${WATCH_LIKE_PILL_FALLBACK_ATTR}="true"],
            ytd-video-view-count-renderer,
            .view-count,
            span.view-count,
            yt-formatted-string.view-count,
            #count .view-count,
            #info .view-count,
            #info-container .view-count,
            ytd-comment-action-buttons-renderer #vote-count-middle,
            ytd-comment-engagement-bar #vote-count-middle {
                display: none !important;
            }
        `;
        document.documentElement.appendChild(style);
    }

    function removeCountsStyle() {
        removeStyleById(COUNTS_STYLE_ID);
    }

    function removeElement(element) {
        if (element && element.parentNode) {
            element.remove();
        }
    }

    function normalizeInlineText(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function getElementText(element) {
        return normalizeInlineText(element ? element.textContent : "");
    }

    function getAttributeText(element) {
        if (!element || !element.getAttribute) {
            return "";
        }

        return [
            element.tagName,
            element.id,
            element.getAttribute("class"),
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
            element.getAttribute("data-tooltip-text"),
            element.getAttribute("aria-description"),
            element.getAttribute("aria-valuetext")
        ].filter(Boolean).join(" ").toLowerCase();
    }

    function hasViewCountText(text) {
        return /(^|\b)(no views?|[\d.,]+(?:\s*[kmgtb])?\s+(?:views?|watching)(?:\s+now)?|[\d.,]+\s+(?:thousand|million|billion)\s+views?)\b/i.test(text);
    }

    function hasLikeCountText(text) {
        return /(^|\b)([\d.,]+(?:\s*[kmgtb])?\s+likes?|likes?\s+[\d.,]+(?:\s*[kmgtb])?)\b/i.test(text);
    }

    function isCompactCountText(text) {
        return /^(?:[\d.,]+(?:\s*[kmgtb])?|no)$/i.test(text);
    }

    function hasViewCountRelation(element) {
        const relationText = getAttributeText(element);
        return /view-count|view count|\bviews?\b|\bwatching\b/.test(relationText);
    }

    function hasLikeCountRelation(element) {
        const relationText = getAttributeText(element);
        return !/\bdislike\b/.test(relationText)
            && /like-button|like button|\blikes?\b|like this|thumbs up/.test(relationText);
    }

    function isControlElement(element) {
        if (!element || !element.matches) {
            return false;
        }

        return element.matches(CONTROL_CONTAINER_SELECTORS);
    }

    function closestLikeControl(element) {
        if (!element || !element.closest) {
            return null;
        }

        const specificControl = element.closest("like-button-view-model, ytd-toggle-button-renderer, ytd-comment-action-buttons-renderer, ytd-reel-player-overlay-renderer");
        if (specificControl) {
            if (specificControl.matches && specificControl.matches("ytd-comment-action-buttons-renderer")) {
                return specificControl;
            }

            if (specificControl.matches && specificControl.matches("like-button-view-model")) {
                return specificControl;
            }

            if (hasLikeCountRelation(specificControl)) {
                return specificControl;
            }
        }

        const genericControl = element.closest("button, [role=\"button\"]");
        if (genericControl && hasLikeCountRelation(genericControl)) {
            return genericControl;
        }

        return null;
    }

    function closestViewCountSurface(element) {
        if (!element || !element.closest) {
            return null;
        }

        return element.closest("ytd-video-view-count-renderer, ytd-video-meta-block, #metadata-line, #count, #info, #info-container, ytd-reel-player-overlay-renderer");
    }

    function isInsideVideoPlayerSurface(element) {
        if (!element || !element.closest) {
            return false;
        }

        return Boolean(element.closest(".html5-video-player, #movie_player, .ytp-chrome-controls, .ytp-player-content"));
    }

    function isWatchPage() {
        try {
            return location.pathname === "/watch";
        } catch (error) {
            return false;
        }
    }

    function getWatchMetadata(root = document) {
        if (!isWatchPage()) {
            return null;
        }

        if (root && root.nodeType === Node.ELEMENT_NODE) {
            if (root.matches && root.matches("ytd-watch-metadata")) {
                return root;
            }

            if (root.closest) {
                const closestMetadata = root.closest("ytd-watch-metadata");
                if (closestMetadata) {
                    return closestMetadata;
                }
            }

            if (root.querySelector) {
                return root.querySelector("ytd-watch-metadata") || document.querySelector("ytd-watch-metadata");
            }
        }

        return document.querySelector("ytd-watch-metadata");
    }

    function getWatchActionSurfaces(root = document) {
        const metadata = getWatchMetadata(root);
        if (!metadata) {
            return [];
        }

        const surfaces = [metadata];
        metadata.querySelectorAll("#top-level-buttons-computed, ytd-menu-renderer, segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer").forEach((surface) => {
            if (!surfaces.includes(surface)) {
                surfaces.push(surface);
            }
        });
        return surfaces;
    }

    function getWatchLikePills(root = document) {
        const metadata = getWatchMetadata(root);
        if (!metadata) {
            return [];
        }

        return Array.from(metadata.querySelectorAll("segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer"))
            .filter((element) => !isInsideVideoPlayerSurface(element));
    }

    function isDiagnosticCompactCountText(text) {
        return /^(?:\d{1,3}(?:[.,]\d+)?|\d+)(?:\s*[kmgtb])?$/i.test(normalizeInlineText(text));
    }

    function getElementClassName(element) {
        if (!element) {
            return "";
        }

        if (typeof element.className === "string") {
            return element.className;
        }

        return element.getAttribute ? element.getAttribute("class") || "" : "";
    }

    function describeElementBriefly(element) {
        if (!element || !element.tagName) {
            return null;
        }

        return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || "",
            className: getElementClassName(element),
            ariaLabel: element.getAttribute ? element.getAttribute("aria-label") || "" : "",
            textContent: normalizeInlineText(element.textContent || "").slice(0, 120)
        };
    }

    function getCustomYouTubeComponentChain(element) {
        const chain = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
            const tagName = current.tagName ? current.tagName.toLowerCase() : "";
            if (tagName.includes("-") || tagName.startsWith("yt")) {
                let label = tagName;
                if (current.id) {
                    label += `#${current.id}`;
                }
                const className = getElementClassName(current).split(/\s+/).filter(Boolean).slice(0, 3).join(".");
                if (className) {
                    label += `.${className}`;
                }
                chain.push(label);
            }
            current = current.parentElement;
        }

        return chain.slice(0, 12);
    }

    function rectToPlainObject(element) {
        if (!element || !element.getBoundingClientRect) {
            return null;
        }

        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left)
        };
    }

    function collectCompactCountsFromText(text) {
        const matches = String(text || "").match(/\b\d{1,3}(?:[.,]\d+)?\s*[kmgtb]?\b|\b\d+\b/gi) || [];
        return Array.from(new Set(matches.map(normalizeInlineText).filter(isDiagnosticCompactCountText))).slice(0, 50);
    }

    function describeWatchCountCandidate(element, text, source) {
        const closestButton = element && element.closest ? element.closest("button, [role=\"button\"]") : null;
        const closestMetadata = element && element.closest ? element.closest("ytd-watch-metadata") : null;
        return {
            source,
            textContent: text,
            tagName: element && element.tagName ? element.tagName.toLowerCase() : "",
            className: getElementClassName(element),
            id: element && element.id ? element.id : "",
            customYouTubeComponentChain: getCustomYouTubeComponentChain(element),
            closestButton: describeElementBriefly(closestButton),
            hasClosestWatchMetadata: Boolean(closestMetadata),
            insidePlayerSurface: isInsideVideoPlayerSurface(element),
            rect: rectToPlainObject(element),
            outerHTMLSlice: element && element.outerHTML ? element.outerHTML.slice(0, 700) : "",
            documentBodyInnerTextIncludesCandidate: Boolean(document.body && document.body.innerText && document.body.innerText.includes(text)),
            watchMetadataInnerTextIncludesCandidate: Boolean(closestMetadata && closestMetadata.innerText && closestMetadata.innerText.includes(text))
        };
    }

    function collectWatchLikeDiagnosticCandidates() {
        const candidates = [];
        const seen = new Set();

        getWatchActionSurfaces(document).forEach((surface) => {
            if (!surface || isInsideVideoPlayerSurface(surface)) {
                return;
            }

            surface.querySelectorAll("*").forEach((element) => {
                const text = getElementText(element);
                if (!text || !isDiagnosticCompactCountText(text)) {
                    return;
                }

                const key = `element:${text}:${element.tagName}:${element.id}:${getElementClassName(element)}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    candidates.push(describeWatchCountCandidate(element, text, "element"));
                }
            });

            const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    const text = normalizeInlineText(node.nodeValue);
                    return isDiagnosticCompactCountText(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });

            let textNode = walker.nextNode();
            while (textNode) {
                const element = textNode.parentElement;
                const text = normalizeInlineText(textNode.nodeValue);
                const key = `text:${text}:${element && element.tagName}:${element && element.id}:${getElementClassName(element)}`;
                if (element && !seen.has(key)) {
                    seen.add(key);
                    candidates.push(describeWatchCountCandidate(element, text, "text-node"));
                }
                textNode = walker.nextNode();
            }
        });

        return candidates;
    }

    function debugWatchPageLikeCountDom(root = document) {
        if (!DEBUG || !isWatchPage() || root !== document || lastWatchLikeDiagnosticUrl === location.href) {
            return;
        }

        const metadata = getWatchMetadata(document);
        if (!metadata) {
            return;
        }

        lastWatchLikeDiagnosticUrl = location.href;
        const bodyInnerText = document.body && document.body.innerText ? document.body.innerText : "";
        const metadataInnerText = metadata.innerText || "";
        console.debug("[ShortsNuker][watch-like-count-diagnostic]", {
            url: location.href,
            documentBodyCompactCounts: collectCompactCountsFromText(bodyInnerText),
            watchMetadataCompactCounts: collectCompactCountsFromText(metadataInnerText),
            documentBodyInnerTextLength: bodyInnerText.length,
            watchMetadataInnerTextLength: metadataInnerText.length,
            candidates: collectWatchLikeDiagnosticCandidates()
        });
    }

    function isWatchPageLikeCountElement(element, text) {
        if (!element || !element.closest || !isCompactCountText(text) || isInsideVideoPlayerSurface(element)) {
            return false;
        }

        const watchActionSurface = element.closest("ytd-watch-metadata #top-level-buttons-computed, ytd-watch-metadata ytd-menu-renderer, ytd-watch-metadata segmented-like-dislike-button-view-model, ytd-watch-metadata ytd-segmented-like-dislike-button-renderer");
        if (!watchActionSurface) {
            return false;
        }

        const likeSide = element.closest("like-button-view-model, button, [role=\"button\"]");
        if (!likeSide || !watchActionSurface.contains(likeSide)) {
            return false;
        }

        return (likeSide.matches && likeSide.matches("like-button-view-model")) || hasLikeCountRelation(likeSide);
    }

    function isProtectedTextSurface(element) {
        if (!element || !element.closest) {
            return false;
        }

        if (element.id === "vote-count-middle" || hasViewCountRelation(element) || hasLikeCountRelation(element)) {
            return false;
        }

        return Boolean(element.closest(PROTECTED_TEXT_SELECTORS));
    }

    function isCountTextElement(element) {
        const text = getElementText(element);
        if (!text || isProtectedTextSurface(element)) {
            return false;
        }

        if (hasViewCountText(text) || hasLikeCountText(text)) {
            return true;
        }

        if (hasViewCountRelation(element) && (isCompactCountText(text) || text.length <= 24)) {
            return true;
        }

        if (hasLikeCountRelation(element) && isCompactCountText(text)) {
            return true;
        }

        if (isWatchPageLikeCountElement(element, text)) {
            return true;
        }

        if (element.id === "vote-count-middle" && isCompactCountText(text)) {
            return true;
        }

        if (closestLikeControl(element) && isCompactCountText(text)) {
            return true;
        }

        return Boolean(closestViewCountSurface(element) && hasViewCountText(text));
    }

    function hideCountElement(element) {
        if (!element || !element.setAttribute || isControlElement(element)) {
            return false;
        }

        if (element.getAttribute(COUNT_HIDDEN_ATTR) === "true") {
            return false;
        }

        if (!element.hasAttribute(COUNT_ORIGINAL_ARIA_ATTR)) {
            element.setAttribute(COUNT_ORIGINAL_ARIA_ATTR, element.getAttribute("aria-hidden") || "");
        }
        element.setAttribute(COUNT_SCANNED_ATTR, "true");
        element.setAttribute(COUNT_HIDDEN_ATTR, "true");
        element.setAttribute("aria-hidden", "true");
        return true;
    }

    function hideReachableWatchPageLikeCountText(root = document) {
        let hiddenCount = 0;

        getWatchActionSurfaces(root).forEach((surface) => {
            if (!surface || isInsideVideoPlayerSurface(surface)) {
                return;
            }

            const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    const text = normalizeInlineText(node.nodeValue);
                    if (!isCompactCountText(text)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const element = node.parentElement;
                    return element && isWatchPageLikeCountElement(element, text)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                }
            });

            let textNode = walker.nextNode();
            while (textNode) {
                const element = textNode.parentElement;
                const text = normalizeInlineText(textNode.nodeValue);
                if (element && getElementText(element) === text) {
                    if (element.getAttribute(COUNT_HIDDEN_ATTR) === "true" || hideCountElement(element)) {
                        hiddenCount += 1;
                    }
                }
                textNode = walker.nextNode();
            }
        });

        return hiddenCount;
    }

    function hideWatchPageLikePillFallback(root = document) {
        if (!isWatchPage()) {
            return 0;
        }

        let hiddenCount = 0;
        getWatchLikePills(root).forEach((pill) => {
            if (pill.getAttribute(WATCH_LIKE_PILL_FALLBACK_ATTR) === "true") {
                return;
            }

            pill.setAttribute(WATCH_LIKE_PILL_FALLBACK_ATTR, "true");
            pill.setAttribute(COUNT_SCANNED_ATTR, "true");
            hiddenCount += 1;
        });
        return hiddenCount;
    }

    function unhideEngagementCounts(root = document) {
        queryAllIncludingRoot(root, `[${COUNT_HIDDEN_ATTR}="true"]`).forEach((element) => {
            const originalAriaHidden = element.getAttribute(COUNT_ORIGINAL_ARIA_ATTR);
            element.removeAttribute(COUNT_HIDDEN_ATTR);
            element.removeAttribute(COUNT_SCANNED_ATTR);
            element.removeAttribute(COUNT_ORIGINAL_ARIA_ATTR);

            if (originalAriaHidden) {
                element.setAttribute("aria-hidden", originalAriaHidden);
            } else {
                element.removeAttribute("aria-hidden");
            }
        });

        queryAllIncludingRoot(root, `[${WATCH_LIKE_PILL_FALLBACK_ATTR}="true"]`).forEach((element) => {
            element.removeAttribute(WATCH_LIKE_PILL_FALLBACK_ATTR);
            element.removeAttribute(COUNT_SCANNED_ATTR);
        });
    }

    function hideCountTextCandidates(root = document) {
        queryAllIncludingRoot(root, COUNT_TEXT_CANDIDATE_SELECTORS.join(", ")).forEach((element) => {
            if (isCountTextElement(element)) {
                hideCountElement(element);
            }
        });
    }

    function hideCountsInsideRelatedControls(root = document) {
        queryAllIncludingRoot(root, COUNT_RELATION_SELECTOR).forEach((element) => {
            if (!hasViewCountRelation(element) && !hasLikeCountRelation(element)) {
                return;
            }

            if (!isControlElement(element) && isCountTextElement(element)) {
                hideCountElement(element);
                return;
            }

            queryAllIncludingRoot(element, RELATED_COUNT_CHILD_SELECTORS).forEach((child) => {
                if (child !== element && isCountTextElement(child)) {
                    hideCountElement(child);
                }
            });
        });
    }

    function hideEngagementCounts(root = document) {
        debugWatchPageLikeCountDom(root);
        installCountsStyle();
        const reachableWatchLikeCountHidden = hideReachableWatchPageLikeCountText(root);
        hideCountTextCandidates(root);
        hideCountsInsideRelatedControls(root);
        if (reachableWatchLikeCountHidden === 0) {
            hideWatchPageLikePillFallback(root);
        }
        debugLog("hide views/likes scan complete", root === document ? "document" : root.nodeName);
    }

    function removeDirectShorts(root = document) {
        queryAllIncludingRoot(root, DIRECT_SHORTS_SELECTORS.join(", ")).forEach(removeElement);
    }

    function removeShortsLinks(root = document) {
        queryAllIncludingRoot(root, SHORTS_LINK_SELECTORS.join(", ")).forEach((link) => {
            const container = link.closest(REMOVABLE_CONTAINER_SELECTORS.join(", "));
            removeElement(container || link);
        });
    }

    function getSearchQueryTokens() {
        const url = new URL(location.href);
        if (url.pathname !== "/results" || !url.searchParams.has("search_query")) {
            return [];
        }

        return tokenizeText(url.searchParams.get("search_query"));
    }

    function tokenizeText(text) {
        return String(text || "")
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter((token) => token.length >= 2);
    }

    function hasTokenOverlap(queryTokens, titleTokens) {
        const titleTokenSet = new Set(titleTokens);
        return queryTokens.some((token) => titleTokenSet.has(token));
    }

    function removeSearchResultsWithoutQueryTitleOverlap(root = document) {
        const queryTokens = getSearchQueryTokens();
        if (!queryTokens.length) {
            return;
        }

        queryAllIncludingRoot(root, SEARCH_TITLE_SELECTORS.join(", ")).forEach((titleElement) => {
            const container = titleElement.closest(SEARCH_RESULT_CONTAINER_SELECTORS.join(", "));
            if (!container || !document.contains(container)) {
                return;
            }

            const titleTokens = tokenizeText(titleElement.textContent);
            if (!hasTokenOverlap(queryTokens, titleTokens)) {
                removeElement(container);
            }
        });
    }

    function applyEnabledFeatures(root = document) {
        if (extensionContextInvalidated) {
            return false;
        }

        if (currentSettings.removeShorts) {
            installShortsStyle();
            removeDirectShorts(root);
            removeShortsLinks(root);
        } else {
            removeStyleById(SHORTS_STYLE_ID);
        }

        if (currentSettings.strictSearchTitleMatch) {
            removeSearchResultsWithoutQueryTitleOverlap(root);
        }

        if (currentSettings.themeColorTest) {
            installThemeStyle();
        } else {
            removeThemeStyle();
        }

        if (currentSettings.themeSurfaceTest) {
            installSurfaceThemeStyle();
        } else {
            removeSurfaceThemeStyle();
        }

        if (currentSettings.hideViewsAndLikes) {
            hideEngagementCounts(root);
        } else if (document.getElementById(COUNTS_STYLE_ID)) {
            removeCountsStyle();
            unhideEngagementCounts();
        }

        debugLog("features applied", currentSettings);
        return true;
    }

    function refreshFeatures(root = document) {
        if (extensionContextInvalidated) {
            return Promise.resolve(false);
        }

        return loadSettings().then((settings) => {
            if (!settings || extensionContextInvalidated) {
                return false;
            }

            return applyEnabledFeatures(root);
        }).catch((error) => {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
            return false;
        });
    }

    function cleanupExtensionInstance() {
        if (pendingScanTimer) {
            window.clearTimeout(pendingScanTimer);
            pendingScanTimer = null;
        }

        pendingScanRoots.clear();

        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }

        observerStarted = false;
    }

    function shouldScanRoot(root) {
        if (!root) {
            return false;
        }

        if (root === document || root === document.body || root === document.documentElement) {
            return true;
        }

        return root.nodeType === Node.ELEMENT_NODE && document.documentElement.contains(root);
    }

    function flushScheduledFeatureApplication() {
        pendingScanTimer = null;

        if (extensionContextInvalidated) {
            cleanupExtensionInstance();
            return;
        }

        const roots = Array.from(pendingScanRoots);
        pendingScanRoots.clear();

        roots.forEach((root) => {
            if (shouldScanRoot(root)) {
                applyEnabledFeatures(root);
            }
        });
    }

    function scheduleFeatureApplication(root = document) {
        if (extensionContextInvalidated || !shouldScanRoot(root)) {
            return;
        }

        pendingScanRoots.add(root);

        if (pendingScanTimer) {
            return;
        }

        pendingScanTimer = window.setTimeout(flushScheduledFeatureApplication, MUTATION_SCAN_DEBOUNCE_MS);
    }

    function startObserver() {
        if (observerStarted || extensionContextInvalidated || !document.body) {
            return;
        }
        observerStarted = true;

        domObserver = new MutationObserver((mutations) => {
            if (extensionContextInvalidated) {
                cleanupExtensionInstance();
                return;
            }

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        scheduleFeatureApplication(node);
                    }
                });
            });
        });

        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    function safeSendResponse(sendResponse, response) {
        try {
            sendResponse(response);
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
        }
    }

    function installMessageHandlers() {
        if (messageHandlersInstalled || !isChromeRuntimeAvailable()) {
            return;
        }

        try {
            if (!chrome.runtime.onMessage) {
                return;
            }

            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (!message || message.type !== "refreshFeatures") {
                    return false;
                }

                refreshFeatures().then((applied) => {
                    safeSendResponse(sendResponse, { ok: Boolean(applied) });
                }).catch((error) => {
                    if (isExtensionContextInvalidatedError(error)) {
                        markExtensionContextInvalidated();
                    }
                    safeSendResponse(sendResponse, { ok: false });
                });
                return true;
            });

            messageHandlersInstalled = true;
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
            return;
        }

        try {
            if (chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName !== "sync" && areaName !== "local") {
                        return;
                    }

                    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
                        if (changes[key]) {
                            currentSettings[key] = changes[key].newValue;
                        }
                    });
                    scheduleFeatureApplication(document);
                });
            }
        } catch (error) {
            if (isExtensionContextInvalidatedError(error)) {
                markExtensionContextInvalidated();
            }
        }
    }

    function initialize() {
        if (!document.body || extensionContextInvalidated) {
            return;
        }

        installMessageHandlers();
        refreshFeatures().then((applied) => {
            if (applied !== false) {
                startObserver();
            }
        });
    }

    if (document.body) {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    }

    window.addEventListener("yt-navigate-finish", () => {
        refreshFeatures(document);
    });
    window.addEventListener("pagehide", cleanupExtensionInstance);
    window.addEventListener("beforeunload", cleanupExtensionInstance);
}());
