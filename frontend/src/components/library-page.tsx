"use client";

import { useState, useMemo } from "react";

import styles from "./app-shell.module.css";
import { useCithai } from "./cithai-context";
import { LibraryIcon } from "./icons";
import { getSongDisplayStatus } from "@/lib/song-ui";
import { TrackCard } from "./track-card";

type SortKey = "newest" | "oldest" | "title_asc" | "title_desc";

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
    togglePublic,
    sharedCount,
  } = useCithai();
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const filteredSongs = useMemo(() => {
    let result = librarySongs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((song) => song.title.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
      }
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
  }, [librarySongs, searchQuery, sortBy]);

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
          <LibraryMetric label="Shared" value={sharedCount} />
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>
              {selectedUser?.name ?? "Your"} catalog
            </p>
            <h3 className={styles.sectionTitle}>Your public & private tracks</h3>
          </div>
          <div className={styles.toolbar} style={{ flexWrap: "nowrap" }}>
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.input}
              style={{ minHeight: "42px", flex: 1, minWidth: "150px", padding: "0 12px", width: "auto" }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className={styles.select}
              style={{ minHeight: "42px", flexShrink: 0, width: "auto", padding: "0 12px" }}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="title_asc">Sort: Title (A-Z)</option>
              <option value="title_desc">Sort: Title (Z-A)</option>
            </select>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                minHeight: "42px",
                padding: "0 16px",
                borderRadius: "12px",
                backgroundColor: isEditing ? "var(--shell-accent-strong)" : "transparent",
                color: isEditing ? "#fff" : "var(--shell-text)",
                border: `1px solid ${isEditing ? "var(--shell-accent-strong)" : "rgba(255, 255, 255, 0.1)"}`,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
                transition: "all 0.2s",
                flexShrink: 0
              }}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
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
                onTogglePublic={togglePublic}
                isEditing={isEditing}
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
