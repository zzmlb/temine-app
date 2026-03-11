import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import type { AiState } from '../../shared/types';

const STATE_COLORS: Record<AiState, string> = {
  idle: '#888888',
  running: '#4CAF50',
  waiting_confirm: '#FF5722',
  error: '#F44336',
  completed: '#2196F3',
};

function createTrayIcon(color: string): Electron.NativeImage {
  // 创建 16x16 的彩色圆点图标
  const size = 16;
  const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" />
  </svg>`;
  return nativeImage.createFromBuffer(Buffer.from(canvas));
}

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private sessionStates = new Map<string, AiState>();

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  private createTray() {
    const icon = createTrayIcon(STATE_COLORS.idle);
    this.tray = new Tray(icon);
    this.tray.setToolTip('Temine - AI 编程终端');
    this.updateMenu();
  }

  private updateMenu() {
    if (!this.tray) return;

    const menuItems: Electron.MenuItemConstructorOptions[] = [
      {
        label: '显示主窗口',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      { type: 'separator' },
    ];

    // 添加各终端状态
    for (const [id, state] of this.sessionStates) {
      const stateLabel = {
        idle: '空闲',
        running: '运行中',
        waiting_confirm: '等待确认',
        error: '错误',
        completed: '已完成',
      }[state];

      menuItems.push({
        label: `终端 ${id.slice(0, 6)} - ${stateLabel}`,
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send('terminal:focus', id);
        },
      });
    }

    menuItems.push(
      { type: 'separator' },
      {
        label: '退出 Temine',
        click: () => {
          const { app } = require('electron');
          app.quit();
        },
      }
    );

    this.tray.setContextMenu(Menu.buildFromTemplate(menuItems));
  }

  updateState(sessionId: string, state: AiState) {
    this.sessionStates.set(sessionId, state);
    this.updateMenu();

    // 使用最高优先级状态更新图标
    const priorityOrder: AiState[] = ['waiting_confirm', 'error', 'running', 'completed', 'idle'];
    let highestState: AiState = 'idle';
    for (const pState of priorityOrder) {
      for (const [, s] of this.sessionStates) {
        if (s === pState) {
          highestState = pState;
          break;
        }
      }
      if (highestState !== 'idle') break;
    }

    const icon = createTrayIcon(STATE_COLORS[highestState]);
    this.tray?.setImage(icon);
  }

  removeSession(sessionId: string) {
    this.sessionStates.delete(sessionId);
    this.updateMenu();
  }
}
