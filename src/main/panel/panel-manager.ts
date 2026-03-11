import { BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import { request } from 'http';
import type { ChildProcess } from 'child_process';

const PANEL_PORT = 7890;
const PANEL_URL = `http://localhost:${PANEL_PORT}`;

export class PanelManager {
  private window: BrowserWindow | null = null;
  private serverProcess: ChildProcess | null = null;

  /** 异步探测 panel 服务是否在运行（不阻塞主进程） */
  isPanelRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = request(PANEL_URL, { method: 'GET', timeout: 2000 }, (res) => {
        res.resume(); // 消费响应体防止内存泄漏
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  /** 启动 panel 后台服务 */
  async startPanelServer(): Promise<void> {
    if (await this.isPanelRunning()) return;
    try {
      // 跨平台兼容：使用 shell:true 让系统自动解析 npx（Windows 上需 npx.cmd）
      this.serverProcess = spawn('npx', ['temine', 'panel'], {
        detached: true,
        stdio: 'ignore',
        shell: true,
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
    if (!(await this.isPanelRunning())) {
      await this.startPanelServer();
      // 等待服务启动（最多 5 秒）
      let started = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (await this.isPanelRunning()) { started = true; break; }
      }
      if (!started) {
        // 服务未启动，仍然尝试打开窗口（用户可能手动启动）
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
