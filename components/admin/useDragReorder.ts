"use client";

import { useRef, useState } from "react";

/**
 * 後台清單的拖移排序（分區、商品、商品圖片共用）。
 *
 * 用 Pointer Events 而不是 HTML5 原生 drag & drop：原生的在手機觸控上不能用。
 * 拖動時依指標的座標跟其他項目的中線比較，算出應該插入的位置，透過 onReorder 即時回傳新順序。
 * 把手按鈕聚焦時也可以用鍵盤方向鍵移動。
 *
 * 用法：每一列外層掛 rowRef(id)，拖移把手按鈕展開 handleProps(id)；把手需設定 touch-action: none。
 * axis: "y" 上下排列的清單（預設）、"x" 左右排列（例如商品圖片縮圖）。
 */
export function useDragReorder(
  ids: string[],
  onReorder: (ids: string[]) => void,
  options: { axis?: "x" | "y" } = {},
) {
  const { axis = "y" } = options;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  // 每個 id 的 ref 回呼只建立一次，避免每次重繪都換新函式、讓 React 反覆先清空再重新登記
  const rowRefCallbacks = useRef(new Map<string, (el: HTMLElement | null) => void>());

  const moveTo = (id: string, targetIndex: number) => {
    const currentIndex = ids.indexOf(id);
    if (currentIndex === -1 || targetIndex === currentIndex) return;
    const others = ids.filter((x) => x !== id);
    onReorder([...others.slice(0, targetIndex), id, ...others.slice(targetIndex)]);
  };

  const rowRef = (id: string) => {
    let callback = rowRefCallbacks.current.get(id);
    if (!callback) {
      callback = (el: HTMLElement | null) => {
        if (el) rowRefs.current.set(id, el);
        else rowRefs.current.delete(id);
      };
      rowRefCallbacks.current.set(id, callback);
    }
    return callback;
  };

  const handleProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      // 把手裡面若還有其他按鈕（例如縮圖上的刪除 ×），按那些按鈕時不要開始拖移，
      // 否則 pointer capture 會把 click 搶走，按鈕就按不到了
      const innerButton = (e.target as HTMLElement).closest("button");
      if (innerButton && innerButton !== e.currentTarget) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingId(id);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingId !== id) return;
      let targetIndex = 0;
      for (const other of ids) {
        if (other === id) continue;
        const rect = rowRefs.current.get(other)?.getBoundingClientRect();
        if (!rect) continue;
        const passed =
          axis === "x" ? e.clientX > rect.left + rect.width / 2 : e.clientY > rect.top + rect.height / 2;
        if (passed) targetIndex++;
      }
      moveTo(id, targetIndex);
    },
    onPointerUp: () => setDraggingId(null),
    onPointerCancel: () => setDraggingId(null),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const prevKey = axis === "x" ? "ArrowLeft" : "ArrowUp";
      const nextKey = axis === "x" ? "ArrowRight" : "ArrowDown";
      if (e.key !== prevKey && e.key !== nextKey) return;
      e.preventDefault();
      const index = ids.indexOf(id);
      const target = index + (e.key === prevKey ? -1 : 1);
      if (target >= 0 && target < ids.length) moveTo(id, target);
    },
  });

  return { draggingId, rowRef, handleProps };
}
