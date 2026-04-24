"use client";

import { useState } from "react";

import styles from "./app-shell.module.css";
import { useCithai } from "./cithai-context";
import { LibraryIcon } from "./icons";
import { getSongDisplayStatus } from "@/lib/song-ui";
import { TrackCard } from "./track-card";

type FilterKey = "all" | "ready" | "creating" | "shared";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All songs" },
  { key: "ready", label: "Ready" },
  { key: "creating", label: "Queue" },
  { key: "shared", label: "Shared" },
];

export function LibraryPage() {
  const {
    activeSong,
    completedCount,
    isLoading,
    librarySongs,
    pendingCount,
    selectedUser,
    setActiveSongId,
    playSong,
    shareSong,
    deleteSong,
    sharedCount,
  } = useCithai();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredSongs = librarySongs.filter((song) => {
    const displayStatus = getSongDisplayStatus(song);

    if (filter === "ready") {
      return displayStatus === "COMPLETE";
    }
    if (filter === "creating") {
      return displayStatus === "PENDING" || displayStatus === "PROCESSING";
    }
    if (filter === "shared") {
      return song.is_shared;
    }
    return true;
  });

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageHeaderPanel}>
        <div>
          <p className={styles.eyebrow}>Library</p>
          <h2 className={styles.sectionTitle}>A calmer space for finished work</h2>
          <p className={styles.pageText}>
            Review your catalog without the Studio controls in the way.
          </p>
        </div>
        <div className={styles.metricRow}>
          <LibraryMetric label="Tracks" value={librarySongs.length} />
          <LibraryMetric label="Ready" value={completedCount} />
          <LibraryMetric label="Queue" value={pendingCount} />
          <LibraryMetric label="Shared" value={sharedCount} />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>
              {selectedUser?.name ?? "Your"} catalog
            </p>
            <h3 className={styles.sectionTitle}>Browse by status</h3>
          </div>
          <div className={styles.filterBar}>
            {filters.map((filterOption) => (
              <button
                key={filterOption.key}
                type="button"
                className={`${styles.filterChip} ${
                  filter === filterOption.key ? styles.filterChipActive : ""
                }`}
                onClick={() => setFilter(filterOption.key)}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p>Loading library...</p>
          </div>
        ) : filteredSongs.length ? (
          <div className={styles.songGrid}>
            {filteredSongs.map((song, index) => (
              <TrackCard
                key={song.id}
                song={song}
                index={index}
                isActive={activeSong?.id === song.id}
                onSelect={setActiveSongId}
                onPlay={playSong}
                showStatus={false}
                onShare={shareSong}
                onDelete={async (songId) => {
                  const nextSong = filteredSongs.find((item) => item.id === songId);

                  if (
                    typeof window !== "undefined" &&
                    nextSong &&
                    !window.confirm(`Delete "${nextSong.title}" from your library?`)
                  ) {
                    return;
                  }

                  await deleteSong(songId);
                }}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <LibraryIcon />
            <p>No songs match this filter in your library.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function LibraryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metricCardWide}>
      <span>{label}</span>
      <strong>{String(value).padStart(2, "0")}</strong>
    </div>
  );
}
