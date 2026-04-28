import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { promises as fsp } from 'fs';
import { readFileSync, existsSync } from 'fs';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const BUTTON_SIZE = 72;

interface PersistState {
  x?: number;
  y?: number;
  visible?: boolean;
}

export class FloatingButtonManager {
  private window: BrowserWindow | null = null;
  private statePath: string;
  private dragOrigin: {
    winX: number;
    winY: number;
    cursorX: number;
    cursorY: number;
  } | null = null;

  constructor() {
    this.statePath = path.join(app.getPath('userData'), 'floating-button-state.json');
  }

  private loadState(): PersistState {
    try {
      if (!existsSync(this.statePath)) return {};
      const raw = readFileSync(this.statePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveState(patch: PersistState) {
    const next = { ...this.loadState(), ...patch };
    fsp.writeFile(this.statePath, JSON.stringify(next), 'utf-8').catch(() => {
      // 忽略写入错误，下次再试
    });
  }

  private clampToDisplay(x: number, y: number): { x: number; y: number } {
    // 找到最接近的显示器，把按钮限制在可见区内
    const displays = screen.getAllDisplays();
    const target =
      displays.find((d) => {
        const b = d.bounds;
        return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
      }) ?? screen.getPrimaryDisplay();

    const { x: dx, y: dy, width, height } = target.workArea;
    const clampedX = Math.max(dx, Math.min(x, dx + width - BUTTON_SIZE));
    const clampedY = Math.max(dy, Math.min(y, dy + height - BUTTON_SIZE));
    return { x: clampedX, y: clampedY };
  }

  private create() {
    if (this.window && !this.window.isDestroyed()) return;

    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workArea;
    const state = this.loadState();
    const fallbackX = display.workArea.x + width - BUTTON_SIZE - 24;
    const fallbackY = display.workArea.y + Math.floor(height / 2) - BUTTON_SIZE / 2;
    const { x, y } = this.clampToDisplay(
      typeof state.x === 'number' ? state.x : fallbackX,
      typeof state.y === 'number' ? state.y : fallbackY,
    );

    this.window = new BrowserWindow({
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // macOS: 在所有桌面/全屏空间都可见
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setAlwaysOnTop(true, 'floating');

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/floating-button`);
    } else {
      this.window.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
        { hash: '/floating-button' },
      );
    }

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  show() {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }
    this.window?.showInactive();
    this.saveState({ visible: true });
  }

  hide() {
    this.window?.hide();
    this.saveState({ visible: false });
  }

  toggle() {
    if (this.window && this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** 启动时根据持久化状态决定是否显示，默认显示 */
  restore() {
    const state = this.loadState();
    if (state.visible === false) return;
    this.show();
  }

  dragStart() {
    if (!this.window || this.window.isDestroyed()) return;
    const [winX, winY] = this.window.getPosition();
    const cursor = screen.getCursorScreenPoint();
    this.dragOrigin = {
      winX,
      winY,
      cursorX: cursor.x,
      cursorY: cursor.y,
    };
  }

  dragMove() {
    if (!this.window || this.window.isDestroyed() || !this.dragOrigin) return;
    const cursor = screen.getCursorScreenPoint();
    const dx = cursor.x - this.dragOrigin.cursorX;
    const dy = cursor.y - this.dragOrigin.cursorY;
    const next = this.clampToDisplay(this.dragOrigin.winX + dx, this.dragOrigin.winY + dy);
    this.window.setPosition(next.x, next.y, false);
  }

  dragEnd() {
    if (!this.window || this.window.isDestroyed()) {
      this.dragOrigin = null;
      return;
    }
    const [x, y] = this.window.getPosition();
    this.saveState({ x, y });
    this.dragOrigin = null;
  }

  isVisible(): boolean {
    return !!(this.window && !this.window.isDestroyed() && this.window.isVisible());
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}
