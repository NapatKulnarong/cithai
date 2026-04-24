"use client";

import styles from "./app-shell.module.css";
import { useCithai } from "./cithai-context";
import { CompassIcon } from "./icons";
import { TrackCard } from "./track-card";

export function BrowsePage() {
  const {
    activeSong,
    browseSongs,
    getUserName,
    isLoading,
    selectedUser,
    setActiveSongId,
  } = useCithai();

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageHeaderPanel}>
        <div>
          <p className={styles.eyebrow}>Browse</p>
          <h2 className={styles.sectionTitle}>Explore what everyone else has made</h2>
          <p className={styles.pageText}>
            Browse shared songs from other accounts while keeping your own
            library separate.
          </p>
        </div>
        <div className={styles.discoveryCard}>
          <strong>{selectedUser?.name ?? "Signed-in account"}</strong>
          <span>
            Your private tracks stay out of this feed so Browse only highlights
            songs shared by other users.
          </span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Community feed</p>
            <h3 className={styles.sectionTitle}>Fresh releases from shared libraries</h3>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p>Loading Browse...</p>
          </div>
        ) : browseSongs.length ? (
          <div className={styles.songGrid}>
            {browseSongs.map((song, index) => (
              <TrackCard
                key={song.id}
                song={song}
                index={index}
                isActive={activeSong?.id === song.id}
                onSelect={setActiveSongId}
                subtitle={`${getUserName(song.user_id)} · ${song.is_shared ? "Shared" : "Private draft"}`}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CompassIcon />
            <p>There are no shared songs from other users yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
