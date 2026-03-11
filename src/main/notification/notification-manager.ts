import { Notification, BrowserWindow } from 'electron';

interface NotifyOptions {
  title: string;
  body: string;
  sessionId?: string;
}

const THROTTLE_MS = 30000; // 30 秒限流

export class NotificationManager {
  private lastNotifyTime = new Map<string, number>();
  private enabled = true;

  notify(options: NotifyOptions) {
    if (!this.enabled) return;

    // 限流检查
    const key = options.sessionId || 'global';
    const now = Date.now();
    const lastTime = this.lastNotifyTime.get(key) || 0;
    if (now - lastTime < THROTTLE_MS) return;

    this.lastNotifyTime.set(key, now);

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: false,
    });

    notification.on('click', () => {
      // 点击通知聚焦主窗口
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows.find((w) => !w.isAlwaysOnTop());
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        if (options.sessionId) {
          mainWindow.webContents.send('terminal:focus', options.sessionId);
        }
      }
    });

    notification.show();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}
