const browserContainer = document.getElementById('browserContainer');
const tabsContainer = document.getElementById('tabs');
const tabBarContent = document.getElementById('tabBarContent');
const tabBar = document.getElementById('tabBar');
const tabBarNewButton = document.getElementById('tabBarNewButton');
const tabContextMenu = document.getElementById('tabContextMenu');
const newTabButton = document.getElementById('newTabButton');
const toggleTabsButton = document.getElementById('toggleTabsButton');
const groupButton = document.getElementById('groupButton');
const bookmarkButton = document.getElementById('bookmarkButton');
const tabGroupsContainer = document.getElementById('tabGroups');
const tabActions = document.querySelector('.tab-actions');
const addressInput = document.getElementById('addressInput');
const backButton = document.getElementById('backButton');
const forwardButton = document.getElementById('forwardButton');
const reloadButton = document.getElementById('reloadButton');
const stopButton = document.getElementById('stopButton');
const settingsButton = document.getElementById('settingsButton');
const assistantButton = document.getElementById('assistantButton');
const openBookmarksButton = document.getElementById('openBookmarksButton');
const assistantForm = document.getElementById('assistantForm');
const assistantInput = document.getElementById('assistantInput');
const assistantMessages = document.getElementById('assistantMessages');
const focusButton = document.getElementById('focusButton');
const pageNav = document.getElementById('pageNav');
const createGroupButton = document.getElementById('createGroupButton');
const homeURL = 'about:home';
const APP_VERSION = '3.1.1';
const builtins = {
  'about:home': 'aboutHomeTemplate',
  'about:downloads': 'aboutDownloadsTemplate',
  'about:bookmarks': 'aboutBookmarksTemplate',
  'about:passwords': 'aboutPasswordsTemplate',
  'about:history': 'aboutHistoryTemplate',
  'about:recentlyclosed': 'aboutRecentlyClosedTemplate',
  'about:settings': 'aboutSettingsTemplate',
  'about:stats': 'aboutStatsTemplate',
  'about:achievements': 'aboutAchievementsTemplate',
  'about:game': 'aboutGameTemplate',
  'about:whatsnew': 'aboutWhatsNewTemplate',
  'about:assistant': 'aboutAssistantTemplate'
};

const STORAGE_KEYS = {
  main: 'adventure-browser-data',
  legacy: 'adventure-browser-state',
  passwords: 'adventure-browser-passwords'
};

let tabs = [];
let activeTabId = null;
let tabCollapsed = false;
const defaultSettings = {
  theme: 'dark',
  accent: 'classic',
  focusMode: false,
  randomBugs: false,
  bugFrequency: 30,
  gameSound: true,
  reduceMotion: false,
  sessionRestore: true,
  safeMode: false,
  searchSuggestions: true,
  startupHome: true,
  downloadPrompt: true,
  downloadCompleteToast: true,
  downloadLocation: 'Downloads',
  clearHistoryOnExit: false,
  trackingProtection: true,
  rememberPasswords: true,
  passwordManagerEnabled: true,
  passwordAudit: true,
  passwordAutoFill: true,
  bookmarksBar: true,
  bookmarkFavorite: false,
  bookmarkSync: false,
  tabGroupsEnabled: true,
  tabSearch: true,
  pinTabsDefault: false,
  hardwareAcceleration: true,
  lazyLoad: true,
  cacheSize: 192,
  contrastMode: false,
  largeText: false,
  keyboardShortcuts: true,
  debugMode: false,
  safeBrowsing: true,
  disableAnimations: false,
  tabGroupsEnabled: true,
  tabSearch: true,
  pinTabsDefault: false,
  showFavicons: true,
  showCloseButtons: true,
  showFavicons: true,
  showCloseButtons: true,
  bookmarksFolder: 'Bookmarks Bar',
  passwordStrength: true
};

const defaultStats = {
  pagesVisited: 0,
  tabsOpened: 0,
  downloads: 0,
  bookmarks: 0,
  aiChats: 0,
  bugsEaten: 0,
  gamesPlayed: 0,
  browserLaunches: 0
};

const defaultState = {
  history: [],
  bookmarks: [],
  downloads: [],
  passwords: [],
  tabGroups: [],
  recentlyClosed: [],
  sessionTabs: [],
  achievements: [],
  assistant: {
    history: [
      { role: 'system', content: 'AI assistant is ready to help. Ask about the current page, code, translation, or homework.' }
    ]
  },
  game: {
    score: 0,
    highScore: 0,
    combo: 0,
    active: false,
    sound: true,
    bugs: []
  },
  notes: '',
  stats: { ...defaultStats }
};

let settings = { ...defaultSettings };
const state = structuredClone ? structuredClone(defaultState) : JSON.parse(JSON.stringify(defaultState));

function loadStorage() {
  try {
    const combined = JSON.parse(localStorage.getItem(STORAGE_KEYS.main) || '{}');
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEYS.legacy) || '{}');
    const savedSettings = { ...(combined.settings || {}), ...(legacy.settings || {}) };
    const savedState = { ...(combined.state || {}), ...(legacy.state || {}) };
    const savedPasswords = combined.passwords || legacy.passwords || [];

    settings = { ...defaultSettings, ...savedSettings };
    Object.assign(state, defaultState, savedState);
    state.bookmarks = Array.isArray(state.bookmarks) ? state.bookmarks : [];
    state.passwords = Array.isArray(savedPasswords) ? savedPasswords : Array.isArray(state.passwords) ? state.passwords : [];
    state.tabGroups = Array.isArray(state.tabGroups) ? state.tabGroups : [];
    state.recentlyClosed = Array.isArray(state.recentlyClosed) ? state.recentlyClosed : [];
    state.history = Array.isArray(state.history) ? state.history : [];
    state.downloads = Array.isArray(state.downloads) ? state.downloads : [];
    state.achievements = Array.isArray(state.achievements) ? state.achievements : [];
    state.stats = { ...defaultStats, ...(state.stats || {}) };

    if (state.achievements?.some((key) => key.toLowerCase().includes('bestfriend')) && !state.achievements.includes('assistantFriend')) {
      state.achievements = state.achievements.filter((key) => !key.toLowerCase().includes('bestfriend'));
      state.achievements.push('assistantFriend');
    }
  } catch (err) {
    console.warn('Could not load storage', err);
    settings = { ...defaultSettings };
    Object.assign(state, JSON.parse(JSON.stringify(defaultState)));
  }
}

function saveStorage() {
  const payload = {
    settings,
    state,
    passwords: state.passwords,
    bookmarks: state.bookmarks,
    tabGroups: state.tabGroups,
    recentlyClosed: state.recentlyClosed
  };
  localStorage.setItem(STORAGE_KEYS.main, JSON.stringify(payload));
  localStorage.setItem(STORAGE_KEYS.legacy, JSON.stringify({ settings, state }));
}

function summarizeText(text, maxWords = 45) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const words = trimmed.split(' ');
  return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '…' : '');
}

async function getCurrentPageData() {
  const active = getActiveTab();
  if (!active) return null;
  if (active.webview) {
    try {
      const pageData = await active.webview.executeJavaScript(`({ title: document.title, url: window.location.href, selection: window.getSelection().toString(), body: document.body.innerText.slice(0, 1800) })`);
      return pageData;
    } catch (err) {
      return { title: active.title || '', url: active.url || '', selection: '', body: '' };
    }
  }
  return { title: active.title || '', url: active.url || '', selection: '', body: '' };
}

async function answerAssistantQuery(query) {
  const normalized = query.trim().toLowerCase();
  const pageData = await getCurrentPageData();
  if (/summary|summarize|current page/i.test(query) && pageData) {
    const body = pageData.body || '';
    const summary = body ? summarizeText(body, 55) : 'No page text available for summary.';
    return `Page summary for ${pageData.title || 'the current site'} (${pageData.url}): ${summary}`;
  }

  if (/explain|code|javascript|python|html|css|sql|react|node/i.test(query)) {
    const selection = pageData?.selection || '';
    if (selection) {
      return `Here is an explanation of the selected code or text:\n\n${selection}\n\nThis code appears to ${selection.length > 120 ? 'perform a set of actions' : 'be a short snippet'}, and you can improve it by focusing on clarity, structure, and naming. If you paste the exact snippet, I can explain it step by step.`;
    }
    return 'I can explain code for you. Select the code on the current page or ask me to review a snippet directly.';
  }

  if (/translate/i.test(query)) {
    const match = query.match(/translate\s+(.*)\s+to\s+(spanish|french|german|english|chinese|japanese)/i);
    if (match) {
      return `Translation placeholder: "${match[1]}" into ${match[2]}.`;
    }
    return 'Tell the assistant the text you want translated and the target language. For example: "Translate hello to Spanish."';
  }

  if (/image|ocr|screenshot/i.test(query)) {
    return 'The assistant can analyze images and screenshots in future updates. For now, describe the image and I can help interpret it.';
  }

  if (/search|browser q&a|page|website/i.test(query)) {
    if (pageData?.url) {
      return `I can assist with the current page at ${pageData.url}. Ask me to summarize it, explain the main idea, or help you find specific information.`;
    }
    return 'Tell me what you want to know, and the assistant will help you with explanations, summaries, or browsing guidance.';
  }

  if (/weather|time|date/i.test(query)) {
    return 'The assistant does not have live weather or time data yet, but I can help you find the answer or explain how to check it.';
  }

  return 'The assistant is ready to help with browsing, code, writing, and page summaries.';
}

function displayAssistantMessages(panel) {
  if (!panel) return;
  panel.innerHTML = state.assistant.history.map((message) => {
    const className = message.role === 'user' ? 'assistant-message user' : message.role === 'assistant' ? 'assistant-message assistant' : 'assistant-message system';
    const label = message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'System';
    return `<div class="${className}"><strong>${label}</strong><p>${message.content}</p></div>`;
  }).join('');
  panel.scrollTop = panel.scrollHeight;
}

