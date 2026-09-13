"use client";

import { useState } from "react";
import Image from "next/image";
import type { Region } from "@/lib/types";
import styles from "./adminShared.module.css";

export default function RegionAdminList({ regions }: { regions: Region[] }) {
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div>
      <h1 className={styles.pageTitle}>分區與底圖</h1>

      <div className={styles.section}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.button} onClick={() => setAddingNew((v) => !v)}>
            {addingNew ? "取消新增" : "＋ 新增分區"}
          </button>
        </div>

        {addingNew && (
          <div className={`${styles.card} ${styles.cardEditing}`}>
            <RegionForm onCancel={() => setAddingNew(false)} />
          </div>
        )}

        {regions.map((region) => (
          <RegionCard key={region.id} region={region} />
        ))}
      </div>
    </div>
  );
}

function RegionCard({ region }: { region: Region }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className={`${styles.card} ${styles.cardEditing}`}>
        <RegionForm region={region} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div style={{ fontWeight: 700 }}>{region.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
            {region.subtitle}
          </div>
          {region.note && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{region.note}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className={styles.buttonSecondary} onClick={() => setEditing(true)}>
            編輯
          </button>
          <button
            type="button"
            className={styles.buttonDanger}
            disabled
            title="尚未串接後端，此功能即將推出"
          >
            刪除
          </button>
        </div>
      </div>

      <p className={styles.helpText} style={{ marginTop: 12, marginBottom: 6 }}>
        電腦版底圖預覽
      </p>
      <div className={styles.bgPreview}>
        <Image src={region.bgImage} alt={`${region.title} 桌機底圖`} fill sizes="480px" />
      </div>

      <p className={styles.helpText} style={{ marginTop: 8, marginBottom: 6 }}>
        手機版底圖預覽
      </p>
      <div className={styles.bgPreview}>
        <Image src={region.bgImageMobile} alt={`${region.title} 手機底圖`} fill sizes="480px" />
      </div>
    </div>
  );
}

function RegionForm({ region, onCancel }: { region?: Region; onCancel: () => void }) {
  return (
    <div>
      <div className={styles.field}>
        <label>標題</label>
        <input className={styles.input} defaultValue={region?.title} />
      </div>

      <div className={styles.field}>
        <label>副標題</label>
        <input className={styles.input} defaultValue={region?.subtitle} />
      </div>

      <div className={styles.field}>
        <label>備註</label>
        <input className={styles.input} defaultValue={region?.note ?? ""} />
      </div>

      <div className={styles.field}>
        <label>1. 電腦版底圖（上傳橫幅、寬螢幕用的圖片）</label>
        {region && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={region.bgImage} alt={`${region.title} 桌機底圖目前預覽`} fill sizes="480px" />
          </div>
        )}
        <input type="file" accept="image/*" className={styles.input} />
      </div>
      <div className={styles.field}>
        <label>2. 手機版底圖（上傳直式、手機螢幕用的圖片）</label>
        {region && (
          <div className={styles.bgPreview} style={{ marginBottom: 6 }}>
            <Image src={region.bgImageMobile} alt={`${region.title} 手機底圖目前預覽`} fill sizes="480px" />
          </div>
        )}
        <input type="file" accept="image/*" className={styles.input} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="button" className={styles.button} disabled title="尚未串接後端，此功能即將推出">
          {region ? "儲存變更" : "新增分區"}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
