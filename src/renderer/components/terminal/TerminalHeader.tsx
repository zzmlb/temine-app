import React, { useState, useRef, useEffect } from 'react';
import type { AiState } from '../../../shared/types';

interface TerminalHeaderProps {
  id: string;
  label: string;
  aiState: AiState;
  isActive: boolean;
  onClose: () => void;
  onLabelChange: (label: string) => void;
  onFocus: () => void;
}

const STATE_COLORS: Record<AiState, string> = {
  idle: '#888888',
  running: '#4CAF50',
  waiting_confirm: '#FF5722',
  error: '#F44336',
  completed: '#2196F3',
};

const STATE_LABELS: Record<AiState, string> = {
  idle: '空闲',
  running: '运行中',
  waiting_confirm: '等待确认',
  error: '错误',
  completed: '已完成',
};

const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  id,
  label,
  aiState,
  isActive,
  onClose,
  onLabelChange,
  onFocus,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => {
    setEditValue(label);
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== label) {
      onLabelChange(editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setEditValue(label);
    }
  };

  return (
    <div
      className={`terminal-header ${isActive ? 'active' : ''}`}
      onClick={onFocus}
    >
      <div className="terminal-header-left">
        <span
          className="status-dot"
          style={{ backgroundColor: STATE_COLORS[aiState] }}
          title={STATE_LABELS[aiState]}
        />
        {editing ? (
          <input
            ref={inputRef}
            className="label-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            maxLength={30}
          />
        ) : (
          <span className="terminal-label" onDoubleClick={handleDoubleClick}>
            {label}
          </span>
        )}
      </div>
      <div className="terminal-header-right">
        <span className="ai-state-tag">{STATE_LABELS[aiState]}</span>
        <button
          className="close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="关闭终端"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TerminalHeader;
