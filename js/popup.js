/**
 * TabZippr Core Popup Interface
 * Version: 1.0.0
 * DO NOT MODIFY CORE FUNCTIONALITY without thorough testing
 * 
 * Core Features:
 * 1. Tab counting and display
 * 2. Backup initiation
 * 3. Restore functionality
 * 4. Status message handling
 */

// CORE FUNCTIONALITY START - DO NOT MODIFY WITHOUT TESTING //

// Update tabs count in the UI
async function updateTabsCount() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabsCount = document.getElementById('tabsCount');
  tabsCount.textContent = `${tabs.length} tab${tabs.length === 1 ? '' : 's'} in current window`;
}

/**
 * Core function: Display status messages with animation
 * @param {string} message The message to display
 * @param {boolean} isError Whether this is an error message
 */
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.className = isError ? 'error' : 'success';
  
  if (status.timeoutId) {
    clearTimeout(status.timeoutId);
  }
  
  status.timeoutId = setTimeout(() => {
    status.style.opacity = '0';
    setTimeout(() => {
      status.style.display = 'none';
      status.style.opacity = '1';
    }, 300);
  }, 3000);
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await updateTabsCount();
  await updateDuplicatesSection();
  await chrome.runtime.sendMessage({ action: 'forceBadgeUpdate' });
});

// Core backup functionality
document.getElementById('backupTabs').addEventListener('click', async () => {
  const backupButton = document.getElementById('backupTabs');
  try {
    backupButton.disabled = true;
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabData = tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned
    }));

    // Create user-friendly date format: MM-DD-YYYY-HH-MM-SS
    const now = new Date();
    const dateStr = [
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      now.getFullYear(),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('-');
    
    const filename = `TabZippr-backup-${dateStr}.zip`;
    
    const response = await chrome.runtime.sendMessage({
      action: 'createBackup',
      data: { tabData, filename }
    });

    if (response && response.success) {
      showStatus(`Successfully backed up ${tabs.length} tab${tabs.length === 1 ? '' : 's'}`);
    } else {
      throw new Error(response?.error || 'Failed to create backup');
    }
  } catch (error) {
    console.error('Backup error:', error);
    showStatus('Failed to create backup: ' + error.message, true);
  } finally {
    backupButton.disabled = false;
  }
});

// Core restore functionality
document.getElementById('restoreTabs').addEventListener('click', () => {
  document.getElementById('restoreFile').click();
});

document.getElementById('restoreFile').addEventListener('change', async (event) => {
  const restoreButton = document.getElementById('restoreTabs');
  try {
    restoreButton.disabled = true;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const response = await chrome.runtime.sendMessage({
            action: 'restoreBackup',
            data: Array.from(uint8Array)
          });

          if (response && response.success) {
            showStatus('Tabs restored successfully!');
          } else {
            throw new Error(response?.error || 'Failed to restore backup');
          }
        } catch (error) {
          console.error('Restore error:', error);
          showStatus('Failed to restore backup: ' + error.message, true);
        }
      };
      reader.onerror = () => {
        showStatus('Failed to read backup file', true);
      };
      reader.readAsArrayBuffer(file);
    }
  } finally {
    restoreButton.disabled = false;
    event.target.value = ''; // Reset file input
  }
});

// CORE FUNCTIONALITY END - DO NOT MODIFY WITHOUT TESTING //

// Duplicate tab detection and cleanup

/**
 * Gets groups of duplicate tabs based on URL
 * @returns {Array<{url: string, tabs: Array<chrome.tabs.Tab>}>}
 */
async function getDuplicateGroups() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const urlMap = new Map();
  
  // Group tabs by URL (ignoring hash)
  for (const tab of tabs) {
    try {
      if (!tab.url || tab.url === 'chrome://newtab/') continue;

      let normalizedUrl;
      const url = new URL(tab.url);
      
      // Handle special cases like Google search
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

  // Filter for only duplicate groups
  return Array.from(urlMap.entries())
    .filter(([_, tabs]) => tabs.length > 1)
    .map(([url, tabs]) => ({ url, tabs }));
}

/**
 * Updates the duplicate tabs UI
 */
async function updateDuplicatesSection() {
  const duplicateGroups = await getDuplicateGroups();
  const section = document.getElementById('duplicatesSection');
  const groupsContainer = document.getElementById('duplicateGroups');
  const cleanupButton = document.getElementById('cleanupDuplicates');

  if (duplicateGroups.length > 0) {
    section.style.display = 'block';
    cleanupButton.style.display = 'block';
    
    groupsContainer.innerHTML = duplicateGroups.map(group => `
      <div class="duplicate-group">
        <div class="duplicate-title" title="${group.tabs[0].title}">${group.tabs[0].title}</div>
        <div class="duplicate-count">${group.tabs.length} duplicate tabs</div>
      </div>
    `).join('');
  } else {
    section.style.display = 'none';
    cleanupButton.style.display = 'none';
  }
  
  // Force badge update
  await chrome.runtime.sendMessage({ action: 'forceBadgeUpdate' });
}

/**
 * Cleans up duplicate tabs by keeping only the first occurrence
 */
async function cleanupDuplicates() {
  try {
    const duplicateGroups = await getDuplicateGroups();
    let removedCount = 0;

    for (const group of duplicateGroups) {
      // Keep the first tab, remove the rest
      const tabsToRemove = group.tabs.slice(1);
      await chrome.tabs.remove(tabsToRemove.map(tab => tab.id));
      removedCount += tabsToRemove.length;
    }

    // Update UI
    await updateDuplicatesSection();
    await updateTabsCount();
    showStatus(`Removed ${removedCount} duplicate tab${removedCount === 1 ? '' : 's'}`);
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    showStatus('Failed to clean up duplicates: ' + error.message, true);
  }
}

// Initialize duplicate detection
document.addEventListener('DOMContentLoaded', () => {
  updateTabsCount();
  updateDuplicatesSection();
});

// Add cleanup button handler
document.getElementById('cleanupDuplicates')?.addEventListener('click', cleanupDuplicates);