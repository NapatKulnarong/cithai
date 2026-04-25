import type { KeyboardEvent } from "react";

import type { Song } from "@/lib/types";
import {
  buildArtworkStyle,
  formatDate,
  formatLabel,
  getSongDisplayStatus,
} from "@/lib/song-ui";

import styles from "./app-shell.module.css";
import { DeleteIcon, PlayControlIcon, ShareIcon, PublicIcon, PrivateIcon } from "./icons";
import { StatusBadge } from "./status-badge";

export function TrackCard({
  song,
  index,
  isActive,
  onSelect,
  onPlay,
  onShare,
  onDelete,
  onTogglePublic,
  showStatus = true,
  subtitle,
  isEditing,
}: {
  song: Song;
  index: number;
  isActive: boolean;
  onSelect: (songId: number) => void;
  onPlay?: (songId: number) => unknown;
  onShare?: (songId: number) => unknown;
  onDelete?: (songId: number) => unknown;
  onTogglePublic?: (songId: number, isPublic: boolean) => unknown;
  showStatus?: boolean;
  subtitle?: string;
  isEditing?: boolean;
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
      
      <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, display: "flex", gap: "8px" }}>
        {onTogglePublic ? (
          <button
            type="button"
            className={styles.songActionButton}
            style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            aria-label={song.is_public ? "Make Private" : "Make Public"}
            title={song.is_public ? "Make Private" : "Make Public"}
            onClick={(event) => {
              event.stopPropagation();
              void onTogglePublic(song.id, !song.is_public);
            }}
          >
            {song.is_public ? <PublicIcon /> : <PrivateIcon />}
          </button>
        ) : null}
        {isEditing && onDelete ? (
          <button
            type="button"
            className={`${styles.songActionButton} ${styles.songActionButtonDanger}`}
            style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
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

          </div>
        </div>
      </div>
    </div>
  );
}
