import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import type { CreateTerminalOptions } from '../../shared/types';

export class PtySession extends EventEmitter {
  readonly id: string;
  label: string;
  private ptyProcess: pty.IPty;

  constructor(id: string, options: CreateTerminalOptions = {}) {
    super();
    this.id = id;
    this.label = `终端 ${id.slice(0, 4)}`;

    const shell = options.shell || process.env.SHELL || '/bin/bash';
    const cwd = options.cwd || process.env.HOME || '/';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd,
      env: { ...process.env, ...options.env } as Record<string, string>,
    });

    this.ptyProcess.onData((data) => {
      this.emit('data', data);
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      this.emit('exit', exitCode);
    });
  }

  write(data: string) {
    this.ptyProcess.write(data);
  }

  resize(cols: number, rows: number) {
    try {
      this.ptyProcess.resize(cols, rows);
    } catch {
      // 忽略已退出进程的 resize 错误
    }
  }

  get pid(): number {
    return this.ptyProcess.pid;
  }

  kill() {
    try {
      this.ptyProcess.kill();
    } catch {
      // 忽略已退出进程的 kill 错误
    }
  }
}