function normalizeURL(value) {
  const query = value.trim();
  if (!query) return homeURL;
  if (query.startsWith('about:')) return query;
  if (query.match(/^https?:\/\//i)) return query;
  if (query.includes('.') && !query.includes(' ')) return `https://${query}`;
  const engine = localStorage.getItem('defaultSearch') || 'duckduckgo';
  const q = encodeURIComponent(query);
  return engine === 'google'
    ? `https://www.google.com/search?q=${q}`
    : engine === 'bing'
      ? `https://www.bing.com/search?q=${q}`
      : `https://duckduckgo.com/?q=${q}`;
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function updateNavigationState() {
  const active = getActiveTab();
  const canBack = Boolean(active?.webview?.canGoBack && active.webview.canGoBack());
  const canForward = Boolean(active?.webview?.canGoForward && active.webview.canGoForward());
  if (backButton) backButton.disabled = !canBack;
  if (forwardButton) forwardButton.disabled = !canForward;
}

function getGroupById(groupId) {
  return state.tabGroups.find((item) => item.id === groupId);
}

function syncGroupTabs() {
  state.tabGroups.forEach((group) => {
    group.tabs = tabs.filter((tab) => tab.groupId === group.id).map((tab) => tab.id);
  });
}

function attachTabToGroup(tabId, groupId, options = {}) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return;

  const previousGroup = getGroupById(tab.groupId);
  if (previousGroup) {
    previousGroup.tabs = (previousGroup.tabs || []).filter((id) => id !== tab.id);
  }

  tab.groupId = groupId || null;
  if (groupId) {
    const group = getGroupById(groupId);
    if (!group) return;
    group.tabs = group.tabs || [];
    if (!group.tabs.includes(tab.id)) group.tabs.push(tab.id);
  }

  if (!options.silent) {
    syncGroupTabs();
    saveStorage();
    renderTabs();
  }
}

function removeTabFromGroup(tabId) {
  attachTabToGroup(tabId, null);
}

function toggleGroupCollapsed(groupId) {
  const group = getGroupById(groupId);
  if (!group) return;
  group.collapsed = !Boolean(group.collapsed);
  saveStorage();
  renderTabs();
}

function setGroupName(groupId, name) {
  const group = getGroupById(groupId);
  if (!group) return;
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  group.name = trimmed;
  saveStorage();
  renderTabs();
}

function setGroupColor(groupId, color) {
  const group = getGroupById(groupId);
  if (!group) return;
  const palette = {
    Blue: '#4d93ff',
    Green: '#72c67d',
    Purple: '#9c6cff',
    Orange: '#ffae49',
    Red: '#ff6f6f',
    Gray: '#8c8c8c'
  };
  const normalized = color && color.trim();
  if (!normalized || !palette[normalized]) return;
  group.color = palette[normalized];
  saveStorage();
  renderTabs();
}

function moveTab(draggedId, targetId, placeAfter = false) {
  const draggedIndex = getTabIndex(draggedId);
  const targetIndex = getTabIndex(targetId);
  if (draggedIndex === -1 || targetIndex === -1 || draggedId === targetId) return;
  const [dragged] = tabs.splice(draggedIndex, 1);
  let insertionIndex = targetIndex;
  if (draggedIndex < targetIndex) insertionIndex -= 1;
  insertionIndex += placeAfter ? 1 : 0;
  tabs.splice(insertionIndex, 0, dragged);
  syncGroupTabs();
  persistSessionTabs();
  renderTabs();
}

function moveTabToGroup(draggedId, groupId) {
  const draggedTab = tabs.find((tab) => tab.id === draggedId);
  if (!draggedTab) return;
  attachTabToGroup(draggedId, groupId);
  if (groupId) {
    const group = getGroupById(groupId);
    if (group) {
      const groupTabIds = group.tabs || [];
      const lastIndex = tabs.findIndex((tab) => tab.id === groupTabIds[groupTabIds.length - 1]);
      if (lastIndex !== -1) {
        const draggedIndex = getTabIndex(draggedId);
        const [removed] = tabs.splice(draggedIndex, 1);
        const insertionIndex = lastIndex + (draggedIndex < lastIndex ? 0 : 1);
        tabs.splice(insertionIndex, 0, removed);
      }
    }
  }
  persistSessionTabs();
  renderTabs();
}

function renderTopTabBar() {
  if (!tabBarContent) return;
  tabBarContent.innerHTML = '';

  const active = getActiveTab();
  const groupedTabIds = new Set(tabs.filter((tab) => tab.groupId).map((tab) => tab.id));

  tabs.filter((tab) => !tab.groupId).forEach((tab) => {
    tabBarContent.appendChild(createTabBarButton(tab, false));
  });

  state.tabGroups.forEach((group) => {
    const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
    const pill = document.createElement('div');
    pill.className = `tab-group-container ${group.collapsed ? 'collapsed' : 'expanded'}`;

    const groupButtonEl = document.createElement('button');
    groupButtonEl.type = 'button';
    groupButtonEl.className = `tab-group-pill ${groupTabs.some((tab) => tab.id === active?.id) ? 'active' : ''}`;
    groupButtonEl.dataset.groupId = group.id;
    groupButtonEl.innerHTML = `<span class="group-dot" style="background:${group.color || '#72c67d'}"></span><span>${group.name}</span><small>${groupTabs.length}</small>`;
    groupButtonEl.addEventListener('click', () => toggleGroupCollapsed(group.id));
    groupButtonEl.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openGroupContextMenu(event, group.id);
    });
    groupButtonEl.addEventListener('dragover', handleTabDragOver);
    groupButtonEl.addEventListener('drop', handleGroupDrop);
    pill.appendChild(groupButtonEl);

    const childList = document.createElement('div');
    childList.className = 'group-tab-list';
    if (!group.collapsed) {
      groupTabs.forEach((tab) => {
        childList.appendChild(createTabBarButton(tab, true));
      });
    }
    pill.appendChild(childList);
    tabBarContent.appendChild(pill);
  });
}

