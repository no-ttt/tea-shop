"use client";

import { useState } from "react";
import styles from "./adminShared.module.css";

export default function OrdersAdminView() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <div>
      <h1 className={styles.pageTitle}>購買紀錄</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>查詢購買紀錄</h3>
        <div className={styles.toolbar}>
          <div className={styles.field} style={{ marginBottom: 0 }}>
            <label>開始日期</label>
            <input
              type="date"
              className={styles.input}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ marginBottom: 0 }}>
            <label>結束日期</label>
            <input
              type="date"
              className={styles.input}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.toolbar}>
          <button type="button" className={styles.button} disabled title="尚未串接後端，此功能即將推出">
            查詢
          </button>
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled
            title="尚未串接後端，此功能即將推出"
          >
            匯出 Excel
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>購買日期</th>
                <th>客戶姓名</th>
                <th>品項</th>
                <th>克數</th>
                <th>數量</th>
                <th>單項金額</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
        <div className={styles.emptyState}>選擇日期區間後點擊查詢</div>
      </div>
    </div>
  );
}
