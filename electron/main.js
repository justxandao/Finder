import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Finder",
    alwaysOnTop: true, // Configurado como topo flutuante conforme pedido do usuário
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Em modo de desenvolvimento, o Electron tenta carregar o servidor do Vite
  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:1420').catch(() => {
        // Fallback em caso de erro de conexão com Vite
        console.error("Não foi possível conectar ao servidor de desenvolvimento do Vite (http://localhost:1420). Certifique-se que o vite está rodando.");
    });
  } else {
    // Em produção, ele carrega o arquivo index.html compilado na pasta dist
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
