import Image from "next/image";
import type { Region } from "@/lib/types";
import styles from "./RegionBackground.module.css";

export default function RegionBackground({ region }: { region: Region }) {
  return (
    <div className={styles.bgLayer}>
      <Image
        src={region.bgImage}
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: region.bgPos }}
        className={styles.desktopImage}
      />
      <Image
        src={region.bgImageMobile}
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: region.bgPos }}
        className={styles.mobileImage}
      />
      <div className={styles.overlay} />
    </div>
  );
}
