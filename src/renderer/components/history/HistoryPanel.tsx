import React, { useState, useCallback, useEffect } from 'react';
import { useLayoutStore } from '../../stores/layout-store';
import type { OutputChunk } from '../../../shared/types';

const HistoryPanel: React.FC = () => {
  const isOpen = useLayoutStore((s) => s.historyPanelOpen);
  const togglePanel = useLayoutStore((s) => s.toggleHistoryPanel);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<OutputChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const data = await window.historyAPI.search(keyword.trim());
      setResults(data || []);
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>历史记录</h3>
        <button className="close-btn" onClick={togglePanel}>
          ×
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索终端输出..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="history-results">
        {results.length === 0 && keyword && !loading && (
          <div className="no-results">未找到匹配结果</div>
        )}
        {results.map((chunk) => (
          <div key={chunk.id} className="log-entry">
            <div className="log-meta">
              <span className={`log-source ${chunk.source}`}>
                {chunk.source === 'stdin' ? '输入' : '输出'}
              </span>
              <span className="log-session">会话: {chunk.sessionId}</span>
              <span className="log-time">{formatTime(chunk.timestamp)}</span>
            </div>
            <pre className="log-data">
              {highlightText(chunk.data.slice(0, 500), keyword)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
