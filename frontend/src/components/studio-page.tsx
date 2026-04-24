"use client";

import { useState } from "react";

import styles from "./app-shell.module.css";
import { genres, moods, occasions, voiceTypes } from "@/lib/choices";
import { formatDate, formatLabel } from "@/lib/song-ui";
import { useCithai } from "./cithai-context";
import { PlayControlIcon, SparkIcon, StudioIcon } from "./icons";
import { StatusBadge } from "./status-badge";
import { isSongReady } from "@/lib/song-ui";

const defaultComposer = {
  title: "Afterglow Avenue",
  custom_lyrics:
    "Neon in the rain, city lights in chorus, carry us home with a velvet pulse.",
  mood: "ENERGETIC",
  genre: "POP",
  occasion: "CUSTOM",
  voice_type: "FEMALE",
};

export function StudioPage() {
  const {
    backend,
    generateSong,
    isGenerating,
    isLoading,
    jobs,
    playSong,
    songs,
  } = useCithai();
  const [composer, setComposer] = useState(defaultComposer);

  const queue = jobs.slice(0, 8);

  return (
    <div className={styles.pageStack}>
      <section className={styles.heroPanel}>
        <span className={styles.heroModeTag}>mode · {backend.strategy}</span>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Studio</p>
          <h2 className={styles.heroTitle}>
            Turn a rough idea into a track worth sharing.
          </h2>
          <p className={styles.heroText}>
            Write a prompt, shape the sound, and bring a song to life.
          </p>
        </div>
      </section>

      <div className={styles.splitGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Create</p>
              <h3 className={styles.sectionTitle}>Compose a fresh track</h3>
            </div>
          </div>

          <form
            className={styles.formStack}
            onSubmit={async (event) => {
              event.preventDefault();
              await generateSong(composer);
            }}
          >
            <input
              className={styles.input}
              placeholder="Song title"
              value={composer.title}
              onChange={(event) =>
                setComposer((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
            />
            <textarea
              className={styles.textarea}
              placeholder="Lyrics or prompt"
              rows={6}
              value={composer.custom_lyrics}
              onChange={(event) =>
                setComposer((current) => ({
                  ...current,
                  custom_lyrics: event.target.value,
                }))
              }
            />
            <div className={styles.fieldGrid}>
              <StudioSelect
                label="Mood"
                value={composer.mood}
                options={moods}
                onChange={(value) =>
                  setComposer((current) => ({ ...current, mood: value }))
                }
              />
              <StudioSelect
                label="Genre"
                value={composer.genre}
                options={genres}
                onChange={(value) =>
                  setComposer((current) => ({ ...current, genre: value }))
                }
              />
              <StudioSelect
                label="Occasion"
                value={composer.occasion}
                options={occasions}
                onChange={(value) =>
                  setComposer((current) => ({ ...current, occasion: value }))
                }
              />
              <StudioSelect
                label="Voice"
                value={composer.voice_type}
                options={voiceTypes}
                onChange={(value) =>
                  setComposer((current) => ({ ...current, voice_type: value }))
                }
              />
            </div>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate song"}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Queue</p>
              <h3 className={styles.sectionTitle}>Watch jobs land</h3>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.emptyState}>
              <div className={styles.spinner} />
              <p>Loading Studio queue...</p>
            </div>
          ) : queue.length ? (
            <div className={styles.queueList}>
              {queue.map((job) => {
                const song = songs.find((item) => item.generation_job_id === job.id);
                const readySong = song && isSongReady(song) ? song : null;

                return (
                  <div key={job.id} className={styles.queueCard}>
                    <div className={styles.queueCopy}>
                      <p className={styles.queueTitle}>{song?.title ?? `Generation #${job.id}`}</p>
                      <div className={styles.queueTags}>
                        <span className={styles.queueTag}>
                          Generated {formatDate(job.created_at)}
                        </span>
                        <span className={styles.queueTag}>Job #{job.id}</span>
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                    {readySong ? (
                      <button
                        type="button"
                        className={styles.queuePlayButton}
                        aria-label={`Play ${readySong.title}`}
                        title="Play"
                        onClick={() => playSong(readySong.id)}
                      >
                        <PlayControlIcon />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <StudioIcon />
              <p>Your persisted generation queue will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StudioSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
