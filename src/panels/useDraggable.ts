import { useRef, useState } from "react";

/** Makes a floating panel draggable by a handle. Returns the current position
 *  and an `onPointerDown` to attach to the drag handle (title bar). Ignores
 *  drags that start on interactive elements (buttons/inputs/sliders). */
export function useDraggable(initialX: number, initialY: number) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
    start.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    setDragging(true);
    document.body.style.userSelect = "none"; // don't select page text while dragging
    document.body.style.cursor = "grabbing";
    const onMove = (ev: PointerEvent) => {
      if (!start.current) return;
      const nx = start.current.ox + (ev.clientX - start.current.px);
      const ny = start.current.oy + (ev.clientY - start.current.py);
      setPos({
        x: Math.min(window.innerWidth - 80, Math.max(0, nx)),
        y: Math.min(window.innerHeight - 40, Math.max(0, ny)),
      });
    };
    const onUp = () => {
      start.current = null;
      setDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return { pos, dragging, onPointerDown };
}

/** Makes a panel resizable via a corner handle. Returns the current size and an
 *  `onPointerDown` to attach to the resize handle. `maxW` defaults to 1100 but
 *  can be raised for wide panels (e.g. the world table's many columns). */
export function useResizable(initialW: number, initialH: number, maxW = 1100) {
  const [size, setSize] = useState({ w: initialW, h: initialH });
  const start = useRef<{ px: number; py: number; ow: number; oh: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    start.current = { px: e.clientX, py: e.clientY, ow: size.w, oh: size.h };
    document.body.style.userSelect = "none"; // don't select page text while resizing
    document.body.style.cursor = "nwse-resize";
    const onMove = (ev: PointerEvent) => {
      if (!start.current) return;
      setSize({
        w: Math.min(maxW, Math.max(320, start.current.ow + (ev.clientX - start.current.px))),
        h: Math.min(window.innerHeight - 32, Math.max(300, start.current.oh + (ev.clientY - start.current.py))),
      });
    };
    const onUp = () => {
      start.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return { size, onPointerDown };
}
