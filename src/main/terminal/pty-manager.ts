import { EventEmitter } from 'events';
import { PtySession } from './pty-session';
import type { CreateTerminalOptions } from '../../shared/types';

export class PtyManager extends EventEmitter {
  private sessions = new Map<string, PtySession>();
  private orderCounter = 0;

  create(id: string, options: CreateTerminalOptions = {}): PtySession {
    if (this.sessions.has(id)) {
      throw new Error(`会话 ${id} 已存在`);
    }

    const session = new PtySession(id, options);

    session.on('data', (data: string) => {
      this.emit('output', id, data);
    });

    session.on('exit', (code: number) => {
      this.emit('exit', id, code);
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);
    this.orderCounter++;
    return session;
  }

  destroy(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.kill();
      this.sessions.delete(id);
    }
  }

  destroyAll() {
    for (const [id, session] of this.sessions) {
      session.kill();
      this.sessions.delete(id);
    }
  }

  getSession(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): PtySession[] {
    return Array.from(this.sessions.values());
  }

  write(id: string, data: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.write(data);
    }
  }

  resize(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id);
    if (session) {
      session.resize(cols, rows);
    }
  }

  getOrder(): number {
    return this.orderCounter;
  }
}
