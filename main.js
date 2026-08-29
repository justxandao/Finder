const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'imgs_finder', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  mainWindow.loadFile('finder.html');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('toggle-always-on-top', (event, isAlwaysOnTop) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setAlwaysOnTop(isAlwaysOnTop);
  }
});
