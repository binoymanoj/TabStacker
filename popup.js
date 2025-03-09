document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const createGroupBtn = document.getElementById('createGroupBtn');
  const createGroupModal = document.getElementById('createGroupModal');
  const addBookmarkModal = document.getElementById('addBookmarkModal');
  const groupNameInput = document.getElementById('groupNameInput');
  const cancelGroupBtn = document.getElementById('cancelGroupBtn');
  const saveGroupBtn = document.getElementById('saveGroupBtn');
  const groupsContainer = document.getElementById('groupsContainer');
  const currentGroupName = document.getElementById('currentGroupName');
  const bookmarkTitle = document.getElementById('bookmarkTitle');
  const bookmarkUrl = document.getElementById('bookmarkUrl');
  const currentGroupId = document.getElementById('currentGroupId');
  const cancelBookmarkBtn = document.getElementById('cancelBookmarkBtn');
  const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
  const themeSwitch = document.getElementById('themeSwitch');

  // Theme management
  function initTheme() {
    // Check for saved theme preference
    chrome.storage.sync.get(['darkMode'], function(result) {
      if (result.darkMode) {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
      } else {
        updateThemeIcon(false);
      }
    });
  }

  function updateThemeIcon(isDarkMode) {
    const icon = themeSwitch.querySelector('i');
    if (isDarkMode) {
      icon.className = 'fas fa-moon text-blue-300';
    } else {
      icon.className = 'fas fa-sun text-yellow-500';
    }
  }

  themeSwitch.addEventListener('click', function() {
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Add rotation animation
    const icon = this.querySelector('i');
    icon.style.transform = 'rotate(360deg)';

    // Reset rotation after animation completes
    setTimeout(() => {
      icon.style.transform = '';
    }, 500);

    if (isDarkMode) {
      // Switch to light mode
      document.body.classList.remove('dark-mode');
      updateThemeIcon(false);
      chrome.storage.sync.set({ darkMode: false });
    } else {
      // Switch to dark mode
      document.body.classList.add('dark-mode');
      updateThemeIcon(true);
      chrome.storage.sync.set({ darkMode: true });
    }
  });

  // Initialize theme
  initTheme();

  // Load groups immediately
  loadGroups();

  // Modal management functions
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  // Close modal if clicking outside content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this);
      }
    });
  });

  // Add event listeners
  createGroupBtn.addEventListener('click', () => {
    openModal(createGroupModal);
    setTimeout(() => groupNameInput.focus(), 100);
  });

  cancelGroupBtn.addEventListener('click', () => {
    closeModal(createGroupModal);
    groupNameInput.value = '';
  });

  saveGroupBtn.addEventListener('click', createNewGroup);

  // Add keyboard support - Enter to submit
  groupNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      createNewGroup();
    }
  });

  // Add keyboard support for bookmark modal
  bookmarkTitle.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      bookmarkUrl.focus();
    }
  });

  bookmarkUrl.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveBookmark();
    }
  });

  cancelBookmarkBtn.addEventListener('click', () => {
    closeModal(addBookmarkModal);
    resetBookmarkForm();
  });

  saveBookmarkBtn.addEventListener('click', saveBookmark);

  function resetBookmarkForm() {
    bookmarkTitle.value = '';
    bookmarkUrl.value = '';
    currentGroupId.value = '';
  }

  // Get current tab info when adding a bookmark
  function getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          resolve({ title: '', url: '' });
        }
      });
    });
  }

  // Create a new bookmark group
  function createNewGroup() {
    const groupName = groupNameInput.value.trim();
    if (!groupName) return;

    chrome.storage.sync.get(['bookmarkGroups'], function(result) {
      const groups = result.bookmarkGroups || [];
      const newGroup = {
        id: Date.now().toString(),
        name: groupName,
        bookmarks: []
      };

      groups.push(newGroup);
      chrome.storage.sync.set({ bookmarkGroups: groups }, function() {
        closeModal(createGroupModal);
        groupNameInput.value = '';
        loadGroups();
      });
    });
  }

  // Open add bookmark modal
  function openAddBookmarkModal(groupId, groupName) {
    currentGroupId.value = groupId;
    currentGroupName.textContent = groupName;

    getCurrentTab().then(tab => {
      bookmarkTitle.value = tab.title || '';
      bookmarkUrl.value = tab.url || '';
      openModal(addBookmarkModal);
      setTimeout(() => bookmarkTitle.focus(), 100);
    }).catch(error => {
      console.error('Error getting current tab:', error);
      openModal(addBookmarkModal);
      setTimeout(() => bookmarkTitle.focus(), 100);
    });
  }

  // Save bookmark to group
  function saveBookmark() {
    const title = bookmarkTitle.value.trim();
    const url = bookmarkUrl.value.trim();
    const groupId = currentGroupId.value;

    if (!title || !url || !groupId) return;

    // Ensure URL has protocol
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    chrome.storage.sync.get(['bookmarkGroups'], function(result) {
      const groups = result.bookmarkGroups || [];
      const groupIndex = groups.findIndex(g => g.id === groupId);

      if (groupIndex !== -1) {
        groups[groupIndex].bookmarks.push({
          id: Date.now().toString(),
          title: title,
          url: formattedUrl
        });

        chrome.storage.sync.set({ bookmarkGroups: groups }, function() {
          closeModal(addBookmarkModal);
          resetBookmarkForm();
          loadGroups();
        });
      } else {
        console.error('Group not found:', groupId);
        alert('Error: Group not found');
        closeModal(addBookmarkModal);
      }
    });
  }

  // Delete a bookmark
  function deleteBookmark(groupId, bookmarkId) {
    chrome.storage.sync.get(['bookmarkGroups'], function(result) {
      const groups = result.bookmarkGroups || [];
      const groupIndex = groups.findIndex(g => g.id === groupId);

      if (groupIndex !== -1) {
        groups[groupIndex].bookmarks = groups[groupIndex].bookmarks.filter(
          b => b.id !== bookmarkId
        );

        chrome.storage.sync.set({ bookmarkGroups: groups }, function() {
          loadGroups();
        });
      }
    });
  }

  // Delete a group
  function deleteGroup(groupId) {
    if (confirm('Are you sure you want to delete this group?')) {
      chrome.storage.sync.get(['bookmarkGroups'], function(result) {
        const groups = result.bookmarkGroups || [];
        const updatedGroups = groups.filter(g => g.id !== groupId);

        chrome.storage.sync.set({ bookmarkGroups: updatedGroups }, function() {
          loadGroups();
        });
      });
    }
  }

  // Open all bookmarks in a group
  function openAllBookmarks(bookmarks) {
    if (bookmarks.length === 0) {
      alert('This group has no bookmarks to open.');
      return;
    }

    bookmarks.forEach(bookmark => {
      chrome.tabs.create({ url: bookmark.url, active: false });
    });
  }

  // Load and display all bookmark groups
  function loadGroups() {
    chrome.storage.sync.get(['bookmarkGroups'], function(result) {
      const groups = result.bookmarkGroups || [];
      groupsContainer.innerHTML = '';

      if (groups.length === 0) {
        groupsContainer.innerHTML = `
          <div class="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
            <i class="fas fa-folder-open text-gray-400 text-5xl mb-4"></i>
            <p class="text-gray-600">No bookmark groups yet.</p>
            <p class="text-gray-500 text-sm mt-2">Create a new group to get started!</p>
          </div>
        `;
        return;
      }

      groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group-card bg-white rounded-lg shadow p-4';

        const headerHtml = `
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-lg font-semibold text-gray-800">${escapeHTML(group.name)}</h2>
            <div class="flex space-x-2">
              <button class="add-bookmark-btn text-blue-500 hover:text-blue-700 p-1" data-group-id="${group.id}" data-group-name="${escapeHTML(group.name)}">
                <i class="fas fa-plus"></i>
              </button>
              <button class="open-all-btn text-green-500 hover:text-green-700 p-1" data-group-id="${group.id}">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button class="delete-group-btn text-red-500 hover:text-red-700 p-1" data-group-id="${group.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;

        let bookmarksHtml = '';
        if (!group.bookmarks || group.bookmarks.length === 0) {
          bookmarksHtml = `
            <div class="text-center py-3 text-gray-500 text-sm italic">
              No bookmarks in this group
            </div>
          `;
        } else {
          bookmarksHtml = `
            <div class="space-y-2">
              ${group.bookmarks.map(bookmark => `
                <div class="bookmark-item flex justify-between items-center p-2 rounded">
                  <a href="${bookmark.url}" target="_blank" class="flex items-center text-gray-700 hover:text-blue-600 truncate" style="max-width: 280px;">
                    <i class="fas fa-link text-gray-400 mr-2"></i>
                    <span class="truncate">${escapeHTML(bookmark.title)}</span>
                  </a>
                  <button class="delete-bookmark-btn text-red-400 hover:text-red-600" data-group-id="${group.id}" data-bookmark-id="${bookmark.id}">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          `;
        }

        groupEl.innerHTML = headerHtml + bookmarksHtml;
        groupsContainer.appendChild(groupEl);
      });

      // Add event listeners to dynamically created buttons
      document.querySelectorAll('.add-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupId = btn.getAttribute('data-group-id');
          const groupName = btn.getAttribute('data-group-name');
          openAddBookmarkModal(groupId, groupName);
        });
      });

      document.querySelectorAll('.open-all-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupId = btn.getAttribute('data-group-id');
          const group = groups.find(g => g.id === groupId);
          if (group && group.bookmarks && group.bookmarks.length > 0) {
            openAllBookmarks(group.bookmarks);
          } else {
            alert('This group has no bookmarks to open.');
          }
        });
      });

      document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupId = btn.getAttribute('data-group-id');
          deleteGroup(groupId);
        });
      });

      document.querySelectorAll('.delete-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const groupId = btn.getAttribute('data-group-id');
          const bookmarkId = btn.getAttribute('data-bookmark-id');
          deleteBookmark(groupId, bookmarkId);
        });
      });
    });
  }

  // Check for pending bookmarks from context menu
  function checkPendingBookmarks() {
    chrome.storage.local.get(['pendingBookmark'], function(result) {
      if (result.pendingBookmark) {
        // We have a pending bookmark, show group selector
        chrome.storage.sync.get(['bookmarkGroups'], function(data) {
          const groups = data.bookmarkGroups || [];
          if (groups.length > 0) {
            // Show group selection dialog
            // For simplicity, just add to first group for now or show an alert
            const firstGroup = groups[0];
            currentGroupId.value = firstGroup.id;
            currentGroupName.textContent = firstGroup.name;
            bookmarkTitle.value = result.pendingBookmark.title || '';
            bookmarkUrl.value = result.pendingBookmark.url || '';
            openModal(addBookmarkModal);
          }
        });

        // Clear the pending bookmark
        chrome.storage.local.remove(['pendingBookmark']);
      }
    });
  }

  // Check for pending bookmarks on popup open
  checkPendingBookmarks();

  // Utility function to escape HTML
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
