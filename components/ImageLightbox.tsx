import Image from "next/image";
import styles from "./ImageLightbox.module.css";

export default function ImageLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
        ✕
      </button>
      <div className={styles.imageWrap} onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt="" fill sizes="90vw" style={{ objectFit: "contain" }} />
      </div>
    </div>
  );
}
