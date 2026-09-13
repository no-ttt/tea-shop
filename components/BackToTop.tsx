"use client";

import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import styles from "./BackToTop.module.css";

export default function BackToTop() {
  const visible = useScrollVisibility(400);

  return (
    <button
      type="button"
      className={`${styles.btn} ${visible ? styles.visible : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="回到頂部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      ↑
    </button>
  );
}
