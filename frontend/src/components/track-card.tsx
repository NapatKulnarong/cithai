import type { KeyboardEvent } from "react";

import type { Song } from "@/lib/types";
import {
  buildArtworkStyle,
  formatDate,
  formatLabel,
  getSongDisplayStatus,
} from "@/lib/song-ui";

import styles from "./app-shell.module.css";
import { DeleteIcon, PlayControlIcon, ShareIcon } from "./icons";
import { StatusBadge } from "./status-badge";

export function TrackCard({
  song,
  index,
  isActive,
  onSelect,
  onPlay,
  onShare,
  onDelete,
  showStatus = true,
  subtitle,
}: {
  song: Song;
  index: number;
  isActive: boolean;
  onSelect: (songId: number) => void;
  onPlay?: (songId: number) => unknown;
  onShare?: (songId: number) => unknown;
  onDelete?: (songId: number) => unknown;
  showStatus?: boolean;
  subtitle?: string;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(song.id);
    }
  }

  return (
    <div
      className={`${styles.songCard} ${isActive ? styles.songCardActive : ""}`}
      onClick={() => onSelect(song.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={song.title}
      style={buildArtworkStyle(song, index)}
    >
      <div className={styles.songArtwork}>
        <div className={styles.songArtworkGlow} />
        <div className={styles.songArtworkMeta}>
          <span>{formatLabel(song.mood)}</span>
          <span>{formatLabel(song.genre)}</span>
        </div>
      </div>
      <div className={styles.songInfo}>
        <div>
          <h4>{song.title}</h4>
          <p>
            {subtitle ??
              `${formatLabel(song.occasion)} · ${formatLabel(song.voice_type)}`}
          </p>
        </div>
        <div
          className={`${styles.songFooter} ${
            showStatus ? "" : styles.songFooterCompact
          }`}
        >
          {showStatus ? <StatusBadge status={getSongDisplayStatus(song)} /> : null}
          <div className={styles.songFooterActions}>
            <span>{formatDate(song.creation_date)}</span>
            {onPlay ? (
              <button
                type="button"
                className={styles.songActionButton}
                aria-label={`Play ${song.title}`}
                title="Play"
                onClick={(event) => {
                  event.stopPropagation();
                  void onPlay(song.id);
                }}
              >
                <PlayControlIcon />
              </button>
            ) : null}
            {onShare ? (
              <button
                type="button"
                className={styles.songActionButton}
                aria-label={`Share ${song.title}`}
                title="Share"
                onClick={(event) => {
                  event.stopPropagation();
                  void onShare(song.id);
                }}
              >
                <ShareIcon />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className={`${styles.songActionButton} ${styles.songActionButtonDanger}`}
                aria-label={`Delete ${song.title}`}
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  void onDelete(song.id);
                }}
              >
                <DeleteIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
