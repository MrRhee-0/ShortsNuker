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

    function removeDirectShorts() {
        document.querySelectorAll(DIRECT_SHORTS_SELECTORS.join(", ")).forEach(removeElement);
    }

    function removeShortsLinks() {
        document.querySelectorAll(SHORTS_LINK_SELECTORS.join(", ")).forEach((link) => {
            const container = link.closest(REMOVABLE_CONTAINER_SELECTORS.join(", "));
            removeElement(container || link);
        });
    }

    function nukeShorts() {
        installStyle();
        removeDirectShorts();
        removeShortsLinks();
    }

    function startObserver() {
        const observer = new MutationObserver(() => {
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
}());