function createTabBarButton(tab, nested) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tab-bar-button ${tab.id === activeTabId ? 'active' : ''}` + (nested ? ' nested' : '');
  button.dataset.tabId = tab.id;
  button.draggable = true;
  button.title = tab.title || tab.url;
  button.innerHTML = `
    <span class="tab-favicon">${settings.showFavicons ? getSiteFavicon(tab.url) : '•'}</span>
    <span class="tab-label">${tab.title || tab.url || 'New Tab'}</span>
    <span class="tab-close">×</span>
  `;

  button.addEventListener('click', () => setActiveTab(tab.id));
  button.addEventListener('auxclick', (event) => {
    if (event.button === 1) {
      event.preventDefault();
      closeTab(tab.id);
    }
  });
  button.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    openTabContextMenu(event, tab.id);
  });
  button.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', tab.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  button.addEventListener('dragover', handleTabDragOver);
  button.addEventListener('drop', handleTabDrop);

  const closeEl = button.querySelector('.tab-close');
  if (closeEl) {
    closeEl.addEventListener('click', (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });
  }

  return button;
}

function handleTabDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleTabDrop(event) {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData('text/plain');
  const targetTabId = event.currentTarget.dataset.tabId;
  if (!draggedId || !targetTabId) return;
  const placeAfter = event.offsetX > event.currentTarget.clientWidth / 2;
  const targetTab = tabs.find((tab) => tab.id === targetTabId);
  if (targetTab?.groupId) {
    attachTabToGroup(draggedId, targetTab.groupId);
  }
  moveTab(draggedId, targetTabId, placeAfter);
}

function handleBarDrop(event) {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData('text/plain');
  if (!draggedId) return;
  removeTabFromGroup(draggedId);
  const draggedIndex = getTabIndex(draggedId);
  if (draggedIndex === -1) return;
  const [draggedTab] = tabs.splice(draggedIndex, 1);
  tabs.push(draggedTab);
  syncGroupTabs();
  persistSessionTabs();
  renderTabs();
}

function handleGroupDrop(event) {
  event.preventDefault();
  const draggedId = event.dataTransfer.getData('text/plain');
  const groupId = event.currentTarget.dataset.groupId;
  if (!draggedId || !groupId) return;
  moveTabToGroup(draggedId, groupId);
}

function openTabContextMenu(event, tabId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab || !tabContextMenu) return;
  event.preventDefault();
  const group = tab.groupId ? getGroupById(tab.groupId) : null;
  const groupItems = state.tabGroups.map((item) => ({
    label: item.name,
    action: () => attachTabToGroup(tab.id, item.id)
  }));

  const items = [
    { label: 'New Tab', action: () => createTab(homeURL) },
    { separator: true },
    { label: group ? 'Remove from Group' : 'Add Tab to Group', action: () => {
        if (group) removeTabFromGroup(tab.id);
        else {
          const groupName = window.prompt('Enter group name', state.tabGroups[0]?.name || 'New group');
          if (groupName) assignTabToGroup(tab.id, groupName);
        }
      }
    },
  ];

  if (groupItems.length) {
    items.push({ separator: true });
    items.push({ label: 'Move to Group...' });
    groupItems.forEach((item) => items.push({ label: `   ${item.label}`, action: item.action }));
  }

  if (group) {
    items.push({ separator: true });
    items.push({ label: 'Rename Group', action: () => {
        const name = window.prompt('Rename group', group.name);
        if (name) setGroupName(group.id, name);
      }
    });
    items.push({ label: 'Change Group Color', action: () => {
        const color = window.prompt('Color name (Blue, Green, Purple, Orange, Red, Gray)', 'Blue');
        if (color) setGroupColor(group.id, color);
      }
    });
    items.push({ label: 'Close Group', action: () => closeTabGroup(group.id) });
  }

  items.push({ separator: true });
  items.push({ label: 'Close Tab', action: () => closeTab(tab.id) });
  items.push({ label: 'Duplicate Tab', action: () => duplicateTab(tab.id) });

  buildContextMenu(event.pageX, event.pageY, items);
}

function openGroupContextMenu(event, groupId) {
  const group = getGroupById(groupId);
  if (!group || !tabContextMenu) return;
  event.preventDefault();
  const items = [
    { label: 'New Tab', action: () => createTab(homeURL) },
    { separator: true },
    { label: 'Rename Group', action: () => {
        const name = window.prompt('Rename group', group.name);
        if (name) setGroupName(group.id, name);
      }
    },
    { label: 'Change Group Color', action: () => {
        const color = window.prompt('Color name (Blue, Green, Purple, Orange, Red, Gray)', 'Blue');
        if (color) setGroupColor(group.id, color);
      }
    },
    { label: 'Close Group', action: () => closeTabGroup(group.id) },
    { separator: true },
    { label: 'Ungroup Tabs', action: () => {
        tabs.filter((tab) => tab.groupId === group.id).forEach((tab) => removeTabFromGroup(tab.id));
      }
    }
  ];
  buildContextMenu(event.pageX, event.pageY, items);
}

function buildContextMenu(x, y, items) {
  if (!tabContextMenu) return;
  tabContextMenu.innerHTML = '';
  items.forEach((item) => {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'menu-separator';
      tabContextMenu.appendChild(separator);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      item.action();
      closeContextMenu();
    });
    tabContextMenu.appendChild(button);
  });

  tabContextMenu.style.left = `${Math.min(window.innerWidth - 260, x)}px`;
  tabContextMenu.style.top = `${Math.min(window.innerHeight - tabContextMenu.offsetHeight - 10, y)}px`;
  tabContextMenu.classList.add('active');
  tabContextMenu.setAttribute('aria-hidden', 'false');
}

function closeContextMenu() {
  if (!tabContextMenu) return;
  tabContextMenu.classList.remove('active');
  tabContextMenu.setAttribute('aria-hidden', 'true');
}

function renderTabs() {
  if (tabsContainer) {
    tabsContainer.innerHTML = '';
  }

  tabs.forEach((tab) => {
    const group = tab.groupId ? state.tabGroups.find((item) => item.id === tab.groupId) : null;
    const button = document.createElement('button');
    button.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
    button.dataset.tabId = tab.id;
    button.draggable = true;
    button.title = tab.title || tab.url;
    button.setAttribute('aria-label', `${tab.title || tab.url} tab${group ? ` in ${group.name}` : ''}`);

    const favicon = document.createElement('span');
    favicon.className = 'tab-favicon';
    favicon.textContent = settings.showFavicons ? getSiteFavicon(tab.url) : '•';

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.pinned ? `📌 ${tab.title || tab.url || 'New Tab'}` : (tab.title || tab.url || 'New Tab');

    button.appendChild(favicon);
    button.appendChild(label);

    if (group) {
      const groupLabel = document.createElement('span');
      groupLabel.className = 'tab-group-label';
      groupLabel.textContent = group.name;
      groupLabel.style.borderColor = group.color || 'transparent';
      groupLabel.style.color = group.color || 'inherit';
      button.appendChild(groupLabel);
    }

    if (!tabCollapsed && settings.showCloseButtons) {
      const closeButton = document.createElement('span');
      closeButton.className = 'tab-close';
      closeButton.textContent = '×';
      closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });
      button.appendChild(closeButton);
    }

    button.addEventListener('click', () => setActiveTab(tab.id));
    button.addEventListener('auxclick', (event) => {
      if (event.button === 1) {
        event.preventDefault();
        closeTab(tab.id);
      }
    });
    if (tabsContainer) {
      tabsContainer.appendChild(button);
    }
  });

  if (tabsContainer) {
    tabsContainer.setAttribute('data-collapsed', String(tabCollapsed));
  }

  renderTopTabBar();
}

function setActiveTab(id) {
  activeTabId = id;
  tabs.forEach((tab) => {
    if (tab.node) tab.node.style.display = tab.id === id ? 'flex' : 'none';
    if (tab.webview) tab.webview.style.display = tab.id === id ? 'flex' : 'none';
  });
  const active = getActiveTab();
  if (!active) return;
  addressInput.value = active.url;
  renderTabs();
  updateNavigationState();
  if (pageNav) updatePageNav(active.url);
}

function getTabIndex(id) {
  return tabs.findIndex((tab) => tab.id === id);
}

function persistSessionTabs() {
  if (!settings.sessionRestore) return;
  state.sessionTabs = tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    pinned: Boolean(tab.pinned),
    groupId: tab.groupId || null,
    favicon: getSiteFavicon(tab.url)
  }));
  saveStorage();
}

function restoreSessionTabs() {
  if (!settings.sessionRestore || !Array.isArray(state.sessionTabs) || !state.sessionTabs.length) {
    createTab(homeURL);
    return;
  }

  state.sessionTabs.forEach((snapshot) => {
    const tab = createTab(snapshot.url, { title: snapshot.title, pinned: snapshot.pinned, groupId: snapshot.groupId });
    tab.title = snapshot.title || tab.title;
  });
  if (!tabs.length) createTab(homeURL);
}

function pushRecentlyClosedTab(tab) {
  if (!tab) return;
  const snapshot = {
    id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: tab.title || tab.url || 'New Tab',
    url: tab.url || homeURL,
    favicon: getSiteFavicon(tab.url || homeURL),
    pinned: Boolean(tab.pinned),
    groupId: tab.groupId || null,
    timeClosed: Date.now()
  };
  state.recentlyClosed.unshift(snapshot);
  state.recentlyClosed = state.recentlyClosed.slice(0, 40);
  saveStorage();
}

function reopenLastClosedTab() {
  const snapshot = state.recentlyClosed.shift();
  if (!snapshot) return;
  saveStorage();
  const reopened = createTab(snapshot.url, {
    title: snapshot.title,
    pinned: snapshot.pinned,
    groupId: snapshot.groupId
  });
  reopened.title = snapshot.title || reopened.title;
  reopened.pinned = Boolean(snapshot.pinned);
  reopened.groupId = snapshot.groupId || null;
  setActiveTab(reopened.id);
}

function restoreClosedTab(snapshotId) {
  const snapshot = state.recentlyClosed.find((entry) => entry.id === snapshotId);
  if (!snapshot) return;
  state.recentlyClosed = state.recentlyClosed.filter((entry) => entry.id !== snapshotId);
  saveStorage();
  const reopened = createTab(snapshot.url, {
    title: snapshot.title,
    pinned: snapshot.pinned,
    groupId: snapshot.groupId
  });
  reopened.title = snapshot.title || reopened.title;
  reopened.pinned = Boolean(snapshot.pinned);
  reopened.groupId = snapshot.groupId || null;
  setActiveTab(reopened.id);
  renderRecentlyClosed(document.querySelector('#recentlyClosedList'));
}

function restoreAllClosedTabs() {
  const snapshots = [...state.recentlyClosed];
  state.recentlyClosed = [];
  saveStorage();
  snapshots.forEach((snapshot) => {
    const reopened = createTab(snapshot.url, {
      title: snapshot.title,
      pinned: snapshot.pinned,
      groupId: snapshot.groupId
    });
    reopened.title = snapshot.title || reopened.title;
    reopened.pinned = Boolean(snapshot.pinned);
    reopened.groupId = snapshot.groupId || null;
  });
  renderRecentlyClosed(document.querySelector('#recentlyClosedList'));
}

function clearRecentlyClosed() {
  state.recentlyClosed = [];
  saveStorage();
  renderRecentlyClosed(document.querySelector('#recentlyClosedList'));
}

function renderRecentlyClosed(container) {
  if (!container) return;
  if (!state.recentlyClosed.length) {
    container.innerHTML = '<div class="notice-item">No recently closed tabs yet.</div>';
    return;
  }
  container.innerHTML = state.recentlyClosed.map((entry) => `
    <div class="history-row">
      <div>
        <strong>${entry.title || entry.url}</strong>
        <span>${entry.url}</span>
      </div>
      <div>
        <small>${new Date(entry.timeClosed).toLocaleTimeString()}</small>
        <button data-restore-closed-id="${entry.id}">Restore</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-restore-closed-id]').forEach((button) => {
    button.addEventListener('click', () => restoreClosedTab(button.dataset.restoreClosedId));
  });
}

function updatePageNav(url) {
  if (!pageNav) return;
  pageNav.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === url);
  });
}

function createInternalNode(url) {
  const templateId = builtins[url] || builtins[homeURL];
  const template = document.getElementById(templateId);
  const node = document.createElement('div');
  node.className = 'internal-view';
  node.style.display = 'none';
  node.appendChild(template.content.cloneNode(true));
  wireInternalPage(url, node);
  processPage(node);
  return node;
}

