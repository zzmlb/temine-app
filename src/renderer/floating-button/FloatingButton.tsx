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
      <div className="fb-glow" />
      <div className="fb-glass">
        <div className="fb-edge" />
        <div className="fb-content">
          <span className="fb-prompt">›_</span>
        </div>
      </div>
    </div>
  );
};

export default FloatingButton;
