import styles from "./ContactButton.module.css";

const CONTACT_EMAIL = "qi.wish.maker@gmail.com";

export default function ContactButton() {
  return (
    <a
      className={styles.btn}
      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("棋願製造 客服詢問")}`}
      aria-label={`聯繫客服：${CONTACT_EMAIL}`}
      title={`聯繫客服：${CONTACT_EMAIL}`}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
        <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
      </svg>
    </a>
  );
}
