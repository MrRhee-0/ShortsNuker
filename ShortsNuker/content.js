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
    const COUNT_ORIGINAL_ARIA_ATTR = "data-shorts-nuker-original-aria-hidden";
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
        "button span",
        "[role=\"button\"] span",
        "yt-formatted-string",
        "span"
    ];
    const COUNT_RELATION_SELECTOR = [
        "[aria-label]",
        "[title]",
        "[data-tooltip-text]",
        "[aria-description]",
        "[aria-valuetext]"
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

    function getStorageArea() {
        if (typeof chrome === "undefined" || !chrome.storage) {
            return null;
        }

        return chrome.storage.sync || chrome.storage.local || null;
    }

    function loadSettings() {
        const storageArea = getStorageArea();
        if (!storageArea) {
            currentSettings = { ...DEFAULT_SETTINGS };
            return Promise.resolve(currentSettings);
        }

        return new Promise((resolve) => {
            storageArea.get(DEFAULT_SETTINGS, (storedSettings) => {
                currentSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
                resolve(currentSettings);
            });
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

        return element.matches("button, [role=\"button\"], ytd-toggle-button-renderer, ytd-segmented-like-dislike-button-renderer, segmented-like-dislike-button-view-model, like-button-view-model, dislike-button-view-model");
    }

    function closestLikeControl(element) {
        if (!element || !element.closest) {
            return null;
        }

        const control = element.closest("button, [role=\"button\"], ytd-toggle-button-renderer, ytd-segmented-like-dislike-button-renderer, segmented-like-dislike-button-view-model, like-button-view-model, ytd-comment-action-buttons-renderer, ytd-reel-player-overlay-renderer");
        if (!control) {
            return null;
        }

        if (control.matches && control.matches("ytd-comment-action-buttons-renderer")) {
            return control;
        }

        return hasLikeCountRelation(control) ? control : null;
    }

    function closestViewCountSurface(element) {
        if (!element || !element.closest) {
            return null;
        }

        return element.closest("ytd-video-view-count-renderer, ytd-video-meta-block, #metadata-line, #count, #info, #info-container, ytd-reel-player-overlay-renderer");
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
            return;
        }

        if (!element.hasAttribute(COUNT_ORIGINAL_ARIA_ATTR)) {
            element.setAttribute(COUNT_ORIGINAL_ARIA_ATTR, element.getAttribute("aria-hidden") || "");
        }
        element.setAttribute(COUNT_HIDDEN_ATTR, "true");
        element.setAttribute("aria-hidden", "true");
    }

    function unhideEngagementCounts(root = document) {
        queryAllIncludingRoot(root, `[${COUNT_HIDDEN_ATTR}="true"]`).forEach((element) => {
            const originalAriaHidden = element.getAttribute(COUNT_ORIGINAL_ARIA_ATTR);
            element.removeAttribute(COUNT_HIDDEN_ATTR);
            element.removeAttribute(COUNT_ORIGINAL_ARIA_ATTR);

            if (originalAriaHidden) {
                element.setAttribute("aria-hidden", originalAriaHidden);
            } else {
                element.removeAttribute("aria-hidden");
            }
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

            queryAllIncludingRoot(element, "span, yt-formatted-string, #text, #label, #vote-count-middle").forEach((child) => {
                if (child !== element && isCountTextElement(child)) {
                    hideCountElement(child);
                }
            });
        });
    }

    function hideEngagementCounts(root = document) {
        installCountsStyle();
        hideCountTextCandidates(root);
        hideCountsInsideRelatedControls(root);
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
        } else {
            removeCountsStyle();
            unhideEngagementCounts();
        }
    }

    function refreshFeatures(root = document) {
        return loadSettings().then(() => {
            applyEnabledFeatures(root);
        });
    }

    function startObserver() {
        if (observerStarted) {
            return;
        }
        observerStarted = true;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        applyEnabledFeatures(node);
                    }
                });
            });

            applyEnabledFeatures();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function installMessageHandlers() {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) {
            return;
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || message.type !== "refreshFeatures") {
                return false;
            }

            refreshFeatures().then(() => {
                sendResponse({ ok: true });
            });
            return true;
        });

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
                applyEnabledFeatures();
            });
        }
    }

    function initialize() {
        if (!document.body) {
            return;
        }

        installMessageHandlers();
        refreshFeatures().then(() => {
            startObserver();
        });
    }

    if (document.body) {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    }

    window.addEventListener("yt-navigate-finish", () => {
        refreshFeatures();
    });
}());