function wireInternalPage(url, node) {
  const homeForm = node.querySelector('[data-action="home-search"]');
  const recentlyClosedList = node.querySelector('#recentlyClosedList');
  if (recentlyClosedList) renderRecentlyClosed(recentlyClosedList);

  const restoreAllButton = node.querySelector('[data-action="restore-all-closed"]');
  if (restoreAllButton) restoreAllButton.addEventListener('click', restoreAllClosedTabs);

  const clearHistoryButton = node.querySelector('[data-action="clear-closed-history"]');
  if (clearHistoryButton) clearHistoryButton.addEventListener('click', clearRecentlyClosed);
  if (homeForm) {
    homeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const q = new FormData(homeForm).get('q') || '';
      navigateTab(activeTabId, normalizeURL(q));
    });
  }

  node.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => createTab(button.dataset.open));
  });

  node.querySelectorAll('[data-action="stats"]').forEach((button) => button.addEventListener('click', refreshStats));
  node.querySelectorAll('[data-action="new-download"]').forEach((button) => button.addEventListener('click', createDownload));
  node.querySelectorAll('[data-action="clear-downloads"]').forEach((button) => { button.addEventListener('click', clearDownloads); });
  node.querySelectorAll('[data-action="add-bookmark"]').forEach((button) => button.addEventListener('click', addBookmark));
  node.querySelectorAll('[data-action="clear-history"]').forEach((button) => button.addEventListener('click', clearHistory));
  node.querySelectorAll('[data-action="toggle-sound"]').forEach((button) => button.addEventListener('click', toggleGameSound));
  node.querySelectorAll('[data-action="save-password-inline"]').forEach((button) => button.addEventListener('click', saveCurrentPagePassword));
  node.querySelectorAll('[data-action="import-passwords"]').forEach((button) => button.addEventListener('click', importPasswords));
  node.querySelectorAll('[data-action="export-passwords"]').forEach((button) => button.addEventListener('click', exportPasswords));
  node.querySelectorAll('[data-action="clear-passwords"]').forEach((button) => button.addEventListener('click', clearPasswords));
  node.querySelectorAll('[data-action="import-settings"]').forEach((button) => button.addEventListener('click', importSettings));
  node.querySelectorAll('[data-action="export-settings"]').forEach((button) => button.addEventListener('click', exportSettings));
  node.querySelectorAll('[data-action="reset-settings"]').forEach((button) => button.addEventListener('click', resetSettings));
  const downloadsSearch = node.querySelector('#downloadSearch');
  if (downloadsSearch) {
    downloadsSearch.addEventListener('input', () => {
      const downloadList = node.querySelector('#downloadList');
      renderDownloads(downloadList);
    });
  }

  const downloadSort = node.querySelector('#downloadSort');
  if (downloadSort) {
    downloadSort.addEventListener('change', () => {
      const downloadList = node.querySelector('#downloadList');
      renderDownloads(downloadList);
    });
  }

  const settingsSearch = node.querySelector('#settingsSearch');
  if (settingsSearch) {
    settingsSearch.addEventListener('input', () => filterSettingsCards(settingsSearch.value.trim()));
  }

  const bookmarkSearch = node.querySelector('#bookmarkSearch');
  const bookmarkSort = node.querySelector('#bookmarkSort');
  const bookmarkFolderFilter = node.querySelector('#bookmarkFolderFilter');
  if (bookmarkSearch) bookmarkSearch.addEventListener('input', () => renderBookmarks(node.querySelector('#bookmarkList')));
  if (bookmarkSort) bookmarkSort.addEventListener('change', () => renderBookmarks(node.querySelector('#bookmarkList')));
  if (bookmarkFolderFilter) bookmarkFolderFilter.addEventListener('change', () => renderBookmarks(node.querySelector('#bookmarkList')));

  const passwordForm = node.querySelector('#passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const site = node.querySelector('#passwordSite')?.value?.trim() || '';
      const username = node.querySelector('#passwordUsername')?.value?.trim() || '';
      const password = node.querySelector('#passwordValue')?.value?.trim() || '';
      if (!site || !username || !password) return;
      const existing = state.passwords.find((entry) => entry.site === site && entry.username === username);
      if (existing) {
        existing.password = password;
        existing.hidden = true;
      } else {
        state.passwords.unshift({
          id: `password-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          site,
          username,
          password,
          hidden: true,
          createdAt: Date.now()
        });
      }
      saveStorage();
      passwordForm.reset();
      renderPasswords(node.querySelector('#passwordList'));
    });
  }

  const passwordSearch = node.querySelector('#passwordSearch');
  if (passwordSearch) passwordSearch.addEventListener('input', () => renderPasswords(node.querySelector('#passwordList')));

  const bookmarkList = node.querySelector('#bookmarkList');
  if (bookmarkList) renderBookmarks(bookmarkList);

  const passwordList = node.querySelector('#passwordList');
  if (passwordList) renderPasswords(passwordList);

  const passwordHealth = node.querySelector('#passwordHealth');
  if (passwordHealth) renderPasswordHealth(passwordHealth);

  const historyList = node.querySelector('#historyList');
  if (historyList) renderHistory(historyList);

  const notesArea = node.querySelector('#homeNotes');
  if (notesArea) {
    notesArea.value = state.notes || '';
    notesArea.addEventListener('input', (event) => { state.notes = event.target.value; saveStorage(); });
  }

  const notesSave = node.querySelector('[data-save="notes"]');
  if (notesSave) notesSave.addEventListener('click', () => saveStorage());

  const homeHistoryList = node.querySelector('#homeHistoryList');
  if (homeHistoryList) renderHistory(homeHistoryList, 5);

  const homeBookmarksList = node.querySelector('#homeBookmarksList');
  if (homeBookmarksList) renderBookmarks(homeBookmarksList, 5);

  const homeStatsPages = node.querySelector('#homeStatsPages');
  const homeStatsTabs = node.querySelector('#homeStatsTabs');
  const homeStatsBookmarks = node.querySelector('#homeStatsBookmarks');
  const homeStatsDownloads = node.querySelector('#homeStatsDownloads');
  if (homeStatsPages) homeStatsPages.textContent = state.stats.pagesVisited;
  if (homeStatsTabs) homeStatsTabs.textContent = state.stats.tabsOpened;
  if (homeStatsBookmarks) homeStatsBookmarks.textContent = state.stats.bookmarks;
  if (homeStatsDownloads) homeStatsDownloads.textContent = state.stats.downloads;

  const achievementList = node.querySelector('#achievementList');
  if (achievementList) renderAchievements(achievementList);

  const statsPages = node.querySelector('#statsPages');
  const statsTabs = node.querySelector('#statsTabs');
  const statsDownloads = node.querySelector('#statsDownloads');
  const statsBugs = node.querySelector('#statsBugs');
  const statsAiBar = node.querySelector('#statsAiBar');
  const statsGamesBar = node.querySelector('#statsGamesBar');
  const statsBookmarksBar = node.querySelector('#statsBookmarksBar');
  if (statsPages) statsPages.textContent = state.stats.pagesVisited;
  if (statsTabs) statsTabs.textContent = state.stats.tabsOpened;
  if (statsDownloads) statsDownloads.textContent = state.stats.downloads;
  if (statsBugs) statsBugs.textContent = state.stats.bugsEaten;
  if (statsAiBar) statsAiBar.style.width = `${Math.min(100, state.stats.aiChats * 12)}%`;
  if (statsGamesBar) statsGamesBar.style.width = `${Math.min(100, state.stats.gamesPlayed * 12)}%`;
  if (statsBookmarksBar) statsBookmarksBar.style.width = `${Math.min(100, state.stats.bookmarks * 12)}%`;

  const settingsPage = node.querySelector('.settings-page');
  if (settingsPage) setupSettings(node);

  const downloadList = node.querySelector('#downloadList');
  if (downloadList) renderDownloads(downloadList);

  const internalAssistantPanel = node.querySelector('#internalAssistantPanel');
  const assistantPageForm = node.querySelector('#assistantPageForm');
  const assistantPageInput = node.querySelector('#assistantPageInput');
  if (assistantPageForm && assistantPageInput && internalAssistantPanel) {
    displayAssistantMessages(internalAssistantPanel);
    assistantPageForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleAssistantQuery(assistantPageInput.value, internalAssistantPanel, assistantPageInput);
    });
  }
}

function createTab(url = homeURL, options = {}) {
  const normalizedUrl = typeof url === 'string' && url.trim() ? url : homeURL;
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tab = {
    id,
    title: options.title || (normalizedUrl === 'about:home' ? 'Home' : normalizedUrl.replace('about:', '')),
    url: normalizedUrl,
    pinned: Boolean(options.pinned),
    groupId: options.groupId || null,
    scrollPosition: 0
  };

  if (normalizedUrl.startsWith('about:')) {
    const node = createInternalNode(normalizedUrl);
    node.style.display = 'none';
    browserContainer.appendChild(node);
    tab.node = node;
    tabs.push(tab);
    setActiveTab(id);
    state.stats.tabsOpened += 1;
    saveStorage();
    return tab;
  }

  const webview = document.createElement('webview');
  webview.className = 'browser-view';
  webview.setAttribute('allowpopups', '');
  webview.style.display = 'none';
  webview.src = normalizedUrl;
  webview.addEventListener('did-start-loading', () => { addressInput.classList.add('loading'); });
  webview.addEventListener('did-stop-loading', async () => {
    addressInput.classList.remove('loading');
    const currentUrl = await webview.getURL();
    tab.url = currentUrl;
    tab.title = await webview.getTitle() || currentUrl;
    addressInput.value = currentUrl;
    tab.stats = tab.stats || {};
    renderTabs();
    renderTabGroups();
    updateNavigationState();
  });
  webview.addEventListener('did-navigate', () => {
    renderTabs();
    renderTabGroups();
    updateNavigationState();
  });
  webview.addEventListener('did-navigate-in-page', () => {
    renderTabs();
    renderTabGroups();
    updateNavigationState();
  });
  webview.addEventListener('page-title-updated', (event) => {
    tab.title = event.title || tab.url;
    renderTabs();
    renderTabGroups();
    updateNavigationState();
  });
  webview.addEventListener('new-window', (event) => {
    event.preventDefault();
    if (event.url) createTab(event.url);
  });

  browserContainer.appendChild(webview);
  tab.webview = webview;
  tabs.push(tab);
  setActiveTab(id);
  state.stats.tabsOpened += 1;
  state.stats.pagesVisited += 1;
  state.history.unshift({ title: tab.title, url: tab.url, time: Date.now() });
  saveStorage();
  return tab;
}

function navigateTab(tabId, url) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return;
  if (url.startsWith('about:')) {
    if (tab.node) {
      browserContainer.removeChild(tab.node);
    }
    if (tab.webview) {
      browserContainer.removeChild(tab.webview);
    }
    const node = createInternalNode(url);
    browserContainer.appendChild(node);
    tab.node = node;
    tab.url = url;
    tab.title = url.replace('about:', '') || 'Home';
    setActiveTab(tabId);
    return;
  }

  if (tab.webview) {
    tab.webview.loadURL(url);
    tab.url = url;
    tab.title = url;
  } else {
    if (tab.node) browserContainer.removeChild(tab.node);
    const webview = document.createElement('webview');
    webview.className = 'browser-view';
    webview.setAttribute('allowpopups', '');
    webview.style.display = 'none';
    webview.src = url;
    browserContainer.appendChild(webview);
    tab.webview = webview;
    delete tab.node;
    tab.url = url;
    tab.title = url;
    setActiveTab(tabId);
  }
  state.stats.pagesVisited += 1;
  state.history.unshift({ title: url, url, time: Date.now() });
  saveStorage();
}

function closeTab(id) {
  const index = getTabIndex(id);
  if (index === -1 || tabs.length === 1) return;
  const [removed] = tabs.splice(index, 1);

  if (removed?.webview && removed.webview.parentNode) {
    removed.webview.parentNode.removeChild(removed.webview);
  }
  if (removed?.node && removed.node.parentNode) {
    removed.node.parentNode.removeChild(removed.node);
  }

  pushRecentlyClosedTab(removed);

  const nextTab = tabs[index] || tabs[index - 1] || tabs[0];
  if (nextTab) {
    setActiveTab(nextTab.id);
  } else {
    activeTabId = null;
  }

  persistSessionTabs();
  renderTabs();
}

function closeOtherTabs(id) {
  const currentIndex = getTabIndex(id);
  if (currentIndex === -1) return;
  const keep = tabs[currentIndex];
  const pinned = tabs.filter((tab) => tab.pinned && tab.id !== keep.id);
  const remaining = [keep, ...pinned];

  tabs.forEach((tab) => {
    if (tab.id === keep.id || tab.pinned) return;
    if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
    if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
    pushRecentlyClosedTab(tab);
  });

  tabs.length = 0;
  tabs.push(...remaining);
  activeTabId = keep.id;
  persistSessionTabs();
  renderTabs();
}

function closeTabsToRight(id) {
  const index = getTabIndex(id);
  if (index === -1) return;
  const toRemove = tabs.slice(index + 1);
  toRemove.forEach((tab) => {
    if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
    if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
    pushRecentlyClosedTab(tab);
  });
  tabs.splice(index + 1);
  persistSessionTabs();
  renderTabs();
}

function closeTabsToLeft(id) {
  const index = getTabIndex(id);
  if (index === -1) return;
  const toRemove = tabs.slice(0, index);
  toRemove.forEach((tab) => {
    if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
    if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
    pushRecentlyClosedTab(tab);
  });
  tabs.splice(0, index);
  persistSessionTabs();
  renderTabs();
}

function closeAllTabs() {
  if (!window.confirm('Close all tabs? This will keep the current page in the recently closed list.')) return;
  tabs.slice().forEach((tab) => pushRecentlyClosedTab(tab));
  tabs.forEach((tab) => {
    if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
    if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
  });
  tabs.length = 0;
  activeTabId = null;
  persistSessionTabs();
  renderTabs();
  createTab(homeURL);
}

function closeDuplicateTabs() {
  const seen = new Map();
  const remaining = [];
  tabs.forEach((tab) => {
    const key = `${tab.url}::${tab.groupId || 'none'}`;
    if (!seen.has(key)) {
      seen.set(key, tab);
      remaining.push(tab);
    } else {
      pushRecentlyClosedTab(tab);
      if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
      if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
    }
  });
  tabs.length = 0;
  tabs.push(...remaining);
  persistSessionTabs();
  renderTabs();
}

function duplicateTab(id) {
  const tab = tabs.find((item) => item.id === id);
  if (!tab) return;
  const duplicated = createTab(tab.url, {
    title: `${tab.title || 'New Tab'} Copy`,
    groupId: tab.groupId,
    pinned: Boolean(tab.pinned)
  });
  duplicated.title = `${tab.title || 'New Tab'} Copy`;
  duplicated.groupId = tab.groupId || null;
  duplicated.pinned = Boolean(tab.pinned);
  persistSessionTabs();
  setActiveTab(duplicated.id);
}

function togglePinTab(id) {
  const tab = tabs.find((item) => item.id === id);
  if (!tab) return;
  tab.pinned = !tab.pinned;
  renderTabs();
  persistSessionTabs();
}

function assignTabToGroup(tabId, groupName, groupId) {
  const tab = tabs.find((item) => item.id === tabId);
  if (!tab) return;
  const normalized = (groupName || '').trim();
  const targetGroupId = groupId || null;
  if (!normalized && !targetGroupId) return;

  let group = targetGroupId ? state.tabGroups.find((item) => item.id === targetGroupId) : state.tabGroups.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (!group && normalized) {
    const colors = ['Blue', 'Green', 'Purple', 'Orange', 'Red', 'Gray'];
    group = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: normalized,
      color: colors[state.tabGroups.length % colors.length],
      tabs: []
    };
    state.tabGroups.push(group);
  }
  if (!group) return;

  if (tab.groupId && tab.groupId !== group.id) {
    const oldGroup = state.tabGroups.find((item) => item.id === tab.groupId);
    if (oldGroup) {
      oldGroup.tabs = (oldGroup.tabs || []).filter((id) => id !== tab.id);
    }
  }

  tab.groupId = group.id;
  group.tabs = group.tabs || [];
  if (!group.tabs.includes(tab.id)) group.tabs.push(tab.id);
  saveStorage();
  renderTabGroups();
  renderTabs();
}

function closeTabGroup(groupId) {
  const groupTabs = tabs.filter((tab) => tab.groupId === groupId);
  groupTabs.forEach((tab) => {
    if (tab.webview?.parentNode) tab.webview.parentNode.removeChild(tab.webview);
    if (tab.node?.parentNode) tab.node.parentNode.removeChild(tab.node);
    pushRecentlyClosedTab(tab);
  });

  const remainingTabs = tabs.filter((tab) => tab.groupId !== groupId);
  tabs.length = 0;
  tabs.push(...remainingTabs);

  if (!tabs.some((tab) => tab.id === activeTabId)) {
    const nextTab = tabs[0];
    if (nextTab) setActiveTab(nextTab.id);
    else activeTabId = null;
  }

  state.tabGroups = state.tabGroups.filter((group) => group.id !== groupId);
  saveStorage();
  renderTabGroups();
  renderTabs();
}

function applySidebarPreferences() {
  // No sidebar preferences in horizontal-only tab UI.
  renderTabs();
}

function loadSettings() {
  const savedTheme = settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : 'dark');
  if (savedTheme === 'dark') document.body.style.background = '';
  if (savedTheme === 'light') document.body.style.background = '';
  document.body.setAttribute('data-accent', settings.accent);
  if (settings.focusMode) document.body.classList.add('focus-mode'); else document.body.classList.remove('focus-mode');
  if (settings.reduceMotion) document.documentElement.classList.add('reduce-motion'); else document.documentElement.classList.remove('reduce-motion');
  applySidebarPreferences();
}

function openAssistant() {
  const existing = tabs.find((tab) => tab.url === 'about:assistant');
  if (existing) {
    setActiveTab(existing.id);
  } else {
    createTab('about:assistant');
  }
}

function closeAssistant() {
  const existing = tabs.find((tab) => tab.url === 'about:assistant');
  if (existing) setActiveTab(existing.id);
}

async function handleAssistantQuery(query, panel = assistantMessages, input = assistantInput) {
  if (!query.trim()) return;
  state.assistant.history.push({ role: 'user', content: query.trim() });
  displayAssistantMessages(panel);
  const responseText = await answerAssistantQuery(query.trim());
  state.assistant.history.push({ role: 'assistant', content: responseText });
  displayAssistantMessages(panel);
  if (panel === assistantMessages && assistantInput) assistantInput.value = '';
  if (panel !== assistantMessages && input) input.value = '';
  state.stats.aiChats += 1;
  saveStorage();
}

function setFocusMode(value) {
  settings.focusMode = value;
  document.body.classList.toggle('focus-mode', value);
  saveStorage();
}

function applyPageReminders() {
  const active = getActiveTab();
  if (!active) return;
  updatePageNav(active.url);
}

function refreshCurrentInternal() {
  const active = getActiveTab();
  if (active?.node) {
    processPage(active.node);
  }
}

function addBookmark() {
  const active = getActiveTab();
  if (!active) return;
  const url = active.url || '';
  if (!url || url.startsWith('about:')) return;
  const existing = state.bookmarks.find((entry) => entry.url === url);
  if (existing) {
    existing.title = active.title || active.url;
    existing.time = Date.now();
    existing.favorite = Boolean(existing.favorite);
  } else {
    state.bookmarks.unshift({
      id: `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: active.title || active.url,
      url,
      time: Date.now(),
      folder: settings.bookmarksFolder || 'Bookmarks Bar',
      favorite: settings.bookmarkFavorite || false,
      favicon: getSiteFavicon(url)
    });
  }
  state.stats.bookmarks = state.bookmarks.length;
  saveStorage();
  refreshCurrentInternal();
}

