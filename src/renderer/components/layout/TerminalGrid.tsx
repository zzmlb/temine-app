import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TerminalPanel from '../terminal/TerminalPanel';
import TerminalHeader from '../terminal/TerminalHeader';
import { useTerminalStore } from '../../stores/terminal-store';
import { useLayoutStore } from '../../stores/layout-store';
import type { TerminalInfo } from '../../../shared/types';

interface SortableTerminalCardProps {
  terminal: TerminalInfo;
  isActive: boolean;
  onClose: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onFocus: (id: string) => void;
}

const SortableTerminalCard: React.FC<SortableTerminalCardProps> = ({
  terminal,
  isActive,
  onClose,
  onLabelChange,
  onFocus,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: terminal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`terminal-card ${isActive ? 'active' : ''}`}
    >
      <div {...attributes} {...listeners} className="drag-handle">
        <TerminalHeader
          id={terminal.id}
          label={terminal.label}
          aiState={terminal.aiState}
          isActive={isActive}
          onClose={() => onClose(terminal.id)}
          onLabelChange={(label) => onLabelChange(terminal.id, label)}
          onFocus={() => onFocus(terminal.id)}
        />
      </div>
      <div className="terminal-body">
        <TerminalPanel
          id={terminal.id}
          isActive={isActive}
          onFocus={() => onFocus(terminal.id)}
        />
      </div>
    </div>
  );
};

const TerminalGrid: React.FC = () => {
  const terminals = useTerminalStore((s) => s.terminals);
  const terminalList = Object.values(terminals).sort((a, b) => a.order - b.order);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const setActiveTerminal = useTerminalStore((s) => s.setActiveTerminal);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const setLabel = useTerminalStore((s) => s.setLabel);
  const reorderTerminals = useTerminalStore((s) => s.reorderTerminals);
  const columns = useLayoutStore((s) => s.columns);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = terminalList.map((t) => t.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      reorderTerminals(newOrder);
    },
    [terminalList, reorderTerminals]
  );

  const handleClose = useCallback(
    async (id: string) => {
      await window.terminalAPI.destroy(id);
      removeTerminal(id);
    },
    [removeTerminal]
  );

  if (terminalList.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🖥️</div>
        <h2>欢迎使用 Temine</h2>
        <p>AI 编程终端管理工具</p>
        <p>点击工具栏的 "新增终端" 开始使用</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={terminalList.map((t) => t.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className="terminal-grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {terminalList.map((terminal) => (
            <SortableTerminalCard
              key={terminal.id}
              terminal={terminal}
              isActive={activeTerminalId === terminal.id}
              onClose={handleClose}
              onLabelChange={setLabel}
              onFocus={setActiveTerminal}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TerminalGrid;
