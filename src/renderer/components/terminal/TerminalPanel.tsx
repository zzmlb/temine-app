import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useThemeStore, THEME_VARS } from '../../stores/theme-store';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  id: string;
  isActive: boolean;
  onFocus?: () => void;
}

const XTERM_THEMES = {
  dark: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selectionBackground: '#33467c',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    cursorAccent: '#ffffff',
    selectionBackground: '#b3d4fc',
    black: '#000000',
    red: '#d32f2f',
    green: '#388e3c',
    yellow: '#f57c00',
    blue: '#1a73e8',
    magenta: '#7b1fa2',
    cyan: '#0288d1',
    white: '#c0c0c0',
    brightBlack: '#666666',
    brightRed: '#d32f2f',
    brightGreen: '#388e3c',
    brightYellow: '#f57c00',
    brightBlue: '#1a73e8',
    brightMagenta: '#7b1fa2',
    brightCyan: '#0288d1',
    brightWhite: '#333333',
  },
};

const TerminalPanel: React.FC<TerminalPanelProps> = ({ id, isActive, onFocus }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, monospace',
      theme: XTERM_THEMES[theme],
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 连接 PTY 输入
    terminal.onData((data) => {
      window.terminalAPI.input(id, data);
    });

    // 连接 PTY 输出
    const unsubOutput = window.terminalAPI.onOutput(id, (data) => {
      terminal.write(data);
    });

    // 监听退出
    const unsubExit = window.terminalAPI.onExit(id, () => {
      terminal.write('\r\n[进程已退出]\r\n');
    });

    // ResizeObserver 自适应
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        const { cols, rows } = terminal;
        window.terminalAPI.resize(id, cols, rows);
      } catch {
        // 忽略 resize 错误
      }
    });
    resizeObserver.observe(containerRef.current);

    // 聚焦
    if (isActive) {
      terminal.focus();
    }

    return () => {
      resizeObserver.disconnect();
      unsubOutput();
      unsubExit();
      terminal.dispose();
    };
  }, [id]);

  // 主题变化时更新
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = XTERM_THEMES[theme];
    }
  }, [theme]);

  // 活动状态变化时聚焦
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      className={`terminal-panel ${isActive ? 'active' : ''}`}
      onClick={onFocus}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default TerminalPanel;
