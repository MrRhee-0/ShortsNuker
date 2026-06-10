(function () {
    "use strict";

    const DEFAULT_SETTINGS = {
        removeShorts: true,
        strictSearchTitleMatch: true,
        themeColorTest: false
    };
    const CONTROL_IDS = Object.keys(DEFAULT_SETTINGS);
    const status = document.getElementById("status");

    function getStorageArea() {
        return chrome.storage.sync || chrome.storage.local;
    }

    function setStatus(text) {
        status.textContent = text;
    }

    function loadSettings() {
        return new Promise((resolve) => {
            getStorageArea().get(DEFAULT_SETTINGS, (storedSettings) => {
                resolve({ ...DEFAULT_SETTINGS, ...storedSettings });
            });
        });
    }

    function saveSetting(key, value) {
        return new Promise((resolve) => {
            getStorageArea().set({ [key]: value }, resolve);
        });
    }

    function notifyActiveYouTubeTab() {
        if (!chrome.tabs || !chrome.tabs.query || !chrome.tabs.sendMessage) {
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            if (!tab || !tab.id) {
                return;
            }

            chrome.tabs.sendMessage(tab.id, { type: "refreshFeatures" }, () => {
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        });
    }

    function initializeControls(settings) {
        CONTROL_IDS.forEach((key) => {
            const control = document.getElementById(key);
            control.checked = Boolean(settings[key]);
            control.addEventListener("change", () => {
                saveSetting(key, control.checked).then(() => {
                    notifyActiveYouTubeTab();
                    setStatus("Changes apply to YouTube tabs");
                });
            });
        });
    }

    loadSettings().then((settings) => {
        initializeControls(settings);
        setStatus("Changes apply to YouTube tabs");
    });
}());