function clearHistory() {
  state.history = [];
  saveStorage();
  refreshCurrentInternal();
}

function createDownload() {
  const item = {
    id: Date.now(),
    name: `Sample-file-${Math.ceil(Math.random() * 99)}.zip`,
    status: 'Downloading',
    progress: 0
  };
  state.downloads.unshift(item);
  state.stats.downloads += 1;
  saveStorage();
  refreshCurrentInternal();
  const interval = setInterval(() => {
    item.progress += 16;
    if (item.progress >= 100) {
      item.progress = 100;
      item.status = 'Complete';
      clearInterval(interval);
      saveStorage();
      refreshCurrentInternal();
    }
    saveStorage();
    refreshCurrentInternal();
  }, 280);
}

function clearDownloads() {
  state.downloads = [];
  saveStorage();
  refreshCurrentInternal();
}

function renderDownloads(container) {
  if (!container) return;
  const search = container.closest('section')?.querySelector('#downloadSearch')?.value.toLowerCase() || '';
  const sort = container.closest('section')?.querySelector('#downloadSort')?.value || 'recent';
  let items = [...state.downloads];
  if (search) items = items.filter((entry) => entry.name.toLowerCase().includes(search));
  if (sort === 'completed') items = items.filter((entry) => entry.status === 'Complete');
  if (sort === 'active') items = items.filter((entry) => entry.status !== 'Complete');
  if (!items.length) {
    container.innerHTML = '<div class="notice-item">No downloads yet.</div>';
    return;
  }
  container.innerHTML = items.map((item) => `
    <div class="download-item">
      <div>
        <strong>${item.name}</strong>
        <span>${item.status} · ${item.progress}%</span>
        <div class="meter"><span style="width:${item.progress}%"></span></div>
      </div>
      <div class="download-actions">
        <button data-id="${item.id}" data-action="cancel-download">Cancel</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('[data-action="cancel-download"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      state.downloads = state.downloads.filter((entry) => entry.id !== id);
      saveStorage();
      renderDownloads(container);
    });
  });
}

function getSiteFavicon(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname ? `🌐` : `★`;
  } catch {
    return `★`;
  }
}

function renderBookmarks(container, limit = 0) {
  if (!container) return;
  const section = container.closest('section');
  const searchText = (section?.querySelector('#bookmarkSearch')?.value || '').toLowerCase().trim();
  const sortMode = section?.querySelector('#bookmarkSort')?.value || 'recent';
  const folderFilter = section?.querySelector('#bookmarkFolderFilter')?.value || 'all';
  let items = [...state.bookmarks];

  if (searchText) {
    items = items.filter((item) => [item.title, item.url, item.folder].some((value) => String(value || '').toLowerCase().includes(searchText)));
  }

  if (folderFilter !== 'all') {
    items = items.filter((item) => (item.folder || 'Bookmarks Bar') === folderFilter);
  }

  if (sortMode === 'alpha') {
    items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortMode === 'favorite') {
    items.sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.time || 0) - (a.time || 0));
  } else {
    items.sort((a, b) => (b.time || 0) - (a.time || 0));
  }

  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) {
    container.innerHTML = '<div class="notice-item">No bookmarks added yet.</div>';
    return;
  }

  container.innerHTML = list.map((item) => `
    <div class="bookmark-row">
      <div class="bookmark-main">
        <div class="bookmark-favicon">${getSiteFavicon(item.url)}</div>
        <div>
          <strong>${item.title || item.url}</strong>
          <span>${item.url}</span>
          <small>${item.folder || 'Bookmarks Bar'}</small>
        </div>
      </div>
      <div class="bookmark-actions">
        <button data-url="${item.url}" data-action="open-bookmark">Open</button>
        <button data-id="${item.id}" data-action="favorite-bookmark">${item.favorite ? '★' : '☆'}</button>
        <button data-id="${item.id}" data-action="delete-bookmark">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-action="open-bookmark"]').forEach((button) => {
    button.addEventListener('click', () => createTab(button.dataset.url));
  });

  container.querySelectorAll('[data-action="favorite-bookmark"]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = state.bookmarks.find((entry) => entry.id === button.dataset.id);
      if (!target) return;
      target.favorite = !target.favorite;
      saveStorage();
      renderBookmarks(container);
    });
  });

  container.querySelectorAll('[data-action="delete-bookmark"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.bookmarks = state.bookmarks.filter((entry) => entry.id !== button.dataset.id);
      state.stats.bookmarks = state.bookmarks.length;
      saveStorage();
      renderBookmarks(container);
      refreshCurrentInternal();
    });
  });
}

