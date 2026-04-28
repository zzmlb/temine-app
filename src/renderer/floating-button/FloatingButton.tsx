import React, { useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 4;

const FloatingButton: React.FC = () => {
  const [pressed, setPressed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    document.body.classList.add('floating-button-body');
    return () => {
      document.body.classList.remove('floating-button-body');
    };
  }, []);

  // 全局监听 mousemove / mouseup，避免鼠标移出按钮后丢失事件
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state || !state.active) return;
      const dx = Math.abs(e.screenX - state.startX);
      const dy = Math.abs(e.screenY - state.startY);
      if (!state.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        state.moved = true;
      }
      if (state.moved) {
        window.floatingButtonAPI.dragMove();
      }
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (!state || !state.active) return;

      if (state.moved) {
        window.floatingButtonAPI.dragEnd();
      } else {
        // 没有拖动 → 视为点击：切换控制面板
        window.floatingButtonAPI.click();
      }

      dragStateRef.current = null;
      setPressed(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStateRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      moved: false,
      active: true,
    };
    setPressed(true);
    window.floatingButtonAPI.dragStart();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // 右键隐藏，避免没有入口时藏起来找不到（菜单/快捷键还能再显示）
    e.preventDefault();
    window.floatingButtonAPI.hide();
  };

  return (
    <div
      className={`fb-root ${hovering ? 'is-hover' : ''} ${pressed ? 'is-pressed' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onContextMenu={handleContextMenu}
      title="点击：打开/关闭控制面板\n拖动：移动按钮\n右键：隐藏"
    >
      <div className="fb-aurora" />
      <div className="fb-ring" />
      <div className="fb-core">
        <svg
          className="fb-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fbBolt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff7c2" />
              <stop offset="60%" stopColor="#ffe066" />
              <stop offset="100%" stopColor="#ff8a00" />
            </linearGradient>
          </defs>
          <path
            d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.5L13.5 2Z"
            fill="url(#fbBolt)"
            stroke="#ffffff"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="fb-shine" />
    </div>
  );
};

export default FloatingButton;
