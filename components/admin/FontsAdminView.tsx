"use client";

import { useState } from "react";
import styles from "./adminShared.module.css";

const DEFAULT_COLOR_TITLE = "#f3ede1";
const DEFAULT_COLOR_ITEM = "#f3ede1";
const DEFAULT_COLOR_PRICE = "#c98a4b";
const DEFAULT_COLOR_COMINGSOON = "#c9bfa8";

export default function FontsAdminView() {
  const [scaleTitle, setScaleTitle] = useState(1);
  const [scaleItem, setScaleItem] = useState(1);
  const [scalePrice, setScalePrice] = useState(1);

  const [colorTitle, setColorTitle] = useState(DEFAULT_COLOR_TITLE);
  const [colorItem, setColorItem] = useState(DEFAULT_COLOR_ITEM);
  const [colorPrice, setColorPrice] = useState(DEFAULT_COLOR_PRICE);
  const [colorComingsoon, setColorComingsoon] = useState(DEFAULT_COLOR_COMINGSOON);

  const resetColors = () => {
    setColorTitle(DEFAULT_COLOR_TITLE);
    setColorItem(DEFAULT_COLOR_ITEM);
    setColorPrice(DEFAULT_COLOR_PRICE);
    setColorComingsoon(DEFAULT_COLOR_COMINGSOON);
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>文字大小</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>文字大小調整</h3>

        <div className={styles.sliderRow}>
          <label>分頁大標題</label>
          <input
            type="range"
            min={0.7}
            max={1.6}
            step={0.05}
            value={scaleTitle}
            onChange={(e) => setScaleTitle(Number(e.target.value))}
          />
          <span className={styles.sliderVal}>{scaleTitle.toFixed(2).replace(/\.?0+$/, "")}x</span>
        </div>

        <div className={styles.sliderRow}>
          <label>茶品名稱</label>
          <input
            type="range"
            min={0.7}
            max={1.6}
            step={0.05}
            value={scaleItem}
            onChange={(e) => setScaleItem(Number(e.target.value))}
          />
          <span className={styles.sliderVal}>{scaleItem.toFixed(2).replace(/\.?0+$/, "")}x</span>
        </div>

        <div className={styles.sliderRow}>
          <label>價格數字</label>
          <input
            type="range"
            min={0.7}
            max={1.6}
            step={0.05}
            value={scalePrice}
            onChange={(e) => setScalePrice(Number(e.target.value))}
          />
          <span className={styles.sliderVal}>{scalePrice.toFixed(2).replace(/\.?0+$/, "")}x</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>文字顏色調整</h3>

        <div className={styles.sliderRow}>
          <label>分頁大標題顏色</label>
          <input
            type="color"
            className={styles.colorSwatch}
            value={colorTitle}
            onChange={(e) => setColorTitle(e.target.value)}
          />
        </div>
        <div className={styles.sliderRow}>
          <label>茶品名稱顏色</label>
          <input
            type="color"
            className={styles.colorSwatch}
            value={colorItem}
            onChange={(e) => setColorItem(e.target.value)}
          />
        </div>
        <div className={styles.sliderRow}>
          <label>價格數字顏色</label>
          <input
            type="color"
            className={styles.colorSwatch}
            value={colorPrice}
            onChange={(e) => setColorPrice(e.target.value)}
          />
        </div>
        <div className={styles.sliderRow}>
          <label>「棋願製造中」顏色</label>
          <input
            type="color"
            className={styles.colorSwatch}
            value={colorComingsoon}
            onChange={(e) => setColorComingsoon(e.target.value)}
          />
        </div>

        <button type="button" className={styles.buttonSecondary} onClick={resetColors}>
          還原成預設顏色
        </button>
        <p className={styles.helpText}>
          目前為預覽功能，尚未串接實際套用與儲存，關閉頁面後調整內容不會保留。
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>即時預覽</h3>
        <div className={styles.previewBox}>
          <div
            className={styles.previewTitle}
            style={{ fontSize: `${20 * scaleTitle}px`, color: colorTitle }}
          >
            THE NEW
          </div>
          <div
            className={styles.previewItem}
            style={{ fontSize: `${15.5 * scaleItem}px`, color: colorItem }}
          >
            2026春 高山烏龍 種 球形包種茶
          </div>
          <div className={styles.previewPrice}>
            30g <b style={{ fontSize: `${16 * scalePrice}px`, color: colorPrice }}>$680</b>
          </div>
          <div>
            <span className={styles.previewTag} style={{ color: colorComingsoon, borderColor: colorComingsoon }}>
              棋願製造中
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
