(function () {
    "use strict";

    const DEFAULT_SETTINGS = {
        removeShorts: true,
        strictSearchTitleMatch: true,
        themeColorTest: false,
        themeSurfaceTest: false,
        hideViewsAndLikes: false
    };
    const CONTROL_IDS = Object.keys(DEFAULT_SETTINGS);
    const status = document.getElementById("status");

    function getLastRuntimeError() {
        try {
            return chrome.runtime && chrome.runtime.lastError ? chrome.runtime.lastError : null;
        } catch (error) {
            return null;
        }
    }

    function getStorageArea() {
        if (typeof chrome === "undefined" || !chrome.storage) {
            return null;
        }

        return chrome.storage.sync || chrome.storage.local || null;
    }

    function setStatus(text) {
        status.textContent = text;
    }

    function loadSettings() {
        return new Promise((resolve) => {
            const storageArea = getStorageArea();
            if (!storageArea) {
                resolve({ ...DEFAULT_SETTINGS });
                return;
            }

            try {
                storageArea.get(DEFAULT_SETTINGS, (storedSettings) => {
                    if (getLastRuntimeError()) {
                        resolve({ ...DEFAULT_SETTINGS });
                        return;
                    }

                    resolve({ ...DEFAULT_SETTINGS, ...storedSettings });
                });
            } catch (error) {
                resolve({ ...DEFAULT_SETTINGS });
            }
        });
    }

    function saveSetting(key, value) {
        return new Promise((resolve) => {
            const storageArea = getStorageArea();
            if (!storageArea) {
                resolve(false);
                return;
            }

            try {
                storageArea.set({ [key]: value }, () => {
                    resolve(!getLastRuntimeError());
                });
            } catch (error) {
                resolve(false);
            }
        });
    }

    function notifyActiveYouTubeTab() {
        if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query || !chrome.tabs.sendMessage) {
            return;
        }

        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (getLastRuntimeError()) {
                    return;
                }

                const tab = tabs && tabs[0];
                if (!tab || !tab.id) {
                    return;
                }

                chrome.tabs.sendMessage(tab.id, { type: "refreshFeatures" }, () => {
                    getLastRuntimeError();
                });
            });
        } catch (error) {
            return;
        }
    }

    function initializeControls(settings) {
        CONTROL_IDS.forEach((key) => {
            const control = document.getElementById(key);
            control.checked = Boolean(settings[key]);
            control.addEventListener("change", () => {
                saveSetting(key, control.checked).then((saved) => {
                    if (saved) {
                        notifyActiveYouTubeTab();
                        setStatus("Changes apply to YouTube tabs");
                    } else {
                        setStatus("Reload the extension to apply changes");
                    }
                }).catch(() => {
                    setStatus("Reload the extension to apply changes");
                });
            });
        });
    }

    loadSettings().then((settings) => {
        initializeControls(settings);
        setStatus("Changes apply to YouTube tabs");
    }).catch(() => {
        initializeControls(DEFAULT_SETTINGS);
        setStatus("Reload the extension to apply changes");
    });
}());
