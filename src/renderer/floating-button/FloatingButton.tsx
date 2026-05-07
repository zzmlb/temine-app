import React, { useEffect, useRef } from 'react';

const DRAG_THRESHOLD = 4;

// 按钮配置：后续要加新按钮，只需在这里加一项 + 主进程在 dispatch 里加一个 case
interface IslandButton {
  id: string;
  glyph: React.ReactNode;
  title: string;
  action: string;
}

const BUTTONS: IslandButton[] = [
  {
    id: 'panel',
    title: '打开/关闭控制面板',
    action: 'panel',
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9l3 3-3 3" />
        <path d="M13 15h4" />
      </svg>
    ),
  },
  {
    id: 'manager',
    title: '打开/隐藏终端管理器',
    action: 'manager',
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'hide',
    title: '隐藏灵动岛',
    action: 'hide',
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M5 12h14" />
      </svg>
    ),
  },
];

// 固定展开态，不再有 hover 形变。窗口尺寸由主进程 floating-button-manager 决定，
// 这里的常量用于内部 CSS 变量（与主进程 ISLAND_W/H 必须保持一致）。
const HANDLE_SIZE = 22;
const BUTTON_SIZE = 32;
const BUTTON_GAP = 6;
const HANDLE_GAP = 8;
const ISLAND_PADDING = 10;
const ISLAND_W =
  ISLAND_PADDING * 2 + HANDLE_SIZE + HANDLE_GAP + BUTTONS.length * BUTTON_SIZE + (BUTTONS.length - 1) * BUTTON_GAP;
const ISLAND_H = 48;

interface DragState {
  startX: number;
  startY: number;
  moved: boolean;
}

const FloatingButton: React.FC = () => {
  // 拖拽状态：null 表示当前没有拖拽。只在按下左侧 handle 时才创建。
  const dragStateRef = useRef<DragState | null>(null);
  // dragMove IPC 用 rAF 节流
  const dragRafRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add('floating-button-body');
    document.documentElement.style.setProperty('--fb-island-w', `${ISLAND_W}px`);
    document.documentElement.style.setProperty('--fb-island-h', `${ISLAND_H}px`);
    document.documentElement.style.setProperty('--fb-handle-size', `${HANDLE_SIZE}px`);
    return () => {
      document.body.classList.remove('floating-button-body');
    };
  }, []);

  useEffect(() => {
    const finishDrag = (state: DragState) => {
      if (state.moved) {
        window.floatingButtonAPI.dragEnd();
      }
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      dragStateRef.current = null;
    };

    const onMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      // 兜底：mousemove 时按钮已松开 → mouseup 在窗口外丢了，强制清理
      if (e.buttons === 0) {
        finishDrag(state);
        return;
      }

      const dx = Math.abs(e.screenX - state.startX);
      const dy = Math.abs(e.screenY - state.startY);
      if (!state.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        state.moved = true;
        // 惰性 dragStart：真的越过阈值才通知主进程
        window.floatingButtonAPI.dragStart();
      }
      if (state.moved && dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          window.floatingButtonAPI.dragMove();
        });
      }
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (!state) return;
      finishDrag(state);
    };

    const onBlur = () => {
      const state = dragStateRef.current;
      if (state) finishDrag(state);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onBlur);
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, []);

  // 仅左侧 handle 启动拖拽，按钮区域不响应拖拽
  const handleHandleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStateRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      moved: false,
    };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.floatingButtonAPI.action('hide');
  };

  const handleButtonClick = (action: string) => {
    console.log(`[FB-renderer] click action=${action} at ${performance.now().toFixed(0)}ms`);
    window.floatingButtonAPI.action(action);
  };

  return (
    <div className="fb-island" onContextMenu={handleContextMenu}>
      <div
        className="fb-handle"
        onMouseDown={handleHandleMouseDown}
        title="按住拖动灵动岛"
      >
        <div className="fb-dot" />
      </div>
      <div className="fb-buttons">
        {BUTTONS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`fb-btn fb-btn-${b.id}`}
            onClick={() => handleButtonClick(b.action)}
            title={b.title}
          >
            {b.glyph}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloatingButton;
