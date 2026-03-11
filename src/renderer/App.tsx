import React, { useEffect, useCallback } from 'react';
import TerminalGrid from './components/layout/TerminalGrid';
import Toolbar from './components/layout/Toolbar';
import HistoryPanel from './components/history/HistoryPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import FloatingBar from './floating-bar/FloatingBar';
import { useTerminalStore } from './stores/terminal-store';
import { useLayoutStore } from './stores/layout-store';
import { useThemeStore, THEME_VARS } from './stores/theme-store';

const App: React.FC = () => {
  const addTerminal = useTerminalStore((s) => s.addTerminal);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const setAiState = useTerminalStore((s) => s.setAiState);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const terminals = useTerminalStore((s) => s.terminals);
  const toggleHistoryPanel = useLayoutStore((s) => s.toggleHistoryPanel);
  const theme = useThemeStore((s) => s.theme);

  const isFloating = window.location.hash === '#/floating';

  // 初始化主题
  useEffect(() => {
    const vars = THEME_VARS[theme];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [theme]);

  // 启动时自动创建一个终端
  useEffect(() => {
    if (isFloating) return;
    if (Object.keys(terminals).length > 0) return;
    handleNewTerminal();
  }, []);

  // 快捷键：新建终端
  const handleNewTerminal = useCallback(async () => {
    try {
      const result = await window.terminalAPI.create({});
      addTerminal({
        id: result.id,
        label: result.label,
        aiState: 'idle',
        order: result.order,
        pid: result.pid,
      });
    } catch (err) {
      console.error('创建终端失败:', err);
    }
  }, [addTerminal]);

  // 快捷键：关闭终端
  const handleCloseTerminal = useCallback(async () => {
    if (activeTerminalId) {
      await window.terminalAPI.destroy(activeTerminalId);
      removeTerminal(activeTerminalId);
    }
  }, [activeTerminalId, removeTerminal]);

  // 快捷键：切换终端
  const handleSwitchTerminal = useCallback(
    (index: number) => {
      const list = Object.values(terminals).sort((a, b) => a.order - b.order);
      if (index < list.length) {
        setActiveTerminal(list[index].id);
      }
    },
    [terminals, setActiveTerminal]
  );

  // 注册快捷键监听
  useEffect(() => {
    if (isFloating) return;

    const unsubs = [
      window.windowAPI.onShortcut('shortcut:newTerminal', handleNewTerminal),
      window.windowAPI.onShortcut('shortcut:closeTerminal', handleCloseTerminal),
      window.windowAPI.onShortcut('shortcut:switchTerminal', handleSwitchTerminal),
      window.windowAPI.onShortcut('shortcut:toggleHistory', toggleHistoryPanel),
      window.windowAPI.onShortcut('terminal:focus', (id: string) => setActiveTerminal(id)),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [isFloating, handleNewTerminal, handleCloseTerminal, handleSwitchTerminal, toggleHistoryPanel, setActiveTerminal]);

  if (isFloating) {
    return <FloatingBar />;
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <TerminalGrid />
        <HistoryPanel />
        <SettingsPanel />
      </div>
    </div>
  );
};

export default App;
