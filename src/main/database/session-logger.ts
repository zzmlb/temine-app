import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { AiState, OutputChunk, StateEvent, SessionRecord } from '../../shared/types';

interface QueueItem {
  type: 'output' | 'state';
  sessionId: string;
  data?: string;
  source?: 'stdin' | 'stdout';
  state?: AiState;
  confidence?: number;
  timestamp: number;
}

const FLUSH_INTERVAL = 500;
const MAX_QUEUE_SIZE = 100;

export class SessionLogger {
  private db: Database.Database;
  private queue: QueueItem[] = [];
  private flushTimer: ReturnType<typeof setInterval>;

  // 预编译 SQL 语句
  private insertOutput!: Database.Statement;
  private insertState!: Database.Statement;
  private insertSession!: Database.Statement;
  private updateSessionEnd!: Database.Statement;

  constructor() {
    const dbPath = path.join(
      app?.getPath?.('userData') || '/tmp',
      'temine.db'
    );
    this.db = new Database(dbPath);
    this.initSchema();
    this.prepareStatements();

    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        ended_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS output_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('stdin', 'stdout')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS state_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        state TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_output_session ON output_chunks(session_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_output_data ON output_chunks(data);
      CREATE INDEX IF NOT EXISTS idx_state_session ON state_events(session_id, timestamp);
    `);
  }

  private prepareStatements() {
    this.insertOutput = this.db.prepare(
      'INSERT INTO output_chunks (session_id, data, timestamp, source) VALUES (?, ?, ?, ?)'
    );
    this.insertState = this.db.prepare(
      'INSERT INTO state_events (session_id, state, confidence, timestamp) VALUES (?, ?, ?, ?)'
    );
    this.insertSession = this.db.prepare(
      'INSERT OR IGNORE INTO sessions (id, label, created_at) VALUES (?, ?, ?)'
    );
    this.updateSessionEnd = this.db.prepare(
      'UPDATE sessions SET ended_at = ? WHERE id = ?'
    );
  }

  startSession(id: string, label: string) {
    this.insertSession.run(id, label, Date.now());
  }

  endSession(id: string) {
    this.updateSessionEnd.run(Date.now(), id);
  }

  logOutput(sessionId: string, data: string, source: 'stdin' | 'stdout') {
    this.queue.push({
      type: 'output',
      sessionId,
      data,
      source,
      timestamp: Date.now(),
    });

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  logStateEvent(sessionId: string, state: AiState, confidence: number) {
    this.queue.push({
      type: 'state',
      sessionId,
      state,
      confidence,
      timestamp: Date.now(),
    });
  }

  flush() {
    if (this.queue.length === 0) return;

    const items = this.queue.splice(0);
    const runBatch = this.db.transaction(() => {
      for (const item of items) {
        if (item.type === 'output') {
          this.insertOutput.run(item.sessionId, item.data, item.timestamp, item.source);
        } else {
          this.insertState.run(item.sessionId, item.state, item.confidence, item.timestamp);
        }
      }
    });
    runBatch();
  }

  searchOutput(keyword: string): OutputChunk[] {
    this.flush();
    const stmt = this.db.prepare(
      'SELECT id, session_id as sessionId, data, timestamp, source FROM output_chunks WHERE data LIKE ? ORDER BY timestamp DESC LIMIT 100'
    );
    return stmt.all(`%${keyword}%`) as OutputChunk[];
  }

  getTimeline(sessionId: string, limit = 500, offset = 0): OutputChunk[] {
    this.flush();
    const stmt = this.db.prepare(
      'SELECT id, session_id as sessionId, data, timestamp, source FROM output_chunks WHERE session_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?'
    );
    return stmt.all(sessionId, limit, offset) as OutputChunk[];
  }

  getStateEvents(sessionId: string): StateEvent[] {
    this.flush();
    const stmt = this.db.prepare(
      'SELECT id, session_id as sessionId, state, confidence, timestamp FROM state_events WHERE session_id = ? ORDER BY timestamp ASC'
    );
    return stmt.all(sessionId) as StateEvent[];
  }

  getSessions(): SessionRecord[] {
    const stmt = this.db.prepare(
      'SELECT id, label, created_at as createdAt, ended_at as endedAt FROM sessions ORDER BY created_at DESC'
    );
    return stmt.all() as SessionRecord[];
  }

  exportSession(sessionId: string): string {
    this.flush();
    const chunks = this.getTimeline(sessionId, 10000);
    return chunks.map((c) => c.data).join('');
  }

  cleanup(retentionDays = 7) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    this.db.exec(`
      DELETE FROM output_chunks WHERE timestamp < ${cutoff};
      DELETE FROM state_events WHERE timestamp < ${cutoff};
      DELETE FROM sessions WHERE ended_at IS NOT NULL AND ended_at < ${cutoff};
    `);
  }

  close() {
    clearInterval(this.flushTimer);
    this.flush();
    this.db.close();
  }
}