function renderHistory(container, limit = 0) {
  if (!container) return;
  const items = limit ? state.history.slice(0, limit) : state.history;
  if (!items.length) {
    container.innerHTML = '<div class="notice-item">No browsing history yet.</div>';
    return;
  }
  container.innerHTML = items.map((entry) => `
    <div class="history-row item-row">
      <div>
        <strong>${entry.title}</strong>
        <span>${entry.url}</span>
      </div>
      <button data-url="${entry.url}" data-action="open-history">Open</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-action="open-history"]').forEach((button) => {
    button.addEventListener('click', () => createTab(button.dataset.url));
  });
}

function renderPasswordHealth(container) {
  if (!container) return;
  const passwords = state.passwords || [];
  const healthy = passwords.filter((password) => estimatePasswordStrength(password.password) >= 3).length;
  const weak = passwords.length - healthy;
  container.innerHTML = `
    <strong>Password Health</strong>
    <div class="password-strength">
      <span>${healthy}/${passwords.length || 0} protected</span>
      <div class="password-strength-bar"><span style="width:${passwords.length ? Math.max(8, (healthy / passwords.length) * 100) : 0}%"></span></div>
    </div>
    <small>${weak ? `${weak} entry needs attention.` : 'All saved passwords look healthy.'}</small>
  `;
}

function estimatePasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function renderPasswords(container) {
  if (!container) return;
  const search = container.closest('section')?.querySelector('#passwordSearch')?.value?.toLowerCase().trim() || '';
  let items = [...(state.passwords || [])];
  if (search) {
    items = items.filter((entry) => [entry.site, entry.username, entry.password].some((value) => String(value || '').toLowerCase().includes(search)));
  }

  if (!items.length) {
    container.innerHTML = '<div class="notice-item">No saved passwords yet.</div>';
    renderPasswordHealth(container.closest('section')?.querySelector('#passwordHealth'));
    return;
  }

  container.innerHTML = items.map((entry) => `
    <div class="password-card" data-id="${entry.id}">
      <div class="password-main">
        <div class="password-favicon">🔒</div>
        <div>
          <strong>${entry.site}</strong>
          <span>Username: ${entry.username}</span>
          <span class="password-value">Password: ${entry.hidden ? '••••••••' : entry.password}</span>
          <small>Strength: ${estimatePasswordStrength(entry.password)}/4</small>
        </div>
      </div>
      <div class="password-actions">
        <button data-action="toggle-password" data-id="${entry.id}">${entry.hidden ? 'Reveal' : 'Hide'}</button>
        <button data-action="copy-username" data-id="${entry.id}">Copy Username</button>
        <button data-action="copy-password" data-id="${entry.id}">Copy Password</button>
        <button data-action="edit-password" data-id="${entry.id}">Edit</button>
        <button data-action="delete-password" data-id="${entry.id}">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-action="toggle-password"]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = state.passwords.find((entry) => entry.id === button.dataset.id);
      if (!target) return;
      target.hidden = !target.hidden;
      saveStorage();
      renderPasswords(container);
    });
  });

  container.querySelectorAll('[data-action="copy-username"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = state.passwords.find((entry) => entry.id === button.dataset.id);
      if (!target) return;
      await navigator.clipboard.writeText(target.username || '');
    });
  });

  container.querySelectorAll('[data-action="copy-password"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = state.passwords.find((entry) => entry.id === button.dataset.id);
      if (!target) return;
      const confirmed = window.confirm('Copy this password to your clipboard?');
      if (confirmed) {
        await navigator.clipboard.writeText(target.password || '');
      }
    });
  });

  container.querySelectorAll('[data-action="edit-password"]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = state.passwords.find((entry) => entry.id === button.dataset.id);
      if (!target) return;
      const nextSite = window.prompt('Website or URL', target.site || '');
      const nextUsername = window.prompt('Username or email', target.username || '');
      const nextPassword = window.prompt('Password', target.password || '');
      if (nextSite && nextUsername && nextPassword) {
        target.site = nextSite.trim();
        target.username = nextUsername.trim();
        target.password = nextPassword.trim();
        target.hidden = true;
        saveStorage();
        renderPasswords(container);
        renderPasswordHealth(container.closest('section')?.querySelector('#passwordHealth'));
      }
    });
  });

  container.querySelectorAll('[data-action="delete-password"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.passwords = state.passwords.filter((entry) => entry.id !== button.dataset.id);
      saveStorage();
      renderPasswords(container);
      renderPasswordHealth(container.closest('section')?.querySelector('#passwordHealth'));
    });
  });

  renderPasswordHealth(container.closest('section')?.querySelector('#passwordHealth'));
}

