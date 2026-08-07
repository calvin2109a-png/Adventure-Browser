const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
let deepLinkUrl = null;

if (app.setAppUserModelId) {
  app.setAppUserModelId('com.adventurebrowser.app');
}

Menu.setApplicationMenu(null);

function handleDeepLink(url) {
  if (!url) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    const contents = mainWindow.webContents;
    if (contents && !contents.isDestroyed()) {
      contents.send('open-url', url);
      return;
    }
  }

  deepLinkUrl = url;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    show: false,
    title: 'Adventure Browser',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    deepLinkUrl = null;
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      if (deepLinkUrl) {
        handleDeepLink(deepLinkUrl);
        deepLinkUrl = null;
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', (_, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  const url = argv.find((item) => /^https?:\/\//i.test(item));
  if (url) handleDeepLink(url);
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  createWindow();

  if (process.platform === 'win32') {
    const url = process.argv.find((item) => /^https?:\/\//i.test(item));
    if (url) handleDeepLink(url);
  }

  if (app.setAsDefaultProtocolClient) {
    app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('open-external', async (_, url) => {
  if (typeof url === 'string') {
    await shell.openExternal(url);
  }
});

