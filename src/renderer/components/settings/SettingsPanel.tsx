import React from 'react';
import { useLayoutStore } from '../../stores/layout-store';
import { useThemeStore } from '../../stores/theme-store';

const SettingsPanel: React.FC = () => {
  const isOpen = useLayoutStore((s) => s.settingsPanelOpen);
  const togglePanel = useLayoutStore((s) => s.toggleSettingsPanel);
  const columns = useLayoutStore((s) => s.columns);
  const setColumns = useLayoutStore((s) => s.setColumns);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  if (!isOpen) return null;

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>设置</h3>
        <button className="close-btn" onClick={togglePanel}>
          ×
        </button>
      </div>

      <div className="settings-body">
        <div className="setting-item">
          <label>主题</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
          >
            <option value="dark">暗色</option>
            <option value="light">亮色</option>
          </select>
        </div>

        <div className="setting-item">
          <label>默认列数</label>
          <select
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
          >
            <option value={1}>1 列</option>
            <option value={2}>2 列</option>
            <option value={3}>3 列</option>
            <option value={4}>4 列</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
