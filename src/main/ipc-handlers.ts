import { ipcMain, BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import { IPC_CHANNELS } from '../shared/types';
import type { CreateTerminalOptions } from '../shared/types';
import type { PtyManager } from './terminal/pty-manager';
import type { AiStateDetector } from './detection/ai-state-detector';
import type { NotificationManager } from './notification/notification-manager';
import type { TrayManager } from './tray/tray-manager';
import type { FloatingBarManager } from './floating-bar/floating-bar-manager';
import type { FloatingButtonManager } from './floating-button/floating-button-manager';
import type { SessionLogger } from './database/session-logger';
import type { PanelManager } from './panel/panel-manager';

interface Services {
  ptyManager: PtyManager;
  aiStateDetector: AiStateDetector;
  notificationManager: NotificationManager;
  trayManager: TrayManager;
  floatingBarManager: FloatingBarManager;
  floatingButtonManager: FloatingButtonManager;
  sessionLogger: SessionLogger;
  panelManager: PanelManager;
  getMainWindow: () => BrowserWindow | null;
}

export function registerIpcHandlers(services: Services) {
  const {
    ptyManager,
    sessionLogger,
    getMainWindow,
    floatingBarManager,
    floatingButtonManager,
    panelManager,
  } = services;

  // 创建终端
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, async (_event, options: CreateTerminalOptions) => {
    try {
      console.log('[Main] terminal:create 收到请求', options);
      const id = options.id || randomUUID().slice(0, 8);
      const session = ptyManager.create(id, options);
      sessionLogger.startSession(id, session.label);
      const result = {
        id,
        label: session.label,
        pid: session.pid,
        order: ptyManager.getOrder(),
      };
      console.log('[Main] terminal:create 成功', result);
      return result;
    } catch (err) {
      console.error('[Main] terminal:create 失败', err);
      throw err;
    }
  });

  // 终端输入
  ipcMain.on(IPC_CHANNELS.TERMINAL_INPUT, (_event, id: string, data: string) => {
    ptyManager.write(id, data);
    sessionLogger.logOutput(id, data, 'stdin');
  });

  // 终端尺寸调整
  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows);
  });

  // 销毁终端
  ipcMain.handle(IPC_CHANNELS.TERMINAL_DESTROY, async (_event, id: string) => {
    ptyManager.destroy(id);
    sessionLogger.endSession(id);
    return true;
  });

  // 列出所有终端
  ipcMain.handle(IPC_CHANNELS.TERMINAL_LIST, async () => {
    return ptyManager.getAllSessions().map((s) => ({
      id: s.id,
      label: s.label,
      pid: s.pid,
    }));
  });

  // 历史搜索
  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, async (_event, keyword: string) => {
    return sessionLogger.searchOutput(keyword);
  });

  // 获取时间线
  ipcMain.handle(IPC_CHANNELS.HISTORY_TIMELINE, async (_event, sessionId: string, limit?: number, offset?: number) => {
    return sessionLogger.getTimeline(sessionId, limit, offset);
  });

  // 导出历史
  ipcMain.handle(IPC_CHANNELS.HISTORY_EXPORT, async (_event, sessionId: string) => {
    return sessionLogger.exportSession(sessionId);
  });

  // 悬浮栏切换
  ipcMain.on(IPC_CHANNELS.FLOATING_TOGGLE, () => {
    floatingBarManager.toggle();
  });

  // 悬浮栏点击 - 跳转到终端
  ipcMain.on(IPC_CHANNELS.FLOATING_CLICK, (_event, id: string) => {
    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
      win.webContents.send('terminal:focus', id);
    }
  });

  // 控制面板切换
  ipcMain.on(IPC_CHANNELS.PANEL_TOGGLE, () => {
    panelManager.toggle();
  });

  // 悬浮按钮：显隐
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_TOGGLE, () => {
    floatingButtonManager.toggle();
  });
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_HIDE, () => {
    floatingButtonManager.hide();
  });

  // 悬浮按钮：点击 → 切换控制面板
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_CLICK, () => {
    panelManager.toggle();
  });

  // 悬浮按钮：拖拽
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_DRAG_START, () => {
    floatingButtonManager.dragStart();
  });
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_DRAG_MOVE, () => {
    floatingButtonManager.dragMove();
  });
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_DRAG_END, () => {
    floatingButtonManager.dragEnd();
  });
  ipcMain.on(IPC_CHANNELS.FLOATING_BUTTON_EXPAND, (_event, expanded: boolean) => {
    floatingButtonManager.setExpanded(!!expanded);
  });

  // 设置
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    // 简化版本 - 直接返回默认设置
    const { DEFAULT_SETTINGS } = await import('../shared/types');
    return DEFAULT_SETTINGS;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, _key: string, _value: unknown) => {
    // TODO: 使用 electron-store 持久化
    return true;
  });
}
