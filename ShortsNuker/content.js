(function () {
    "use strict";

    if (window.__shortsNukerActive) {
        return;
    }
    window.__shortsNukerActive = true;

    const DEFAULT_SETTINGS = {
        removeShorts: true,
        strictSearchTitleMatch: true,
        themeColorTest: false
    };
    const SHORTS_STYLE_ID = "shorts-nuker-style";
    const THEME_STYLE_ID = "shorts-nuker-theme-style";
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

    function removeElement(element) {
        if (element && element.parentNode) {
            element.remove();
        }
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
