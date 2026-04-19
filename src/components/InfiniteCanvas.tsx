import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface InfiniteCanvasHandle {
  screenToWorld: (clientX: number, clientY: number) => { x: number; y: number };
  recenter: () => void;
  zoomBy: (factor: number) => void;
  getTransform: () => ViewTransform;
}

interface Props {
  children: React.ReactNode;
  onTransformChange?: (t: ViewTransform) => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, Props>(
  ({ children, onTransformChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [t, setT] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
    const panRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

    useEffect(() => {
      onTransformChange?.(t);
    }, [t, onTransformChange]);

    useImperativeHandle(ref, () => ({
      screenToWorld: (clientX, clientY) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
          x: (clientX - rect.left - t.x) / t.scale,
          y: (clientY - rect.top - t.y) / t.scale,
        };
      },
      recenter: () => setT({ x: 0, y: 0, scale: 1 }),
      zoomBy: (factor) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
        const f = newScale / t.scale;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        setT({ scale: newScale, x: cx - (cx - t.x) * f, y: cy - (cy - t.y) * f });
      },
      getTransform: () => t,
    }));

    const onWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const delta = -e.deltaY * 0.0015;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (1 + delta)));
      const factor = newScale / t.scale;
      // zoom toward cursor
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setT({
        scale: newScale,
        x: cx - (cx - t.x) * factor,
        y: cy - (cy - t.y) * factor,
      });
    };

    const onPointerDown = (e: React.PointerEvent) => {
      // Only pan when starting on the canvas background (not a note)
      if ((e.target as HTMLElement).closest("[data-note]")) return;
      if (e.button !== 0 && e.button !== 1) return;
      panRef.current = { startX: e.clientX, startY: e.clientY, ox: t.x, oy: t.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
      if (!panRef.current) return;
      setT((prev) => ({
        ...prev,
        x: panRef.current!.ox + (e.clientX - panRef.current!.startX),
        y: panRef.current!.oy + (e.clientY - panRef.current!.startY),
      }));
    };

    const onPointerUp = () => {
      panRef.current = null;
    };

    return (
      <div
        ref={containerRef}
        className="cork-board absolute inset-0 overflow-hidden"
        style={{ cursor: panRef.current ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
            width: 1,
            height: 1,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

InfiniteCanvas.displayName = "InfiniteCanvas";
