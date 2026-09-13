"use client";

import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import styles from "./ScrollToCart.module.css";

export default function ScrollToCart() {
  const visible = useScrollVisibility(400);

  return (
    <button
      type="button"
      className={`${styles.btn} ${visible ? styles.visible : ""}`}
      onClick={() =>
        document.getElementById("cart-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      aria-label="前往結帳"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      🛒
    </button>
  );
}
