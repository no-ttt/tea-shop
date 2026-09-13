import type { Region } from "@/lib/types";
import styles from "./RegionTabs.module.css";

export default function RegionTabs({
  regions,
  currentRegion,
  onSelect,
}: {
  regions: Region[];
  currentRegion: string;
  onSelect: (regionId: string) => void;
}) {
  return (
    <div className={styles.tabs}>
      {regions.map((region) => (
        <button
          key={region.id}
          type="button"
          className={`${styles.tab} ${region.id === currentRegion ? styles.active : ""}`}
          onClick={() => onSelect(region.id)}
        >
          {region.title}
        </button>
      ))}
    </div>
  );
}
