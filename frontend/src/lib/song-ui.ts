import type { CSSProperties } from "react";

import type { GenerationStatus, Song } from "./types";

export function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCount(value: number) {
  return value.toFixed(value >= 10 ? 0 : 1);
}

export function getSongDisplayStatus(song: Song): GenerationStatus {
  if (song.status === "COMPLETE" && !song.audio_file_path) {
    return "PROCESSING";
  }

  return song.status;
}

export function isSongReady(song: Song) {
  return getSongDisplayStatus(song) === "COMPLETE";
}

export function buildArtworkStyle(song: Song, offset = 0): CSSProperties {
  const palette = {
    HAPPY: ["#ff8a5b", "#ffd166"],
    SAD: ["#36558f", "#6b8fdf"],
    ROMANTIC: ["#c44569", "#f78fb3"],
    ENERGETIC: ["#ff4d6d", "#ff9e00"],
    CALM: ["#3fa7a3", "#7dd3c7"],
  };

  const [start, end] =
    palette[song.mood as keyof typeof palette] ?? ["#ff6b6b", "#feca57"];

  return {
    background: `linear-gradient(${135 + offset * 10}deg, ${start}, ${end})`,
  };
}