function saveCurrentPagePassword() {
  const active = getActiveTab();
  if (!active) return;
  const site = active.url || '';
  const username = window.prompt('Username or email for this page', '');
  if (!username) return;
  const password = window.prompt('Password for this page', '');
  if (!password) return;
  const normalizedSite = site.startsWith('http') ? new URL(site).hostname : site;
  const existing = state.passwords.find((entry) => entry.site === normalizedSite && entry.username === username);
  if (existing) {
    existing.password = password;
    existing.hidden = true;
  } else {
    state.passwords.unshift({
      id: `password-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      site: normalizedSite,
      username,
      password,
      hidden: true,
      createdAt: Date.now()
    });
  }
  saveStorage();
  refreshCurrentInternal();
}

function importPasswords() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const values = Array.isArray(parsed) ? parsed : Array.isArray(parsed.passwords) ? parsed.passwords : [];
      state.passwords = [...values, ...state.passwords].filter((entry, index, self) => self.findIndex((item) => item.site === entry.site && item.username === entry.username) === index);
      saveStorage();
      refreshCurrentInternal();
    } catch {
      window.alert('Could not import passwords from that file.');
    }
  });
  input.click();
}

function exportPasswords() {
  const blob = new Blob([JSON.stringify(state.passwords, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'adventure-browser-passwords.json';
  link.click();
  URL.revokeObjectURL(url);
}

function clearPasswords() {
  if (!window.confirm('Remove all saved passwords?')) return;
  state.passwords = [];
  saveStorage();
  refreshCurrentInternal();
}

function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      settings = { ...defaultSettings, ...(parsed.settings || {}) };
      saveStorage();
      loadSettings();
      refreshCurrentInternal();
    } catch {
      window.alert('Could not import browser settings.');
    }
  });
  input.click();
}

function exportSettings() {
  const blob = new Blob([JSON.stringify({ settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'adventure-browser-settings.json';
  link.click();
  URL.revokeObjectURL(url);
}

function resetSettings() {
  if (!window.confirm('Reset all settings to defaults?')) return;
  settings = { ...defaultSettings };
  saveStorage();
  loadSettings();
  refreshCurrentInternal();
}

function filterSettingsCards(query) {
  const cards = document.querySelectorAll('.settings-card');
  const normalized = (query || '').toLowerCase();
  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const visible = !normalized || text.includes(normalized);
    card.style.display = visible ? 'grid' : 'none';
  });
}

function renderAchievements(container) {
  const achievementDefinitions = [
    { key: 'firstSite', title: 'First Website', description: 'Opened your first webpage.' },
    { key: 'firstDownload', title: 'First Download', description: 'Started a download.' },
    { key: 'firstBookmark', title: 'First Bookmark', description: 'Saved your first bookmark.' },
    { key: 'bugHunter', title: 'Bug Hunter', description: 'Caught your first bug.' },
    { key: 'assistantFriend', title: 'AI Friend', description: 'Used the assistant for help.' }
  ];
  container.innerHTML = achievementDefinitions.map((achievement) => {
    const earned = state.achievements.includes(achievement.key);
    return `
      <div class="achievement-card ${earned ? 'active' : ''}">
        <strong>${achievement.title}</strong>
        <span>${achievement.description}</span>
        <small>${earned ? 'Unlocked' : 'Locked'}</small>
      </div>
    `;
  }).join('');
}

function refreshStats() {
  saveStorage();
  const active = getActiveTab();
  if (active?.node) processPage(active.node);
}

function toggleGameSound() {
  state.game.sound = !state.game.sound;
  saveStorage();
  refreshCurrentInternal();
}

function initGameBoard(node) {
  const board = node.querySelector('#gameBoard');
  const scoreEl = node.querySelector('#gameScore');
  const highScoreEl = node.querySelector('#gameHighScore');
  const comboEl = node.querySelector('#gameCombo');
  const gameDuration = 22;
  let timer = null;

  function spawnBug() {
    const bug = document.createElement('div');
    const size = Math.random() * 22 + 24;
    const isGolden = Math.random() < 0.12;
    const isRainbow = Math.random() < 0.045;
    bug.className = `game-bug ${isGolden ? 'golden' : isRainbow ? 'rainbow' : ''}`;
    bug.style.width = `${size}px`;
    bug.style.height = `${size}px`;
    bug.style.left = `${Math.random() * (board.clientWidth - size)}px`;
    bug.style.top = `${Math.random() * (board.clientHeight - size)}px`;
    board.appendChild(bug);
    bug.addEventListener('mouseenter', () => {
      const points = isRainbow ? 120 : isGolden ? 40 : 12;
      state.game.score += points;
      state.game.combo += 1;
      if (state.game.combo > 1) state.game.score += state.game.combo * 2;
      if (state.game.score > state.game.highScore) state.game.highScore = state.game.score;
      state.stats.bugsEaten += 1;
      state.stats.gamesPlayed += 1;
      if (!state.achievements.includes('bugHunter')) state.achievements.push('bugHunter');
      saveStorage();
      board.removeChild(bug);
      updateGameUI();
    });
    setTimeout(() => { if (bug.parentNode) bug.remove(); }, 6500);
  }

  function updateGameUI() {
    if (scoreEl) scoreEl.textContent = state.game.score;
    if (highScoreEl) highScoreEl.textContent = state.game.highScore;
    if (comboEl) comboEl.textContent = state.game.combo;
  }

  function startGame() {
    if (state.game.active) return;
    state.game.active = true;
    state.game.score = 0;
    state.game.combo = 0;
    updateGameUI();
    timer = setInterval(spawnBug, 900);
    setTimeout(() => stopGame(), gameDuration * 1000);
  }

  function stopGame() {
    if (!state.game.active) return;
    state.game.active = false;
    clearInterval(timer);
    timer = null;
    state.game.combo = 0;
    state.stats.gamesPlayed += 1;
    saveStorage();
    updateGameUI();
  }

  node.querySelector('[data-action="start-game"]').addEventListener('click', startGame);
  node.querySelector('[data-action="stop-game"]').addEventListener('click', stopGame);
  updateGameUI();
}

function setupSettings(node) {
  const themeRadios = node.querySelectorAll('input[name="theme"]');
  const accentSelect = node.querySelector('#accentSelect');
  const focusToggle = node.querySelector('#focusModeToggle');
  const safeModeToggle = node.querySelector('#safeModeToggle');
  const searchSuggestionsToggle = node.querySelector('#searchSuggestionsToggle');
  const startupHomeToggle = node.querySelector('#startupHomeToggle');
  const sessionRestoreToggle = node.querySelector('#sessionRestoreToggle');
  const reduceMotionToggle = node.querySelector('#reduceMotionToggle');
  const downloadPromptToggle = node.querySelector('#downloadPromptToggle');
  const downloadCompleteToastToggle = node.querySelector('#downloadCompleteToastToggle');
  const downloadLocationInput = node.querySelector('#downloadLocationInput');
  const clearHistoryOnExitToggle = node.querySelector('#clearHistoryOnExitToggle');
  const trackingProtectionToggle = node.querySelector('#trackingProtectionToggle');
  const rememberPasswordsToggle = node.querySelector('#rememberPasswordsToggle');
  const passwordManagerEnabledToggle = node.querySelector('#passwordManagerEnabledToggle');
  const passwordAuditToggle = node.querySelector('#passwordAuditToggle');
  const passwordAutoFillToggle = node.querySelector('#passwordAutoFillToggle');
  const bookmarksBarToggle = node.querySelector('#bookmarksBarToggle');
  const bookmarkFavoriteToggle = node.querySelector('#bookmarkFavoriteToggle');
  const bookmarkSyncToggle = node.querySelector('#bookmarkSyncToggle');
  const sidebarModeSelect = node.querySelector('#sidebarModeSelect');
  const sidebarPeekToggle = node.querySelector('#sidebarPeekToggle');
  const sidebarAlwaysExpandedToggle = node.querySelector('#sidebarAlwaysExpandedToggle');
  const sidebarAlwaysCollapsedToggle = node.querySelector('#sidebarAlwaysCollapsedToggle');
  const tabGroupsEnabledToggle = node.querySelector('#tabGroupsEnabledToggle');
  const tabSearchToggle = node.querySelector('#tabSearchToggle');
  const pinTabsDefaultToggle = node.querySelector('#pinTabsDefaultToggle');
  const showFaviconsToggle = node.querySelector('#showFaviconsToggle');
  const showCloseButtonsToggle = node.querySelector('#showCloseButtonsToggle');
  const sidebarWidthInput = node.querySelector('#sidebarWidthInput');
  const sidebarCompactWidthInput = node.querySelector('#sidebarCompactWidthInput');
  const sidebarIconSizeInput = node.querySelector('#sidebarIconSizeInput');
  const sidebarAnimationSpeedInput = node.querySelector('#sidebarAnimationSpeedInput');
  const hardwareAccelerationToggle = node.querySelector('#hardwareAccelerationToggle');
  const lazyLoadToggle = node.querySelector('#lazyLoadToggle');
  const cacheSizeInput = node.querySelector('#cacheSizeInput');
  const contrastModeToggle = node.querySelector('#contrastModeToggle');
  const largeTextToggle = node.querySelector('#largeTextToggle');
  const keyboardShortcutsToggle = node.querySelector('#keyboardShortcutsToggle');
  const debugModeToggle = node.querySelector('#debugModeToggle');
  const safeBrowsingToggle = node.querySelector('#safeBrowsingToggle');
  const disableAnimationsToggle = node.querySelector('#disableAnimationsToggle');
  const saveButton = node.querySelector('[data-action="save-settings"]');

  themeRadios.forEach((radio) => { radio.checked = radio.value === settings.theme; });
  accentSelect.value = settings.accent;
  focusToggle.checked = settings.focusMode;
  safeModeToggle.checked = settings.safeMode;
  searchSuggestionsToggle.checked = settings.searchSuggestions;
  startupHomeToggle.checked = settings.startupHome;
  sessionRestoreToggle.checked = settings.sessionRestore;
  reduceMotionToggle.checked = settings.reduceMotion;
  downloadPromptToggle.checked = settings.downloadPrompt;
  downloadCompleteToastToggle.checked = settings.downloadCompleteToast;
  downloadLocationInput.value = settings.downloadLocation;
  clearHistoryOnExitToggle.checked = settings.clearHistoryOnExit;
  trackingProtectionToggle.checked = settings.trackingProtection;
  rememberPasswordsToggle.checked = settings.rememberPasswords;
  passwordManagerEnabledToggle.checked = settings.passwordManagerEnabled;
  passwordAuditToggle.checked = settings.passwordAudit;
  passwordAutoFillToggle.checked = settings.passwordAutoFill;
  bookmarksBarToggle.checked = settings.bookmarksBar;
  bookmarkFavoriteToggle.checked = settings.bookmarkFavorite;
  bookmarkSyncToggle.checked = settings.bookmarkSync;
  tabGroupsEnabledToggle.checked = settings.tabGroupsEnabled;
  tabSearchToggle.checked = settings.tabSearch;
  pinTabsDefaultToggle.checked = settings.pinTabsDefault;
  showFaviconsToggle.checked = settings.showFavicons;
  showCloseButtonsToggle.checked = settings.showCloseButtons;
  hardwareAccelerationToggle.checked = settings.hardwareAcceleration;
  lazyLoadToggle.checked = settings.lazyLoad;
  cacheSizeInput.value = settings.cacheSize;
  contrastModeToggle.checked = settings.contrastMode;
  largeTextToggle.checked = settings.largeText;
  keyboardShortcutsToggle.checked = settings.keyboardShortcuts;
  debugModeToggle.checked = settings.debugMode;
  safeBrowsingToggle.checked = settings.safeBrowsing;
  disableAnimationsToggle.checked = settings.disableAnimations;

  saveButton.addEventListener('click', () => {
    const selectedTheme = [...themeRadios].find((radio) => radio.checked)?.value || 'dark';
    settings.theme = selectedTheme;
    settings.accent = accentSelect.value;
    settings.focusMode = focusToggle.checked;
    settings.safeMode = safeModeToggle.checked;
    settings.searchSuggestions = searchSuggestionsToggle.checked;
    settings.startupHome = startupHomeToggle.checked;
    settings.sessionRestore = sessionRestoreToggle.checked;
    settings.reduceMotion = reduceMotionToggle.checked;
    settings.downloadPrompt = downloadPromptToggle.checked;
    settings.downloadCompleteToast = downloadCompleteToastToggle.checked;
    settings.downloadLocation = downloadLocationInput.value.trim() || 'Downloads';
    settings.clearHistoryOnExit = clearHistoryOnExitToggle.checked;
    settings.trackingProtection = trackingProtectionToggle.checked;
    settings.rememberPasswords = rememberPasswordsToggle.checked;
    settings.passwordManagerEnabled = passwordManagerEnabledToggle.checked;
    settings.passwordAudit = passwordAuditToggle.checked;
    settings.passwordAutoFill = passwordAutoFillToggle.checked;
    settings.bookmarksBar = bookmarksBarToggle.checked;
    settings.bookmarkFavorite = bookmarkFavoriteToggle.checked;
    settings.bookmarkSync = bookmarkSyncToggle.checked;
    settings.tabGroupsEnabled = tabGroupsEnabledToggle.checked;
    settings.tabSearch = tabSearchToggle.checked;
    settings.pinTabsDefault = pinTabsDefaultToggle.checked;
    settings.showFavicons = showFaviconsToggle.checked;
    settings.showCloseButtons = showCloseButtonsToggle.checked;
    settings.hardwareAcceleration = hardwareAccelerationToggle.checked;
    settings.lazyLoad = lazyLoadToggle.checked;
    settings.cacheSize = Number(cacheSizeInput.value) || 192;
    settings.contrastMode = contrastModeToggle.checked;
    settings.largeText = largeTextToggle.checked;
    settings.keyboardShortcuts = keyboardShortcutsToggle.checked;
    settings.debugMode = debugModeToggle.checked;
    settings.safeBrowsing = safeBrowsingToggle.checked;
    settings.disableAnimations = disableAnimationsToggle.checked;

    loadSettings();
    saveStorage();
    refreshCurrentInternal();
  });

  node.querySelectorAll('.settings-category').forEach((button) => {
    button.addEventListener('click', () => {
      node.querySelectorAll('.settings-category').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const target = button.dataset.settingsCategory;
      node.querySelectorAll('.settings-card').forEach((card) => {
        card.style.display = target === card.dataset.settingsGroup || target === 'general' ? 'grid' : 'none';
      });
    });
  });
}

function processPage(node) {
  if (!node) return;

  const downloadList = node.querySelector('#downloadList');
  if (downloadList) renderDownloads(downloadList);

  const bookmarkList = node.querySelector('#bookmarkList');
  if (bookmarkList) renderBookmarks(bookmarkList);

  const historyList = node.querySelector('#historyList');
  if (historyList) renderHistory(historyList);

  const notesArea = node.querySelector('#homeNotes');
  if (notesArea) {
    notesArea.value = state.notes || '';
  }

  const homeHistoryList = node.querySelector('#homeHistoryList');
  if (homeHistoryList) renderHistory(homeHistoryList, 5);

  const homeBookmarksList = node.querySelector('#homeBookmarksList');
  if (homeBookmarksList) renderBookmarks(homeBookmarksList, 5);

  const homeStatsPages = node.querySelector('#homeStatsPages');
  const homeStatsTabs = node.querySelector('#homeStatsTabs');
  const homeStatsBookmarks = node.querySelector('#homeStatsBookmarks');
  const homeStatsDownloads = node.querySelector('#homeStatsDownloads');
  if (homeStatsPages) homeStatsPages.textContent = state.stats.pagesVisited;
  if (homeStatsTabs) homeStatsTabs.textContent = state.stats.tabsOpened;
  if (homeStatsBookmarks) homeStatsBookmarks.textContent = state.stats.bookmarks;
  if (homeStatsDownloads) homeStatsDownloads.textContent = state.stats.downloads;

  const achievementList = node.querySelector('#achievementList');
  if (achievementList) renderAchievements(achievementList);

  const statsPages = node.querySelector('#statsPages');
  const statsTabs = node.querySelector('#statsTabs');
  const statsDownloads = node.querySelector('#statsDownloads');
  const statsBugs = node.querySelector('#statsBugs');
  const statsAiBar = node.querySelector('#statsAiBar');
  const statsGamesBar = node.querySelector('#statsGamesBar');
  const statsBookmarksBar = node.querySelector('#statsBookmarksBar');
  if (statsPages) statsPages.textContent = state.stats.pagesVisited;
  if (statsTabs) statsTabs.textContent = state.stats.tabsOpened;
  if (statsDownloads) statsDownloads.textContent = state.stats.downloads;
  if (statsBugs) statsBugs.textContent = state.stats.bugsEaten;
  if (statsAiBar) statsAiBar.style.width = `${Math.min(100, state.stats.aiChats * 12)}%`;
  if (statsGamesBar) statsGamesBar.style.width = `${Math.min(100, state.stats.gamesPlayed * 12)}%`;
  if (statsBookmarksBar) statsBookmarksBar.style.width = `${Math.min(100, state.stats.bookmarks * 12)}%`;

  const internalAssistantPanel = node.querySelector('#internalAssistantPanel');
  const assistantPageForm = node.querySelector('#assistantPageForm');
  const assistantPageInput = node.querySelector('#assistantPageInput');
  if (assistantPageForm && assistantPageInput && internalAssistantPanel) {
    displayAssistantMessages(internalAssistantPanel);
  }

  if (node.querySelector('#gameBoard')) {
    initGameBoard(node);
  }
}

function createInitialTabs() {
  if (!state.tabGroups.length) {
    state.tabGroups = [];
  }
  renderTabGroups();
  if (settings.sessionRestore && Array.isArray(state.sessionTabs) && state.sessionTabs.length) {
    restoreSessionTabs();
  } else {
    createTab(homeURL);
  }
}

function renderTabGroups() {
  if (!tabGroupsContainer) return;
  const groups = state.tabGroups || [];
  const activeTab = getActiveTab();
  const activeGroupId = activeTab?.groupId || null;

  if (!groups.length) {
    tabGroupsContainer.innerHTML = `
      <div class="notice-item">No tab groups yet.</div>
      <button class="tab-group-chip create-group" data-action="create-group">＋ Create a group</button>
    `;
  } else {
    tabGroupsContainer.innerHTML = groups.map((group) => {
      const groupTabs = tabs.filter((tab) => tab.groupId === group.id);
      const expanded = activeGroupId === group.id;
      const children = groupTabs.length ? groupTabs.map((tab) => `
        <button class="group-tab-item ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
          <span class="tab-favicon">${getSiteFavicon(tab.url)}</span>
          <span class="tab-label">${tab.title || tab.url}</span>
        </button>
      `).join('') : '<div class="notice-item">No tabs in this group yet.</div>';
      return `
        <div class="group-section ${expanded ? 'expanded' : ''}">
          <button class="tab-group-chip" data-group-id="${group.id}" title="Toggle ${group.name}">
            <span class="dot" style="background:${group.color || '#7dd89e'}"></span>
            <span>${group.name}</span>
            <small>${groupTabs.length}</small>
          </button>
          <div class="group-tab-list">${children}</div>
        </div>
      `;
    }).join('') + '<button class="tab-group-chip create-group" data-action="create-group">＋ New group</button>';
  }

  tabGroupsContainer.querySelectorAll('[data-group-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const groupId = button.dataset.groupId;
      const group = state.tabGroups.find((item) => item.id === groupId);
      if (!group) return;
      const current = getActiveTab();
      if (current && !current.groupId) {
        assignTabToGroup(current.id, undefined, groupId);
      }
      const section = button.closest('.group-section');
      if (section) {
        section.classList.toggle('expanded');
      }
    });
  });

  tabGroupsContainer.querySelectorAll('.group-tab-item').forEach((button) => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tabId;
      if (tabId) setActiveTab(tabId);
    });
  });

  tabGroupsContainer.querySelectorAll('[data-action="create-group"]').forEach((button) => {
    button.addEventListener('click', () => createTabGroup());
  });
}

function createTabGroup() {
  const name = window.prompt('Name your tab group', `Group ${state.tabGroups.length + 1}`);
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const colors = ['Blue', 'Green', 'Purple', 'Orange', 'Red', 'Gray'];
  const group = { id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: trimmed, color: colors[state.tabGroups.length % colors.length], tabs: [] };
  state.tabGroups.push(group);
  saveStorage();
  const current = getActiveTab();
  if (current) {
    assignTabToGroup(current.id, undefined, group.id);
  } else {
    renderTabGroups();
  }
}

function initializeListeners() {
  const navigateActiveTab = (handler) => {
    const active = getActiveTab();
    if (!active) return;

    if (active.webview) {
      handler(active.webview);
      return;
    }

    if (active.node) {
      updateNavigationState();
    }
  };

  backButton?.addEventListener('click', () => {
    navigateActiveTab((webview) => webview.goBack());
  });
  forwardButton?.addEventListener('click', () => {
    navigateActiveTab((webview) => webview.goForward());
  });
  reloadButton?.addEventListener('click', () => {
    navigateActiveTab((webview) => webview.reload());
  });
  stopButton?.addEventListener('click', () => {
    navigateActiveTab((webview) => webview.stop());
  });
  settingsButton?.addEventListener('click', () => createTab('about:settings'));
  bookmarkButton?.addEventListener('click', () => createTab('about:bookmarks'));
  openBookmarksButton?.addEventListener('click', () => createTab('about:bookmarks'));
  groupButton?.addEventListener('click', () => createTab(homeURL));
  createGroupButton?.addEventListener('click', () => createTabGroup());
  // Removed obsolete toggle and navPane sidebar hover behavior.

  assistantButton?.addEventListener('click', openAssistant);
  focusButton.addEventListener('click', () => setFocusMode(!settings.focusMode));
  if (assistantForm) {
    assistantForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (assistantInput) handleAssistantQuery(assistantInput.value);
    });
  }

  if (pageNav) {
    pageNav.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-target]');
      if (!button) return;
      createTab(button.dataset.target);
    });
  }
  document.getElementById('addressForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const target = normalizeURL(addressInput.value);
    const active = getActiveTab();
    if (active) navigateTab(active.id, target);
  });

  if (tabBarNewButton) {
    tabBarNewButton.addEventListener('click', () => createTab(homeURL));
  }
  if (tabBar) {
    tabBar.addEventListener('dragover', handleTabDragOver);
    tabBar.addEventListener('drop', handleBarDrop);
  }

  document.addEventListener('mousedown', (event) => {
    if (!tabContextMenu) return;
    if (!tabContextMenu.contains(event.target)) {
      closeContextMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const alt = event.altKey || event.option;
    const key = event.key.toLowerCase();
    if (!settings.keyboardShortcuts) return;

    if (mod && key === 't') {
      event.preventDefault();
      if (event.shiftKey) {
        reopenLastClosedTab();
      } else {
        createTab(homeURL);
      }
      return;
    }

    if (mod && key === 'w') {
      event.preventDefault();
      if (activeTabId) closeTab(activeTabId);
      return;
    }

    if (mod && key === 'l') {
      event.preventDefault();
      addressInput.focus();
      addressInput.select();
      return;
    }

    if (mod && key === 'tab') {
      event.preventDefault();
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      const next = event.shiftKey ? tabs[(currentIndex - 1 + tabs.length) % tabs.length] : tabs[(currentIndex + 1) % tabs.length];
      if (next) setActiveTab(next.id);
      return;
    }

    if (alt && key === 'arrowleft') {
      event.preventDefault();
      const active = getActiveTab();
      if (active?.webview) active.webview.goBack();
      return;
    }

    if (alt && key === 'arrowright') {
      event.preventDefault();
      const active = getActiveTab();
      if (active?.webview) active.webview.goForward();
      return;
    }

    if (mod && event.shiftKey && key === 'v') {
      event.preventDefault();
      settings.sidebarCollapsed = !settings.sidebarCollapsed;
      applySidebarPreferences();
      saveStorage();
      return;
    }
    if (mod && event.shiftKey && key === 'arrowleft') {
      event.preventDefault();
      settings.sidebarCollapsed = true;
      applySidebarPreferences();
      saveStorage();
      return;
    }
    if (mod && event.shiftKey && key === 'arrowright') {
      event.preventDefault();
      settings.sidebarCollapsed = false;
      applySidebarPreferences();
      saveStorage();
      return;
    }
  });
}

function init() {
  loadStorage();
  loadSettings();
  displayAssistantMessages(assistantMessages);

  if (window.electronAPI?.onOpenUrl) {
    window.electronAPI.onOpenUrl((url) => {
      if (typeof url === 'string' && url.startsWith('http')) {
        createTab(url);
      }
    });
  }

  initializeListeners();
  createInitialTabs();
}

window.addEventListener('DOMContentLoaded', init);
