import { BrowserWindow } from 'electron';
import { execSync, spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

const PANEL_PORT = 7890;
const PANEL_URL = `http://localhost:${PANEL_PORT}`;

export class PanelManager {
  private window: BrowserWindow | null = null;
  private serverProcess: ChildProcess | null = null;

  /** 探测 panel 服务是否在运行 */
  isPanelRunning(): boolean {
    try {
      execSync(`curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 ${PANEL_URL}`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /** 启动 panel 后台服务 */
  startPanelServer(): void {
    if (this.isPanelRunning()) return;
    try {
      // 使用 npx temine panel 或直接调用 node
      this.serverProcess = spawn('npx', ['temine', 'panel'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env },
      });
      this.serverProcess.unref();
    } catch {
      // 忽略启动失败，用户可手动启动
    }
  }

  /** 切换面板窗口显示/隐藏 */
  async toggle(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
      return;
    }

    // 确保 panel 服务在运行
    if (!this.isPanelRunning()) {
      this.startPanelServer();
      // 等待服务启动（最多 5 秒）
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (this.isPanelRunning()) break;
      }
    }

    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'Temine 控制面板',
      backgroundColor: '#0d1117',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.loadURL(PANEL_URL);

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
    }
  }
}
