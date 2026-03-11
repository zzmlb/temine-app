import type { PatternEntry, AiState } from '../../shared/types';

// Claude Code 专用检测模式
export const CLAUDE_CODE_PATTERNS: PatternEntry[] = [
  // 等待确认 - 高优先级
  {
    pattern: /Do you want to proceed\?/i,
    state: 'waiting_confirm',
    priority: 100,
  },
  {
    pattern: /\(y\/n\)/i,
    state: 'waiting_confirm',
    priority: 100,
  },
  {
    pattern: /\(Y\/n\)/i,
    state: 'waiting_confirm',
    priority: 100,
  },
  {
    pattern: /Allow|Deny/i,
    state: 'waiting_confirm',
    priority: 95,
    contextCondition: (lines) => lines.some((l) => /tool|permission|access/i.test(l)),
  },
  {
    pattern: /Press Enter to continue/i,
    state: 'waiting_confirm',
    priority: 90,
  },
  {
    pattern: /Do you want to/i,
    state: 'waiting_confirm',
    priority: 85,
  },

  // 运行中 - spinner 字符
  {
    pattern: /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/,
    state: 'running',
    priority: 70,
  },
  {
    pattern: /Thinking\.\.\./i,
    state: 'running',
    priority: 70,
  },
  {
    pattern: /Generating/i,
    state: 'running',
    priority: 65,
  },
  {
    pattern: /Writing\.\.\./i,
    state: 'running',
    priority: 65,
  },
  {
    pattern: /Reading\.\.\./i,
    state: 'running',
    priority: 60,
  },

  // 错误
  {
    pattern: /Error:/i,
    state: 'error',
    priority: 80,
  },
  {
    pattern: /ERR!/,
    state: 'error',
    priority: 80,
  },
  {
    pattern: /FAILED/i,
    state: 'error',
    priority: 75,
  },
  {
    pattern: /panic:|fatal:/i,
    state: 'error',
    priority: 85,
  },

  // 完成
  {
    pattern: /✓|✔|Done!|Complete[d]?[.!]/i,
    state: 'completed',
    priority: 60,
  },
  {
    pattern: /Successfully/i,
    state: 'completed',
    priority: 55,
  },
];

export class PatternRegistry {
  private patterns: PatternEntry[] = [];

  constructor() {
    this.patterns = [...CLAUDE_CODE_PATTERNS];
  }

  register(entry: PatternEntry) {
    this.patterns.push(entry);
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  match(text: string, recentLines: string[]): { state: AiState; priority: number } | null {
    for (const entry of this.patterns) {
      if (entry.pattern.test(text)) {
        if (entry.contextCondition && !entry.contextCondition(recentLines)) {
          continue;
        }
        return { state: entry.state, priority: entry.priority };
      }
    }
    return null;
  }
}
