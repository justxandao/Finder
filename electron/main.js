import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disableHardwareAcceleration();

// Remove native menu bar completely
Menu.setApplicationMenu(null);

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Finder",
    icon: path.join(__dirname, '../imgs_finder/icon_256.png'),
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // IPC handler so the renderer can toggle alwaysOnTop
  ipcMain.on('toggle-always-on-top', (event, value) => {
    win.setAlwaysOnTop(value);
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:1420').catch(() => {
      console.error("Não foi possível conectar ao servidor Vite (http://localhost:1420).");
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
