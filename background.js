/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const IGNORED_HOSTS_STORAGE_KEY = "ignoredHosts";
const DEFAULT_ICON_PATH = "icons/icon-64.png";
const INACTIVE_ICON_PATH = "icons/icon-64-inactive.png";

let ignoredHosts = new Set();

function getHostFromUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.hostname;
    } catch (e) {
        return null;
    }
}

function isIgnoredTab(tab) {
    const host = getHostFromUrl(tab.url);
    return !!host && ignoredHosts.has(host);
}

function updateBrowserActionIcon(tab) {
    const path = tab && isIgnoredTab(tab) ? INACTIVE_ICON_PATH : DEFAULT_ICON_PATH;
    chrome.browserAction.setIcon({path});
}

function updateBrowserActionIconForActiveTab() {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        updateBrowserActionIcon(tabs[0]);
    });
}

function setMuted(tab, muted) {
    if (muted && isIgnoredTab(tab)) {

        // never auto-mute ignored hosts.
        return;
    }

    if (!tab.mutedInfo.muted && tab.mutedInfo.reason === "user") {

        // never mute a tab that was manually unmuted.
        return;
    }

    chrome.tabs.update(tab.id, {muted});
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) {
        updateBrowserActionIcon(tab);
    }

    if (tab.active)
        return;

    if (changeInfo.audible)
        setMuted(tab, true);
});

function updateInactive() {
    chrome.tabs.query({active: false, audible: true}, tabs => {
        tabs.forEach(tab => setMuted(tab, true));
    });
}

chrome.tabs.onActivated.addListener(({tabId}) => {
    chrome.tabs.get(tabId, tab => {
        setMuted(tab, false);
        updateBrowserActionIcon(tab);
    });

    updateInactive();
});

chrome.storage.local.get({[IGNORED_HOSTS_STORAGE_KEY]: []}, result => {
    ignoredHosts = new Set(result[IGNORED_HOSTS_STORAGE_KEY]);
    updateInactive();
    updateBrowserActionIconForActiveTab();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[IGNORED_HOSTS_STORAGE_KEY]) {
        return;
    }

    ignoredHosts = new Set(changes[IGNORED_HOSTS_STORAGE_KEY].newValue || []);
    updateBrowserActionIconForActiveTab();
});
