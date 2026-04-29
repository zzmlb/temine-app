// AI 状态枚举
export type AiState = 'idle' | 'running' | 'waiting_confirm' | 'error' | 'completed';

// 终端会话信息
export interface TerminalInfo {
  id: string;
  label: string;
  aiState: AiState;
  order: number;
  pid?: number;
}

// 创建终端选项
export interface CreateTerminalOptions {
  id?: string;
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

// IPC 通道名称常量
export const IPC_CHANNELS = {
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_LIST: 'terminal:list',
  TERMINAL_AI_STATE: 'terminal:aiState',
  FLOATING_UPDATE: 'floating:update',
  FLOATING_CLICK: 'floating:click',
  FLOATING_TOGGLE: 'floating:toggle',
  FLOATING_BUTTON_TOGGLE: 'floatingButton:toggle',
  FLOATING_BUTTON_CLICK: 'floatingButton:click',
  FLOATING_BUTTON_DRAG_START: 'floatingButton:dragStart',
  FLOATING_BUTTON_DRAG_MOVE: 'floatingButton:dragMove',
  FLOATING_BUTTON_DRAG_END: 'floatingButton:dragEnd',
  FLOATING_BUTTON_HIDE: 'floatingButton:hide',
  FLOATING_BUTTON_EXPAND: 'floatingButton:expand',
  FLOATING_BUTTON_ACTION: 'floatingButton:action',
  HISTORY_SEARCH: 'history:search',
  HISTORY_TIMELINE: 'history:getTimeline',
  HISTORY_EXPORT: 'history:export',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  THEME_CHANGE: 'theme:change',
  PANEL_TOGGLE: 'panel:toggle',
} as const;

// 历史记录
export interface OutputChunk {
  id: number;
  sessionId: string;
  data: string;
  timestamp: number;
  source: 'stdin' | 'stdout';
}

export interface StateEvent {
  id: number;
  sessionId: string;
  state: AiState;
  confidence: number;
  timestamp: number;
}

export interface SessionRecord {
  id: string;
  label: string;
  createdAt: number;
  endedAt?: number;
}

// 检测模式
export interface PatternEntry {
  pattern: RegExp;
  state: AiState;
  priority: number;
  contextCondition?: (recentLines: string[]) => boolean;
}

// 应用设置
export interface AppSettings {
  defaultShell: string;
  columns: number;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  historyRetentionDays: number;
  floatingBarEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultShell: process.env.SHELL || '/bin/bash',
  columns: 2,
  notificationsEnabled: true,
  theme: 'dark',
  historyRetentionDays: 7,
  floatingBarEnabled: true,
};
