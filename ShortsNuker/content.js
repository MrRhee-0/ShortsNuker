(function () {
    "use strict";

    if (window.__shortsNukerActive) {
        return;
    }
    window.__shortsNukerActive = true;

    const STYLE_ID = "shorts-nuker-style";
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

    function installStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `${DIRECT_SHORTS_SELECTORS.join(", ")} { display: none !important; }`;
        document.documentElement.appendChild(style);
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

    function nukeShorts(root = document) {
        installStyle();
        removeDirectShorts(root);
        removeShortsLinks(root);
        removeSearchResultsWithoutQueryTitleOverlap(root);
    }

    function startObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        nukeShorts(node);
                    }
                });
            });

            nukeShorts();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function initialize() {
        if (!document.body) {
            return;
        }

        nukeShorts();
        startObserver();
    }

    if (document.body) {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    }

    window.addEventListener("yt-navigate-finish", () => {
        nukeShorts();
    });
}());
