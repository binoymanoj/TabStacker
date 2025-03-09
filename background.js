chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with empty bookmark groups and default theme
  chrome.storage.sync.get(['bookmarkGroups', 'darkMode'], function(result) {
    let updates = {};
    if (!result.bookmarkGroups) {
      updates.bookmarkGroups = [];
    }
    if (result.darkMode === undefined) {
      // Set initial theme preference based on system preference if possible
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        updates.darkMode = true;
      } else {
        updates.darkMode = false;
      }
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates);
    }
  });
  // Create a context menu item for quick bookmarking
  chrome.contextMenus.create({
    id: "addToTabStacker",
    title: "Add to TabStacker",
    contexts: ["page", "link"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToTabStacker") {
    // Store the current page/link for the popup to access
    let bookmarkData = {
      title: tab.title,
      url: info.linkUrl || tab.url
    };
    chrome.storage.local.set({ pendingBookmark: bookmarkData });
    // Open the popup
    chrome.action.openPopup();
  }
});
