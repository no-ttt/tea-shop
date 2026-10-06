"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./ImageLightbox.module.css";

// 拖超過圖片寬度的這個比例就換張；或快速甩動（速度超過 SWIPE_VELOCITY px/ms）也換張
const SWIPE_RATIO = 0.18;
const SWIPE_VELOCITY = 0.5;

/**
 * 商品照片燈箱：同一個商品的多張照片可左右切換（手機左右滑、電腦點箭頭或按鍵盤 ←／→，Esc 關閉）。
 * 由 Storefront 以 `{lightbox && <ImageLightbox .../>}` 條件掛載，每次打開都重新掛載，
 * 目前張數等內部狀態不需要手動重設。
 */
export default function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; time: number } | null>(null);

  const count = images.length;
  const multiple = count > 1;
  const goTo = (next: number) => setIndex(Math.max(0, Math.min(count - 1, next)));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(count - 1, i + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [count, onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!multiple) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, time: performance.now() };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    let dx = e.clientX - dragStart.current.x;
    // 第一張再往右拉、最後一張再往左拉時給阻尼，提示已經到底
    if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) dx *= 0.3;
    setDragX(dx);
  };

  const handlePointerEnd = () => {
    if (!dragStart.current) return;
    const width = trackRef.current?.offsetWidth ?? window.innerWidth;
    const elapsed = Math.max(1, performance.now() - dragStart.current.time);
    const velocity = Math.abs(dragX) / elapsed;
    if (Math.abs(dragX) > width * SWIPE_RATIO || velocity > SWIPE_VELOCITY) {
      goTo(dragX < 0 ? index + 1 : index - 1);
    }
    dragStart.current = null;
    setDragging(false);
    setDragX(0);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
        ✕
      </button>

      <div
        ref={trackRef}
        className={styles.viewport}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className={styles.track}
          style={{
            transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
            transition: dragging ? "none" : undefined,
          }}
        >
          {images.map((src, i) => (
            <div key={`${i}-${src}`} className={styles.slide} aria-hidden={i !== index}>
              <Image src={src} alt="" fill sizes="90vw" style={{ objectFit: "contain" }} draggable={false} />
            </div>
          ))}
        </div>
      </div>

      {multiple && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            disabled={index === 0}
            aria-label="上一張"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            disabled={index === count - 1}
            aria-label="下一張"
          >
            ›
          </button>
          <div className={styles.counter} onClick={(e) => e.stopPropagation()}>
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>
  );
}
