import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { CreateTerminalOptions, AppSettings } from '../shared/types';

const outputListeners = new Map<string, (data: string) => void>();
const exitListeners = new Map<string, (code: number) => void>();
const aiStateListeners = new Map<string, (state: string) => void>();

// 监听主进程推送的输出
ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUTPUT, (_event, id: string, data: string) => {
  const listener = outputListeners.get(id);
  if (listener) listener(data);
});

// 监听终端退出
ipcRenderer.on('terminal:exit', (_event, id: string, code: number) => {
  const listener = exitListeners.get(id);
  if (listener) listener(code);
});

// 监听 AI 状态变化
ipcRenderer.on(IPC_CHANNELS.TERMINAL_AI_STATE, (_event, id: string, state: string) => {
  const listener = aiStateListeners.get(id);
  if (listener) listener(state);
});

const terminalAPI = {
  create: (options: CreateTerminalOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, options),

  input: (id: string, data: string) =>
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_INPUT, id, data),

  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),

  destroy: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_DESTROY, id),

  list: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_LIST),

  onOutput: (id: string, callback: (data: string) => void) => {
    outputListeners.set(id, callback);
    return () => { outputListeners.delete(id); };
  },

  onExit: (id: string, callback: (code: number) => void) => {
    exitListeners.set(id, callback);
    return () => { exitListeners.delete(id); };
  },

  onAiState: (id: string, callback: (state: string) => void) => {
    aiStateListeners.set(id, callback);
    return () => { aiStateListeners.delete(id); };
  },
};

const historyAPI = {
  search: (keyword: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_SEARCH, keyword),

  getTimeline: (sessionId: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_TIMELINE, sessionId, limit, offset),

  export: (sessionId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_EXPORT, sessionId),
};

const settingsAPI = {
  get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  set: (key: string, value: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
};

const windowAPI = {
  toggleFloatingBar: () => ipcRenderer.send(IPC_CHANNELS.FLOATING_TOGGLE),
  togglePanel: () => ipcRenderer.send('panel:toggle'),
  onShortcut: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => { ipcRenderer.removeListener(channel, handler); };
  },
};

contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);
contextBridge.exposeInMainWorld('historyAPI', historyAPI);
contextBridge.exposeInMainWorld('settingsAPI', settingsAPI);
contextBridge.exposeInMainWorld('windowAPI', windowAPI);

export type TerminalAPI = typeof terminalAPI;
export type HistoryAPI = typeof historyAPI;
export type SettingsAPI = typeof settingsAPI;
export type WindowAPI = typeof windowAPI;
