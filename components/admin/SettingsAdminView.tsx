"use client";

import { useState } from "react";
import styles from "./adminShared.module.css";

export default function SettingsAdminView() {
  const [newPassword, setNewPassword] = useState("");

  return (
    <div>
      <h1 className={styles.pageTitle}>其他設定</h1>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>儲存空間使用量</h3>
        <div className={styles.storageBar}>
          <div className={styles.storageFill} style={{ width: "3%" }} />
        </div>
        <p className={styles.helpText}>目前約使用 0.15 MB（估計值，約佔瀏覽器容量上限的 3%）</p>
        <p className={styles.helpText}>
          這裡顯示的是網站設定資料（品項文字、價格等）的用量，通常不會滿。
          商品圖片和底圖已經改存到瀏覽器另一個容量大很多的空間（IndexedDB），
          一般不會遇到空間不足的問題；如果裝置本身硬碟空間就很吃緊，才可能碰到上限。
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>訂單通知</h3>
        <div className={styles.field}>
          <label>Formspree 表單網址（客人送出訂單時會把資料寄到你設定的信箱）</label>
          <input className={styles.input} placeholder="https://formspree.io/f/xxxxxxx" />
        </div>
        <button type="button" className={styles.button} disabled title="尚未串接後端，此功能即將推出">
          儲存
        </button>
        <p className={styles.helpText}>
          設定方式：
          <br />
          1. 到 https://formspree.io 免費註冊帳號
          <br />
          2. 建立一個新表單（New Form），填入你要收訂單通知的信箱
          <br />
          3. 複製它給你的表單網址（長得像 https://formspree.io/f/xxxxxxx）
          <br />
          4. 貼到上面欄位並按「儲存」，客人送出訂單後你的信箱就會收到通知信
          <br />
          <br />
          想讓客人也自動收到一份訂貨單副本：
          <br />
          5. 到 Formspree 後台該表單的 Plugins（或 Workflow → Actions）分頁，加入 Autoresponse 功能
          <br />
          6. 自訂客人會收到的信件標題與內容（例如「已收到您的訂單」），存檔即可
          <br />
          7. 之後客人送出訂單，會自動收到一封來自 Formspree 的確認信到他填寫的電子郵件
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>LINE Pay 收款 QR Code</h3>
        <p className={styles.helpText}>
          客人結帳選擇「LINE Pay」時會顯示這張 QR Code，讓客人用 LINE App 掃碼付款給你。
          之後如果要換一張新的收款碼（例如金額固定碼改成不限金額碼），可以在這裡重新上傳。
        </p>
        <input type="file" accept="image/*" className={styles.input} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>修改後台密碼</h3>
        <div className={styles.field}>
          <input
            type="password"
            className={styles.input}
            placeholder="輸入新密碼"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.button}
          disabled
          style={{ opacity: 0.5, cursor: "not-allowed" }}
          title="尚未串接後端，此功能即將推出"
        >
          更新密碼
        </button>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>重置</h3>
        <button
          type="button"
          className={styles.buttonDanger}
          disabled
          title="尚未串接後端，此功能即將推出"
        >
          還原成最初的預設內容
        </button>
        <p className={styles.helpText}>會清除所有在本機瀏覽器做過的修改，恢復成這個檔案原本內建的資料。</p>
      </div>
    </div>
  );
}
