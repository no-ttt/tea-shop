"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/data";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import styles from "./adminShared.module.css";

const DEFAULT_SCALE = 1;
const DEFAULT_COLOR_TITLE = "#f3ede1";
const DEFAULT_COLOR_ITEM = "#f3ede1";
const DEFAULT_COLOR_PRICE = "#c98a4b";
const DEFAULT_COLOR_COMINGSOON = "#c9bfa8";

export default function FontsAdminView({
  theme,
  comingSoonColor,
  comingSoonStatusId,
}: {
  theme: SiteSettings["theme"];
  comingSoonColor: string;
  comingSoonStatusId: string | null;
}) {
  const router = useRouter();

  const [scaleTitle, setScaleTitle] = useState(theme.scaleTitle);
  const [scaleItem, setScaleItem] = useState(theme.scaleItem);
  const [scalePrice, setScalePrice] = useState(theme.scalePrice);

  const [colorTitle, setColorTitle] = useState(theme.colorTitle);
  const [colorItem, setColorItem] = useState(theme.colorItem);
  const [colorPrice, setColorPrice] = useState(theme.colorPrice);
  const [colorComingsoon, setColorComingsoon] = useState(comingSoonColor);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const resetScales = () => {
    setScaleTitle(DEFAULT_SCALE);
    setScaleItem(DEFAULT_SCALE);
    setScalePrice(DEFAULT_SCALE);
  };

  const resetColors = () => {
    setColorTitle(DEFAULT_COLOR_TITLE);
    setColorItem(DEFAULT_COLOR_ITEM);
    setColorPrice(DEFAULT_COLOR_PRICE);
    setColorComingsoon(DEFAULT_COLOR_COMINGSOON);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const settingsRes = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "theme.scaleTitle": scaleTitle,
          "theme.scaleItem": scaleItem,
          "theme.scalePrice": scalePrice,
          "theme.colorTitle": colorTitle,
          "theme.colorItem": colorItem,
          "theme.colorPrice": colorPrice,
        }),
      });
      if (!settingsRes.ok) {
        setError(await parseErrorMessage(settingsRes, "儲存失敗"));
        setSaving(false);
        return;
      }

      if (comingSoonStatusId) {
        const statusRes = await fetch(`/api/admin/statuses/${comingSoonStatusId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: colorComingsoon }),
        });
        if (!statusRes.ok) {
          setError(await parseErrorMessage(statusRes, "儲存失敗"));
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setSaved(true);
      router.refresh();
    } catch {
      setError("儲存失敗，請確認網路連線");
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className={styles.pageTitle}>文字大小</h1>
        <button type="button" className={styles.button} onClick={handleSave} disabled={saving}>
          {saving ? "儲存中…" : "儲存變更"}
        </button>
      </div>

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

        <button type="button" className={styles.buttonSecondary} onClick={resetScales}>
          還原成預設大小
        </button>
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

      {error && (
        <p className={styles.helpText} style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className={styles.helpText} style={{ color: "#2e7d32" }}>
          已儲存
        </p>
      )}
    </div>
  );
}
