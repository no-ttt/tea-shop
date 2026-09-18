"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./CustomSelect.module.css";

export interface CustomSelectOption {
  value: string;
  label: string;
}

/**
 * 取代原生 <select>：瀏覽器展開下拉選單時顯示的選項面板是作業系統原生渲染的彈出層，
 * 絕大多數瀏覽器（含 macOS Chrome）不允許網頁 CSS 控制它的圓角/背景/陰影，
 * 所以要讓選項清單跟頁面風格一致，只能自己畫（參考 ../index.html 的 custom-select 實作）。
 *
 * 展開面板用 position: fixed（而非原本的 absolute）並在展開時即時計算按鈕在畫面上的座標：
 * absolute 定位會被任何有 overflow: auto/hidden 的祖先容器（例如後台訂單表格外層的橫向
 * 捲動容器）裁切掉，這個元件不該預設自己一定不會被放進那種容器裡。展開後捲動頁面會直接
 * 關閉面板（而不是讓它跟著捲動），做法簡單且不會有位置算錯的風險。
 */
export default function CustomSelect({
  value,
  options,
  onChange,
  className,
  disabled,
}: {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPanelStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handlePointerDown);
    // capture: true 才能收到表格橫向捲動容器等內層元素的 scroll 事件（那些不會冒泡到 window）。
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${open ? styles.wrapOpen : ""} ${className ?? ""}`}>
      <button
        ref={btnRef}
        type="button"
        className={styles.btn}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {current?.label ?? ""}
      </button>
      {open && panelStyle && (
        <div
          className={styles.panel}
          style={{ position: "fixed", top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`${styles.option} ${opt.value === value ? styles.optionSelected : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
