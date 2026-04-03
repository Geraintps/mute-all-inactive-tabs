/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const STORAGE_KEY = "ignoredHosts";

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

function getCurrentTab(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        callback(tabs[0] || null);
    });
}

function getIgnoredHosts(callback) {
    chrome.storage.local.get({[STORAGE_KEY]: []}, result => {
        callback(new Set(result[STORAGE_KEY]));
    });
}

function setIgnoredState(host, ignore, callback) {
    getIgnoredHosts(ignoredHosts => {
        if (ignore) {
            ignoredHosts.add(host);
        } else {
            ignoredHosts.delete(host);
        }

        chrome.storage.local.set({[STORAGE_KEY]: Array.from(ignoredHosts)}, callback);
    });
}

const ignoreSiteCheckbox = document.getElementById("ignoreSite");
const siteElement = document.getElementById("site");
const messageElement = document.getElementById("message");

getCurrentTab(tab => {
    const host = tab && getHostFromUrl(tab.url);

    if (!host) {
        ignoreSiteCheckbox.disabled = true;
        messageElement.hidden = false;
        messageElement.textContent = "This page cannot be ignored.";
        siteElement.textContent = tab && tab.url ? tab.url : "No active tab.";
        return;
    }

    siteElement.textContent = host;

    getIgnoredHosts(ignoredHosts => {
        ignoreSiteCheckbox.checked = ignoredHosts.has(host);
    });

    ignoreSiteCheckbox.addEventListener("change", () => {
        setIgnoredState(host, ignoreSiteCheckbox.checked, () => {
            // Saved.
        });
    });
});
