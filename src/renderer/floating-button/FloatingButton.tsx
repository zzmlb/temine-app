import React, { useEffect, useMemo, useRef, useState } from 'react';

const DRAG_THRESHOLD = 4;

// 按钮配置：后续要加新按钮，只需在这里加一项 + 主进程在 dispatch 里加一个 case
interface IslandButton {
  id: string;
  /** 按钮内显示的 SVG 路径或文字 */
  glyph: React.ReactNode;
  /** 鼠标悬停 tooltip */
  title: string;
  /** 点击时发到主进程的动作名 */
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

// 紧凑态：48×48 圆胶囊；展开态：宽度由按钮数计算（padding + 按钮数*36 + 间距）
const COMPACT_W = 48;
const COMPACT_H = 48;
const BUTTON_SIZE = 32;
const BUTTON_GAP = 6;
const ISLAND_PADDING = 10;
const EXPANDED_W = ISLAND_PADDING * 2 + BUTTONS.length * BUTTON_SIZE + (BUTTONS.length - 1) * BUTTON_GAP;
const EXPANDED_H = 52;

const FloatingButton: React.FC = () => {
  const [pressed, setPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // expanded 的 ref 镜像：用于事件回调里同步读取，避免闭包旧值导致重复 IPC
  const expandedRef = useRef(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    active: boolean;
  } | null>(null);
  // 防止 mouseleave 触发收缩时鼠标其实还在窗口内（窗口变小了）
  const expandTimerRef = useRef<number | null>(null);
  // dragMove IPC 用 rAF 节流，避免每帧 mousemove 都打主进程
  const dragRafRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add('floating-button-body');
    document.documentElement.style.setProperty('--fb-expanded-w', `${EXPANDED_W}px`);
    document.documentElement.style.setProperty('--fb-expanded-h', `${EXPANDED_H}px`);
    document.documentElement.style.setProperty('--fb-compact-w', `${COMPACT_W}px`);
    document.documentElement.style.setProperty('--fb-compact-h', `${COMPACT_H}px`);
    return () => {
      document.body.classList.remove('floating-button-body');
    };
  }, []);

  useEffect(() => {
    // 强制结束当前 drag：用于"鼠标已松开但 mouseup 丢失"的兜底
    const finishDrag = (state: { moved: boolean }, asClick: boolean) => {
      if (state.moved) {
        window.floatingButtonAPI.dragEnd();
      } else if (asClick) {
        // 紧凑态点击 = 默认动作（切控制面板）
        window.floatingButtonAPI.action('panel');
      }
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      dragStateRef.current = null;
      setPressed(false);
    };

    const onMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state || !state.active) return;

      // 兜底：mousemove 时按钮已松开 → 说明 mouseup 在窗口外丢了（浏览器/其他窗口抢焦点的常见场景）
      // 不主动派发 click 动作（鼠标早就抬起，再触发 toggle 会闪烁）
      if (e.buttons === 0) {
        finishDrag(state, false);
        return;
      }

      const dx = Math.abs(e.screenX - state.startX);
      const dy = Math.abs(e.screenY - state.startY);
      if (!state.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        state.moved = true;
      }
      // rAF 节流：每帧最多 1 次 IPC，避免把主进程打爆
      if (state.moved && dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          window.floatingButtonAPI.dragMove();
        });
      }
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (!state || !state.active) return;
      finishDrag(state, true);
    };

    // 切窗口/最小化等情况也强制清理，避免 state 泄漏
    const onBlur = () => {
      const state = dragStateRef.current;
      if (state && state.active) finishDrag(state, false);
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

  const expandedSize = useMemo(() => ({ w: EXPANDED_W, h: EXPANDED_H }), []);

  const triggerExpand = (next: boolean) => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    // 已经是目标状态：跳过 IPC 与 setBounds，掐死 hover/leave 抖动循环
    if (expandedRef.current === next) return;
    expandedRef.current = next;
    setExpanded(next);
    window.floatingButtonAPI.expand(next, next ? expandedSize.w : COMPACT_W, next ? expandedSize.h : COMPACT_H);
  };

  // enter 也加去抖：避免鼠标只是"扫过"区域就触发展开
  const handleMouseEnter = () => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    if (expandedRef.current) return;
    expandTimerRef.current = window.setTimeout(() => triggerExpand(true), 60);
  };
  const handleMouseLeave = () => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    if (!expandedRef.current) return;
    // 短延迟，避免 setBounds 形变时鼠标暂时跨越边界
    expandTimerRef.current = window.setTimeout(() => triggerExpand(false), 160);
  };

  // 紧凑态拖拽：仅当未展开时按下才启动拖拽（避免拖拽和点按钮冲突）
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (expanded) return; // 展开态由各按钮自己处理
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
    window.floatingButtonAPI.action('hide');
  };

  const handleButtonClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    window.floatingButtonAPI.action(action);
  };

  return (
    <div
      className={`fb-island ${expanded ? 'is-expanded' : ''} ${pressed ? 'is-pressed' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      {/* 紧凑态中央光点（展开后淡出） */}
      <div className="fb-dot" />

      {/* 展开态按钮槽 */}
      <div className="fb-buttons" aria-hidden={!expanded}>
        {BUTTONS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`fb-btn fb-btn-${b.id}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleButtonClick(e, b.action)}
            title={b.title}
            tabIndex={expanded ? 0 : -1}
          >
            {b.glyph}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FloatingButton;
