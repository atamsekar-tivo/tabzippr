/**
 * TabZippr Core Background Service
 * Version: 1.0.0
 * DO NOT MODIFY CORE FUNCTIONALITY without thorough testing
 */

// Load JSZip library
try {
  importScripts('jszip.min.js');
  console.log('JSZip loaded successfully');
} catch (error) {
  console.error('Failed to load JSZip:', error);
}

// CORE FUNCTIONALITY START - DO NOT MODIFY WITHOUT TESTING //

// Global state to track duplicate counts
let lastDuplicateCount = 0;

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Create a promise chain for async operations
  const handleMessage = async () => {
    try {
      if (message.action === 'createBackup') {
        await createBackup(message.data);
        return { success: true };
      } else if (message.action === 'restoreBackup') {
        await restoreBackup(message.data);
        return { success: true };
      } else if (message.action === 'forceBadgeUpdate') {
        lastDuplicateCount = -1; // Reset count to force update
        await updateDuplicateTabBadges();
        return { success: true };
      }
    } catch (error) {
      console.error('Error in background script:', error);
      return { success: false, error: error.message };
    }
  };

  handleMessage().then(response => sendResponse(response));
  return true; // Required for async response
});

/**
 * Core function: Creates a backup of the current window's tabs
 * @param {Object} param0 Contains tabData and filename
 * @returns {Promise<number>} Returns download ID on success
 */
async function createBackup({ tabData, filename }) {
  const zip = new JSZip();

  // Add tab data as JSON file
  zip.file('tabs.json', JSON.stringify(tabData, null, 2));

  // Generate zip file as base64 data URL
  const content = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });

  // Create data URL
  const dataUrl = 'data:application/zip;base64,' + content;

  // Download the zip file using the data URL
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: dataUrl,
      filename: `TabZippr/${filename}`,
      saveAs: true, // Let user choose the first time to create directory
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(downloadId);
      }
    });
  });
}

/**
 * Core function: Restores tabs from a backup file
 * @param {Uint8Array} data The backup file data
 * @returns {Promise<void>}
 */
async function restoreBackup(data) {
  try {
    const zip = new JSZip();
    // Convert array back to Uint8Array
    const uint8Array = new Uint8Array(data);
    const contents = await zip.loadAsync(uint8Array);
    const tabsFile = await contents.file('tabs.json').async('string');
    const tabData = JSON.parse(tabsFile);

    // Create new window with saved tabs
    return new Promise((resolve, reject) => {
      chrome.windows.create({}, async (window) => {
        try {
          for (const tab of tabData) {
            await chrome.tabs.create({
              windowId: window.id,
              url: tab.url,
              pinned: tab.pinned
            });
          }
          // Remove the initial new tab that's created with the window
          const tabs = await chrome.tabs.query({ windowId: window.id });
          if (tabs.length > 0) {
            await chrome.tabs.remove(tabs[0].id);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

// Initialize badge on install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated - initializing badge');
  lastDuplicateCount = 0;
  await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  await chrome.action.setBadgeText({ text: '' });
  await updateDuplicateTabBadges();
});

// Direct badge test on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Testing badge directly');
  try {
    // Force a red badge with "5" to test if badges work at all
    await chrome.action.setBadgeText({ text: "5" });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    console.log('Direct badge test complete');
  } catch (error) {
    console.error('Direct badge test failed:', error);
  }
});

/**
 * Updates badge with total duplicate count
 */
async function updateDuplicateTabBadges() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    console.log('Checking duplicates across', tabs.length, 'tabs');

    const urlMap = new Map();

    // First pass: build URL map
    for (const tab of tabs) {
      try {
        if (!tab.url || tab.url === 'chrome://newtab/') continue;

        let normalizedUrl;
        const url = new URL(tab.url);

        // Handle special cases
        if (url.hostname.includes('google.com')) {
          const searchParams = new URLSearchParams(url.search);
          const query = searchParams.get('q');
          normalizedUrl = `${url.origin}${url.pathname}${query ? '?q=' + query : ''}`;
        } else {
          normalizedUrl = url.origin + url.pathname + url.search;
        }

        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl).push(tab);
      } catch (error) {
        console.debug('Skipping invalid URL:', tab.url);
      }
    }

    // Count total duplicates and log details
    let totalDuplicates = 0;
    for (const [url, tabs] of urlMap.entries()) {
      if (tabs.length > 1) {
        console.log(`Found ${tabs.length - 1} duplicates for URL: ${url}`);
        totalDuplicates += tabs.length - 1;
      }
    }

    console.log('Total duplicate tabs found:', totalDuplicates);

    // Only update badge if count has changed
    if (totalDuplicates !== lastDuplicateCount) {
      lastDuplicateCount = totalDuplicates;

      // Force badge update
      if (totalDuplicates > 0) {
        console.log('Setting badge text to:', totalDuplicates);
        try {
          await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
          await chrome.action.setBadgeText({ text: String(totalDuplicates) });
        } catch (e) {
          console.error('Failed to set badge:', e);
        }
      } else {
        console.log('Clearing badge');
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Error in updateDuplicateTabBadges:', error);
  }
}

// Handle startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up - checking duplicates');
  lastDuplicateCount = 0;
  await updateDuplicateTabBadges();
});

// Update badge when tabs change
chrome.tabs.onCreated.addListener(() => {
  console.log('Tab created - updating badge');
  updateDuplicateTabBadges();
});

chrome.tabs.onRemoved.addListener(() => {
  console.log('Tab removed - updating badge');
  updateDuplicateTabBadges();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    console.log('Tab updated - updating badge');
    updateDuplicateTabBadges();
  }
});

chrome.tabs.onActivated.addListener(() => {
  console.log('Tab activated - updating badge');
  updateDuplicateTabBadges();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    console.log('Window focus changed - updating badge');
    updateDuplicateTabBadges();
  }
});