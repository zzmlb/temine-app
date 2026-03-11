import { EventEmitter } from 'events';
import { stripAnsi } from './ansi-stripper';
import { PatternRegistry } from './pattern-registry';
import type { AiState } from '../../shared/types';

interface SessionState {
  currentState: AiState;
  confidence: number;
  recentLines: string[];
  lastActivityTime: number;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

const IDLE_TIMEOUT = 5000; // 5 秒无输出视为 idle
const DEBOUNCE_MS = 300; // 状态变化防抖
const MAX_RECENT_LINES = 20;

export class AiStateDetector extends EventEmitter {
  private registry = new PatternRegistry();
  private sessions = new Map<string, SessionState>();
  private idleCheckInterval: ReturnType<typeof setInterval>;

  constructor() {
    super();

    // 定期检查 idle 状态
    this.idleCheckInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, state] of this.sessions) {
        if (
          now - state.lastActivityTime > IDLE_TIMEOUT &&
          state.currentState === 'running'
        ) {
          this.updateState(id, 'idle');
        }
      }
    }, 2000);
  }

  feed(sessionId: string, rawData: string) {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        currentState: 'idle',
        confidence: 0,
        recentLines: [],
        lastActivityTime: Date.now(),
        debounceTimer: null,
      };
      this.sessions.set(sessionId, state);
    }

    state.lastActivityTime = Date.now();

    // 剥离 ANSI 转义码
    const cleanText = stripAnsi(rawData);

    // 更新最近行
    const newLines = cleanText.split('\n').filter((l) => l.trim().length > 0);
    state.recentLines.push(...newLines);
    if (state.recentLines.length > MAX_RECENT_LINES) {
      state.recentLines = state.recentLines.slice(-MAX_RECENT_LINES);
    }

    // 模式匹配
    const match = this.registry.match(cleanText, state.recentLines);
    if (match) {
      // 防抖处理
      if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
      }
      const newState = match.state;
      state.debounceTimer = setTimeout(() => {
        this.updateState(sessionId, newState);
      }, DEBOUNCE_MS);
    }
  }

  private updateState(sessionId: string, newState: AiState) {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    const oldState = state.currentState;
    if (oldState === newState) return;

    state.currentState = newState;
    state.confidence = 1.0;

    this.emit('stateChange', sessionId, oldState, newState);
  }

  getState(sessionId: string): AiState {
    return this.sessions.get(sessionId)?.currentState || 'idle';
  }

  removeSession(sessionId: string) {
    const state = this.sessions.get(sessionId);
    if (state?.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }
    this.sessions.delete(sessionId);
  }

  destroy() {
    clearInterval(this.idleCheckInterval);
    for (const [, state] of this.sessions) {
      if (state.debounceTimer) clearTimeout(state.debounceTimer);
    }
    this.sessions.clear();
  }
}
