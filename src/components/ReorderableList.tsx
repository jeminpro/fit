import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface DragHandleProps {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture: () => void;
  'aria-label': string;
}

interface ReorderableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, handleProps: DragHandleProps) => ReactNode;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

function indexFromY(y: number, els: Array<HTMLElement | null>): number {
  let last = 0;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    last = i;
    if (y < el.getBoundingClientRect().bottom) return i;
  }
  return last;
}

export function ReorderableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
}: ReorderableListProps<T>) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragFromRef = useRef<number | null>(null);
  const dragToRef = useRef<number | null>(null);

  function startDrag(index: number, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFromRef.current = index;
    dragToRef.current = index;
    setDragFrom(index);
    setDragTo(index);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragFromRef.current == null) return;
    const nextTo = indexFromY(event.clientY, itemRefs.current);
    dragToRef.current = nextTo;
    setDragTo(nextTo);
  }

  function endDrag() {
    const from = dragFromRef.current;
    const to = dragToRef.current;
    dragFromRef.current = null;
    dragToRef.current = null;
    setDragFrom(null);
    setDragTo(null);
    if (from == null || to == null) return;
    const next = moveItem(items, from, to);
    if (next !== items) onReorder(next);
  }

  return (
    <div className={`space-y-3 ${dragFrom != null ? 'select-none' : ''}`}>
      {items.map((item, index) => {
        const dragging = dragFrom === index;
        const dropTarget =
          dragFrom != null && dragTo === index && dragFrom !== index;
        return (
          <div
            key={getKey(item)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={
              dragging
                ? 'opacity-55'
                : dropTarget
                  ? 'rounded-2xl ring-2 ring-brand-500/45'
                  : undefined
            }
          >
            {renderItem(item, {
              onPointerDown: (event) => startDrag(index, event),
              onPointerMove: moveDrag,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
              onLostPointerCapture: endDrag,
              'aria-label': 'Drag to reorder',
            })}
          </div>
        );
      })}
    </div>
  );
}
