let browserContainer;
let tabsContainer;
let newTabButton;
let addressInputElement;

const homeURL = 'https://www.bing.com';
let tabs = [];
let activeTabId = null;

function initializeTabs(addressInput) {
  browserContainer = document.getElementById('browserContainer');
  tabsContainer = document.getElementById('tabs');
  newTabButton = document.getElementById('newTabButton');
  addressInputElement = addressInput || document.getElementById('addressInput');

  if (newTabButton) {
    newTabButton.addEventListener('click', () => createTab(homeURL));
  }
}

function normalizeURL(value) {
  const trimmed = value.trim();
  if (!trimmed) return homeURL;
  try {
    if (trimmed.includes('.') || trimmed.startsWith('http')) {
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    }
    return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
  } catch {
    return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
  }
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId);
}

function createWebView(url) {
  const webview = document.createElement('webview');
  webview.className = 'browser-view';
  webview.src = url;
  webview.setAttribute('allowpopups', '');
  webview.style.display = 'none';

  webview.addEventListener('did-start-loading', () => {
    const activeTab = getActiveTab();
    if (activeTab?.webview === webview) {
      addressInputElement.classList.add('loading');
    }
  });

  webview.addEventListener('did-stop-loading', async () => {
    const activeTab = getActiveTab();
    if (!activeTab || activeTab.webview !== webview) return;
    addressInputElement.classList.remove('loading');
    activeTab.url = await webview.getURL();
    renderTabs();
  });

  webview.addEventListener('page-title-updated', (event) => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.webview === webview) {
      activeTab.title = event.title || 'New Tab';
      document.title = `${activeTab.title} — Adventure Browser`;
      renderTabs();
    }
  });

  webview.addEventListener('new-window', (event) => {
    event.preventDefault();
    if (event?.url) {
      openURLInActiveTab(event.url);
    }
  });

  webview.addEventListener('did-fail-load', (event) => {
    if (event.errorCode !== -3) {
      console.warn('Load failed:', event.errorDescription);
    }
  });

  webview.addEventListener('dom-ready', () => {
    webview.setVisualZoomLevelLimits(1, 3);
    updateNavigationState();
  });

  return webview;
}

function renderTabs() {
  tabsContainer.innerHTML = '';
  tabs.forEach((tab) => {
    const tabButton = document.createElement('button');
    tabButton.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    tabButton.type = 'button';
    tabButton.title = tab.title || tab.url;
    tabButton.textContent = tab.title || 'New Tab';

    tabButton.addEventListener('click', () => setActiveTab(tab.id));

    const closeButton = document.createElement('span');
    closeButton.className = 'tab-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });

    tabButton.appendChild(closeButton);
    tabsContainer.appendChild(tabButton);
  });
}

function setActiveTab(id) {
  activeTabId = id;
  tabs.forEach((tab) => {
    if (tab.webview) {
      tab.webview.style.display = tab.id === id ? 'flex' : 'none';
    }
  });

  const activeTab = getActiveTab();
  if (activeTab) {
    addressInputElement.value = activeTab.url;
    updateNavigationState();
    renderTabs();
  }
}

function createTab(url = homeURL) {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const webview = createWebView(url);
  const tab = { id, title: 'New Tab', url, webview };
  tabs.push(tab);
  browserContainer.appendChild(webview);
  renderTabs();
  setActiveTab(id);
  return tab;
}

function closeTab(id) {
  if (tabs.length === 1) return;
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  const [removedTab] = tabs.splice(index, 1);
  if (removedTab.webview?.parentNode) {
    removedTab.webview.remove();
  }
  if (activeTabId === id) {
    const nextTab = tabs[index] || tabs[index - 1];
    if (nextTab) setActiveTab(nextTab.id);
  } else {
    renderTabs();
  }
}

function openURLInActiveTab(url) {
  const activeTab = getActiveTab();
  if (!activeTab) return;
  activeTab.webview.loadURL(normalizeURL(url));
}

function goBack() {
  const activeTab = getActiveTab();
  if (activeTab) activeTab.webview.goBack();
}

function goForward() {
  const activeTab = getActiveTab();
  if (activeTab) activeTab.webview.goForward();
}

function reloadTab() {
  const activeTab = getActiveTab();
  if (activeTab) activeTab.webview.reload();
}

function stopTab() {
  const activeTab = getActiveTab();
  if (activeTab) activeTab.webview.stop();
}

function navigateTo(value) {
  openURLInActiveTab(value);
}

function loadHome() {
  openURLInActiveTab(homeURL);
}

export { initializeTabs, createTab, setActiveTab, closeTab, updateNavigationState, renderTabs, goBack, goForward, reloadTab, stopTab, navigateTo, loadHome };
