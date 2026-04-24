import styles from "./app-shell.module.css";
import { formatLabel } from "@/lib/song-ui";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`}>
      {formatLabel(status)}
    </span>
  );
}
