import React, { useEffect, useState } from 'react';
import type { AiState } from '../../shared/types';

interface FloatingTerminal {
  id: string;
  label: string;
  aiState: AiState;
}

const STATE_ICONS: Record<AiState, string> = {
  idle: '🟡',
  running: '🟢',
  waiting_confirm: '🔴',
  error: '❌',
  completed: '✅',
};

const STATE_LABELS: Record<AiState, string> = {
  idle: '空闲',
  running: '运行中',
  waiting_confirm: '等待确认',
  error: '错误',
  completed: '已完成',
};

const FloatingBar: React.FC = () => {
  const [terminals, setTerminals] = useState<FloatingTerminal[]>([]);

  useEffect(() => {
    // 从主窗口同步终端列表（简化版）
    const loadTerminals = async () => {
      try {
        const list = await window.terminalAPI.list();
        setTerminals(
          list.map((t: any) => ({
            id: t.id,
            label: t.label,
            aiState: 'idle' as AiState,
          }))
        );
      } catch {
        // 忽略
      }
    };
    loadTerminals();

    const interval = setInterval(loadTerminals, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (id: string) => {
    // 通过 IPC 通知主窗口聚焦终端
    window.terminalAPI.input(id, ''); // 触发焦点
  };

  return (
    <div className="floating-bar">
      <div className="floating-title">Temine</div>
      {terminals.length === 0 ? (
        <div className="floating-empty">暂无终端</div>
      ) : (
        terminals.map((t) => (
          <div
            key={t.id}
            className="floating-item"
            onClick={() => handleClick(t.id)}
            title={`${t.label} - ${STATE_LABELS[t.aiState]}`}
          >
            <span className="floating-icon">{STATE_ICONS[t.aiState]}</span>
            <span className="floating-label">{t.label}</span>
            <span className="floating-state">{STATE_LABELS[t.aiState]}</span>
          </div>
        ))
      )}
    </div>
  );
};

export default FloatingBar;
