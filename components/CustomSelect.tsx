"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CustomSelect.module.css";

export interface CustomSelectOption {
  value: string;
  label: string;
}

/**
 * 取代原生 <select>：瀏覽器展開下拉選單時顯示的選項面板是作業系統原生渲染的彈出層，
 * 絕大多數瀏覽器（含 macOS Chrome）不允許網頁 CSS 控制它的圓角/背景/陰影，
 * 所以要讓選項清單跟頁面風格一致，只能自己畫（參考 ../index.html 的 custom-select 實作）。
 */
export default function CustomSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${open ? styles.wrapOpen : ""} ${className ?? ""}`}>
      <button type="button" className={styles.btn} onClick={() => setOpen((v) => !v)}>
        {current?.label ?? ""}
      </button>
      {open && (
        <div className={styles.panel}>
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
