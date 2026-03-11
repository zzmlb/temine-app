import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { PtyManager } from './terminal/pty-manager';
import { AiStateDetector } from './detection/ai-state-detector';
import { NotificationManager } from './notification/notification-manager';
import { TrayManager } from './tray/tray-manager';
import { FloatingBarManager } from './floating-bar/floating-bar-manager';
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
let sessionLogger: SessionLogger;
let panelManager: PanelManager;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Temine',
    backgroundColor: '#1a1b26',
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(() => {
  // 初始化核心服务
  ptyManager = new PtyManager();
  aiStateDetector = new AiStateDetector();
  notificationManager = new NotificationManager();
  sessionLogger = new SessionLogger();

  const win = createMainWindow();

  trayManager = new TrayManager(win);
  floatingBarManager = new FloatingBarManager(win);
  panelManager = new PanelManager();

  // 注册 IPC 处理器
  registerIpcHandlers({
    ptyManager,
    aiStateDetector,
    notificationManager,
    trayManager,
    floatingBarManager,
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
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
  sessionLogger.flush();
  sessionLogger.close();
});
