"use client";

import { useState } from "react";
import styles from "./adminShared.module.css";

export default function OrdersAdminView() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [showCode, setShowCode] = useState(false);

  return (
    <div>
      <h1 className={styles.pageTitle}>購買紀錄</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>訂單記錄表設定</h3>
        <div className={styles.field}>
          <label>Google 試算表連結網址（Apps Script Web App 網址）</label>
          <input className={styles.input} placeholder="https://script.google.com/macros/s/xxxxxxx/exec" />
        </div>
        <button type="button" className={styles.button} disabled title="尚未串接後端，此功能即將推出">
          儲存
        </button>
        <p className={styles.helpText}>
          這個功能需要先設定一個免費的 Google 試算表當作訂單記錄本，客人每筆訂單都會自動寫入一列進去，
          之後就能在這裡依日期查詢、匯出 Excel。設定方式：
          <br />
          1. 到 Google 試算表（sheets.google.com）建立一份新的空白試算表，取個名字例如「棋願製造訂單記錄」
          <br />
          2. 上方選單「擴充功能」→「Apps Script」，會開啟一個程式碼編輯畫面
          <br />
          3. 把畫面清空，貼上我準備好的程式碼（見下方「Apps Script 程式碼」，可以直接複製）
          <br />
          4. 右上角「部署」→「新增部署作業」→ 類型選「網頁應用程式」
          <br />
          5. 「具有存取權的使用者」選「所有人」，「執行身分」選「我」，然後按「部署」
          <br />
          6. 第一次會跳出 Google 授權畫面，選你自己的帳號並允許權限
          <br />
          7. 部署完成後會出現一個網址（結尾是 /exec），複製它貼到上面欄位並按「儲存」
          <br />
          8. 這樣客人送出訂單時，就會自動把訂單明細寫進你的 Google 試算表裡了
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={styles.buttonSecondary} onClick={() => setShowCode((v) => !v)}>
            顯示 Apps Script 程式碼
          </button>
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled
            title="尚未串接後端，此功能即將推出"
          >
            測試連線
          </button>
        </div>
        {showCode && (
          <div style={{ marginTop: 12 }}>
            <textarea className={styles.textareaCode} readOnly />
            <button type="button" className={styles.buttonSecondary} style={{ marginTop: 8 }}>
              複製程式碼
            </button>
          </div>
        )}
      </div>

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
