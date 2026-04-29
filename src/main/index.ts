import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { PtyManager } from './terminal/pty-manager';
import { AiStateDetector } from './detection/ai-state-detector';
import { NotificationManager } from './notification/notification-manager';
import { TrayManager } from './tray/tray-manager';
import { FloatingBarManager } from './floating-bar/floating-bar-manager';
import { FloatingButtonManager } from './floating-button/floating-button-manager';
import { SessionLogger } from './database/session-logger';
import { PanelManager } from './panel/panel-manager';

// Vite 注入的变量
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let ptyManager: PtyManager;
let aiStateDetector: AiStateDetector;
let notificationManager: NotificationManager;
let trayManager: TrayManager;
let floatingBarManager: FloatingBarManager;
let floatingButtonManager: FloatingButtonManager;
let sessionLogger: SessionLogger;
let panelManager: PanelManager;

function createMainWindow(autoShow: boolean = false) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Temine',
    backgroundColor: '#1a1b26',
    show: autoShow,
    webPreferences: {
      preload: path.join(__dirname, `preload.js`),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // 关闭时只是隐藏，不销毁（保留 PTY 状态等后台逻辑）
  mainWindow.on('close', (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow(true);
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  // 初始化核心服务
  ptyManager = new PtyManager();
  aiStateDetector = new AiStateDetector();
  notificationManager = new NotificationManager();
  sessionLogger = new SessionLogger();

  const win = createMainWindow();

  floatingButtonManager = new FloatingButtonManager();
  trayManager = new TrayManager(win, floatingButtonManager);
  floatingBarManager = new FloatingBarManager(win);
  panelManager = new PanelManager();

  // 默认显示悬浮按钮（除非用户上次手动隐藏）
  floatingButtonManager.restore();

  // 启动时自动打开控制面板（这是用户主要看到的界面）
  panelManager.toggle().catch(() => {
    // 启动失败不影响其他模块
  });

  // 注册 IPC 处理器
  registerIpcHandlers({
    ptyManager,
    aiStateDetector,
    notificationManager,
    trayManager,
    floatingBarManager,
    floatingButtonManager,
    sessionLogger,
    panelManager,
    getMainWindow: () => mainWindow,
  });

  // 连接 PTY 输出到 AI 检测器和记录器
  ptyManager.on('output', (id: string, data: string) => {
    // 推送到渲染进程
    mainWindow?.webContents.send('terminal:output', id, data);
    // 推送到悬浮窗
    floatingBarManager.getWindow()?.webContents.send('terminal:output', id, data);

    // AI 状态检测
    aiStateDetector.feed(id, data);

    // 记录到数据库
    sessionLogger.logOutput(id, data, 'stdout');
  });

  ptyManager.on('exit', (id: string, code: number) => {
    mainWindow?.webContents.send('terminal:exit', id, code);
    sessionLogger.endSession(id);
  });

  // AI 状态变化处理
  aiStateDetector.on('stateChange', (id: string, _oldState: string, newState: string) => {
    mainWindow?.webContents.send('terminal:aiState', id, newState);
    floatingBarManager.getWindow()?.webContents.send('terminal:aiState', id, newState);

    // 系统通知
    if (newState === 'waiting_confirm') {
      const session = ptyManager.getSession(id);
      notificationManager.notify({
        title: 'Temine - 需要确认',
        body: `终端 "${session?.label || id}" 等待你的确认`,
        sessionId: id,
      });
    } else if (newState === 'error') {
      const session = ptyManager.getSession(id);
      notificationManager.notify({
        title: 'Temine - 错误',
        body: `终端 "${session?.label || id}" 遇到错误`,
        sessionId: id,
      });
    }

    // 更新托盘图标
    trayManager.updateState(id, newState as any);

    // 记录状态事件
    sessionLogger.logStateEvent(id, newState as any, 1.0);
  });

  // 注册应用菜单（含快捷键）
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Temine',
      submenu: [
        { role: 'about', label: '关于 Temine' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '终端',
      submenu: [
        {
          label: '新建终端',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('shortcut:newTerminal'),
        },
        {
          label: '关闭终端',
          accelerator: 'CmdOrCtrl+W',
          click: () => mainWindow?.webContents.send('shortcut:closeTerminal'),
        },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i) => ({
          label: `切换到终端 ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}` as string,
          click: () => mainWindow?.webContents.send('shortcut:switchTerminal', i),
        })),
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '显示终端管理器',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => showMainWindow(),
        },
        {
          label: '历史面板',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => mainWindow?.webContents.send('shortcut:toggleHistory'),
        },
        {
          label: '悬浮状态栏',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => floatingBarManager.toggle(),
        },
        {
          label: '悬浮按钮',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => floatingButtonManager.toggle(),
        },
        {
          label: '打开控制面板',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => panelManager.toggle(),
        },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // 点击 Dock 图标：聚焦控制面板，并确保悬浮按钮在
  app.on('activate', () => {
    floatingButtonManager.show();
    const panelWin = panelManager.getWindow();
    if (panelWin && !panelWin.isDestroyed()) {
      panelWin.show();
      panelWin.focus();
    } else {
      panelManager.toggle().catch(() => {});
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  ptyManager.destroyAll();
  panelManager.destroy();
  floatingButtonManager?.destroy();
  sessionLogger.flush();
  sessionLogger.close();
});
