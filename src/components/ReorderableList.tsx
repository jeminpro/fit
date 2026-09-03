import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

export interface DragHandleProps {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  'aria-label': string;
  'aria-grabbed': boolean;
}

interface ReorderableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, handleProps: DragHandleProps) => ReactNode;
}

interface ItemRect {
  top: number;
  bottom: number;
}

const LIST_GAP = 12;

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

function indexFromY(y: number, rects: ItemRect[]): number {
  let last = 0;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (!rect) continue;
    last = i;
    if (y < rect.bottom) return i;
  }
  return last;
}

function shiftFor(index: number, from: number, to: number, amount: number): number {
  if (index === from || from === to) return 0;
  if (to > from && index > from && index <= to) return -amount;
  if (to < from && index < from && index >= to) return amount;
  return 0;
}

export function ReorderableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
}: ReorderableListProps<T>) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [delta, setDelta] = useState({ x: 0, y: 0 });

  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);
  itemsRef.current = items;
  onReorderRef.current = onReorder;

  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragFromRef = useRef<number | null>(null);
  const dragToRef = useRef<number | null>(null);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const rectsRef = useRef<ItemRect[]>([]);
  const listTopRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (dragFrom == null) return;
    document.documentElement.dataset.reordering = '';
    return () => {
      delete document.documentElement.dataset.reordering;
    };
  }, [dragFrom]);

  useEffect(() => {
    function finishDrag() {
      const from = dragFromRef.current;
      const to = dragToRef.current;
      pointerIdRef.current = null;
      dragFromRef.current = null;
      dragToRef.current = null;
      setDragFrom(null);
      setDragTo(null);
      setDelta({ x: 0, y: 0 });
      if (from == null || to == null) return;
      const next = moveItem(itemsRef.current, from, to);
      if (next !== itemsRef.current) onReorderRef.current(next);
    }

    function onMove(event: globalThis.PointerEvent) {
      if (pointerIdRef.current == null || event.pointerId !== pointerIdRef.current) return;
      if (dragFromRef.current == null) return;
      event.preventDefault();
      setDelta({
        x: event.clientX - startPointerRef.current.x,
        y: event.clientY - startPointerRef.current.y,
      });
      const nextTo = indexFromY(event.clientY, rectsRef.current);
      if (nextTo !== dragToRef.current) {
        dragToRef.current = nextTo;
        setDragTo(nextTo);
      }
    }

    function onUp(event: globalThis.PointerEvent) {
      if (pointerIdRef.current == null || event.pointerId !== pointerIdRef.current) return;
      finishDrag();
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  function startDrag(index: number, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const listRect = listRef.current?.getBoundingClientRect();
    listTopRef.current = listRect?.top ?? 0;
    rectsRef.current = itemRefs.current.map((el) => {
      if (!el) return { top: 0, bottom: 0 };
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });

    const el = itemRefs.current[index];
    const rect = el?.getBoundingClientRect();
    const originBox = rect
      ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      : { x: event.clientX, y: event.clientY, width: 0, height: 0 };

    pointerIdRef.current = event.pointerId;
    startPointerRef.current = { x: event.clientX, y: event.clientY };
    dragFromRef.current = index;
    dragToRef.current = index;
    setOrigin(originBox);
    setDelta({ x: 0, y: 0 });
    setDragFrom(index);
    setDragTo(index);
  }

  const dragging = dragFrom != null;
  const placeholderTop =
    dragTo != null ? (rectsRef.current[dragTo]?.top ?? 0) - listTopRef.current : 0;
  const shiftAmount = origin.height + LIST_GAP;

  return (
    <div
      ref={listRef}
      className={`relative flex flex-col gap-3 ${dragging ? 'select-none touch-none' : ''}`}
    >
      {dragging && origin.height > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 left-0 rounded-2xl border-2 border-dashed border-brand-400/50 bg-brand-500/10 transition-[top] duration-150"
          style={{ top: placeholderTop, height: origin.height }}
        />
      )}
      {items.map((item, index) => {
        const isDragging = dragFrom === index;
        const shift =
          dragFrom != null && dragTo != null
            ? shiftFor(index, dragFrom, dragTo, shiftAmount)
            : 0;
        const wrapperStyle: CSSProperties = {
          height: isDragging ? origin.height : undefined,
          zIndex: isDragging ? 2 : 1,
          transform: isDragging || shift === 0 ? undefined : `translateY(${shift}px)`,
          transition: dragging && !isDragging ? 'transform 150ms ease' : undefined,
        };
        const itemStyle: CSSProperties | undefined = isDragging
          ? {
              position: 'fixed',
              left: origin.x + delta.x,
              top: origin.y + delta.y,
              width: origin.width,
              zIndex: 80,
              transformOrigin: 'center center',
            }
          : undefined;

        return (
          <div
            key={getKey(item)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="relative"
            style={wrapperStyle}
          >
            <div
              className={
                isDragging
                  ? 'drag-lift rounded-2xl shadow-[0_22px_44px_rgb(0,0,0,0.55)] ring-2 ring-brand-400/70'
                  : undefined
              }
              style={itemStyle}
            >
              {renderItem(item, {
                onPointerDown: (event) => startDrag(index, event),
                'aria-label': 'Drag to reorder',
                'aria-grabbed': isDragging,
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
