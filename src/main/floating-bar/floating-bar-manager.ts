import { BrowserWindow, screen } from 'electron';
import path from 'path';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export class FloatingBarManager {
  private window: BrowserWindow | null = null;
  private mainWindow: BrowserWindow;
  private visible = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  private createWindow() {
    const display = screen.getPrimaryDisplay();
    const { width } = display.workAreaSize;

    this.window = new BrowserWindow({
      width: 320,
      height: 400,
      x: width - 340,
      y: 40,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, `preload.js`),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // 加载悬浮栏页面 - 复用主窗口的渲染进程，通过 hash 路由区分
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/floating`);
    } else {
      this.window.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: '/floating' }
      );
    }

    this.window.on('closed', () => {
      this.window = null;
      this.visible = false;
    });
  }

  toggle() {
    if (this.visible && this.window) {
      this.window.hide();
      this.visible = false;
    } else {
      if (!this.window) {
        this.createWindow();
      }
      this.window?.show();
      this.visible = true;
    }
  }

  show() {
    if (!this.window) {
      this.createWindow();
    }
    this.window?.show();
    this.visible = true;
  }

  hide() {
    this.window?.hide();
    this.visible = false;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  isVisible(): boolean {
    return this.visible;
  }
}
