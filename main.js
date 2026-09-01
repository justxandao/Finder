const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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

// Salvar arquivos CSV na pasta 'planilhas' do projeto
ipcMain.handle('save-csv-file', async (event, { filename, content }) => {
  try {
    const dir = path.join(__dirname, 'planilhas');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    // Grava com UTF-8 BOM para abrir perfeitamente no Excel
    fs.writeFileSync(filePath, '\uFEFF' + content, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('Erro ao salvar CSV:', err);
    return { success: false, error: err.message };
  }
});

// Abrir pasta de planilhas no Explorer
ipcMain.handle('open-csv-folder', async () => {
  const dir = path.join(__dirname, 'planilhas');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  shell.openPath(dir);
  return true;
});

