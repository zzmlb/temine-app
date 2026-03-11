import React, { useCallback } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';
import { useLayoutStore } from '../../stores/layout-store';
import { useThemeStore } from '../../stores/theme-store';

const Toolbar: React.FC = () => {
  const addTerminal = useTerminalStore((s) => s.addTerminal);
  const terminalCount = useTerminalStore((s) => Object.keys(s.terminals).length);
  const columns = useLayoutStore((s) => s.columns);
  const setColumns = useLayoutStore((s) => s.setColumns);
  const toggleHistoryPanel = useLayoutStore((s) => s.toggleHistoryPanel);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const theme = useThemeStore((s) => s.theme);

  const handleNewTerminal = useCallback(async () => {
    console.log('[Renderer] 点击了新增终端按钮');
    try {
      const result = await window.terminalAPI.create({});
      console.log('[Renderer] 创建终端成功:', result);
      addTerminal({
        id: result.id,
        label: result.label,
        aiState: 'idle',
        order: result.order,
        pid: result.pid,
      });
      console.log('[Renderer] 已添加到 store');
    } catch (err) {
      console.error('[Renderer] 创建终端失败:', err);
    }
  }, [addTerminal]);

  const handleToggleFloat = useCallback(() => {
    window.windowAPI.toggleFloatingBar();
  }, []);

  const handleTogglePanel = useCallback(() => {
    window.windowAPI.togglePanel();
  }, []);

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn primary" onClick={handleNewTerminal}>
          + 新增终端
        </button>
        <span className="terminal-count">
          {terminalCount} 个终端
        </span>
      </div>

      <div className="toolbar-center">
        <div className="column-switcher">
          {[1, 2, 3, 4].map((col) => (
            <button
              key={col}
              className={`col-btn ${columns === col ? 'active' : ''}`}
              onClick={() => setColumns(col)}
              title={`${col} 列`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-btn"
          onClick={toggleHistoryPanel}
          title="历史记录"
        >
          📋 历史
        </button>
        <button
          className="toolbar-btn"
          onClick={handleTogglePanel}
          title="打开控制面板 (Cmd+Shift+P)"
        >
          🖥 面板
        </button>
        <button
          className="toolbar-btn"
          onClick={handleToggleFloat}
          title="悬浮状态栏"
        >
          📌 悬浮栏
        </button>
        <button
          className="toolbar-btn"
          onClick={toggleTheme}
          title={`切换${theme === 'dark' ? '亮色' : '暗色'}主题`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
