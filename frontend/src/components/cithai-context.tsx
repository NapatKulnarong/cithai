"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type {
  BootstrapResponse,
  GenerateResponse,
  GenerationJob,
  Notice,
  ShareLinkResponse,
  Song,
  User,
} from "@/lib/types";
import { getSongDisplayStatus, isSongReady } from "@/lib/song-ui";

type BackendInfo = BootstrapResponse["backend"];

type ComposerInput = {
  title: string;
  custom_lyrics: string;
  mood: string;
  genre: string;
  occasion: string;
  voice_type: string;
  is_public: boolean;
};

type CithaiContextValue = {
  users: User[];
  songs: Song[];
  jobs: GenerationJob[];
  backend: BackendInfo;
  viewer: User | null;
  selectedUser: User | null;
  activeSong: Song | null;
  autoPlaySongId: number | null;
  isLoading: boolean;
  isGenerating: boolean;
  notice: Notice | null;
  librarySongs: Song[];
  browseSongs: Song[];
  completedCount: number;
  pendingCount: number;
  sharedCount: number;
  totalMinutes: number;
  setActiveSongId: (value: number | null) => void;
  playSong: (songId: number) => void;
  consumeAutoPlaySongId: () => void;
  dismissNotice: () => void;
  loadDashboard: () => Promise<void>;
  pollJob: (jobId: number, shouldNotify: boolean) => Promise<void>;
  generateSong: (payload: ComposerInput) => Promise<void>;
  shareSong: (songId: number) => Promise<boolean>;
  deleteSong: (songId: number) => Promise<boolean>;
  togglePublic: (songId: number, isPublic: boolean) => Promise<boolean>;
  getUserName: (userId: number) => string;
};

const emptyBackend: BackendInfo = {
  baseUrl: "http://127.0.0.1:8000",
  strategy: "Configured in Django env",
};

const CithaiContext = createContext<CithaiContextValue | null>(null);

export function CithaiProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [autoPlaySongId, setAutoPlaySongId] = useState<number | null>(null);
  const [backend, setBackend] = useState<BackendInfo>(emptyBackend);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const pollPendingJob = useEffectEvent((jobId: number) => {
    void pollJob(jobId, false);
  });

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const pendingJobs = jobs.filter((job) =>
      ["PENDING", "PROCESSING"].includes(job.status),
    );

    if (!pendingJobs.length) {
      return;
    }

    const interval = window.setInterval(() => {
      pendingJobs.forEach((job) => {
        pollPendingJob(job.id);
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [jobs]);

  const selectedUser = viewer;

  const viewerSongs = viewer ? songs.filter((song) => song.user_id === viewer.id) : [];

  const librarySongs = viewerSongs.filter((song) => isSongReady(song));

  const browseSongs = songs.filter(
    (song) => song.is_public && isSongReady(song)
  );

  const activeSong =
    songs.find((song) => song.id === activeSongId) ??
    librarySongs.find((song) => song.audio_file_path) ??
    browseSongs.find((song) => song.audio_file_path) ??
    null;

  const completedCount = librarySongs.length;
  const pendingCount = viewerSongs.filter((song) =>
    ["PENDING", "PROCESSING"].includes(getSongDisplayStatus(song)),
  ).length;
  const sharedCount = librarySongs.filter((song) => song.is_shared).length;
  const totalMinutes = librarySongs.reduce(
    (sum, song) => sum + (song.duration ?? 0),
    0,
  );

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/bootstrap", {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | BootstrapResponse
        | { error: string };

      if (!response.ok || !("viewer" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Failed to load the dashboard.",
        );
      }

      setViewer(payload.viewer);
      setUsers(payload.users);
      setSongs(payload.songs);
      setJobs(payload.jobs);
      setBackend(payload.backend);
      setNotice(null);
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to reach the backend right now.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function pollJob(jobId: number, shouldNotify: boolean) {
    try {
      const response = await fetch(`/api/generate/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | GenerateResponse
        | { error: string };

      if (!response.ok || !("job" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "Could not refresh generation status.",
        );
      }

      const previousJob = jobs.find((job) => job.id === jobId);
      const reachedTerminalState =
        previousJob?.status !== payload.job.status &&
        ["COMPLETE", "FAILED"].includes(payload.job.status);

      setJobs((current) => upsertById(current, payload.job));
      setSongs((current) => upsertById(current, payload.song));

      if (payload.song.audio_file_path) {
        setActiveSongId(payload.song.id);
      }

      if ((shouldNotify || reachedTerminalState) && payload.job.status === "FAILED") {
        setNotice({
          tone: "error",
          text: payload.job.error_message || "Generation failed.",
        });
      }
    } catch (error) {
      if (shouldNotify) {
        setNotice({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not poll the generation job.",
        });
      }
    }
  }

  async function generateSong(payload: ComposerInput) {
    if (viewer === null) {
      setNotice({
        tone: "error",
        text: "Sign in again before generating music.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as
        | GenerateResponse
        | { error: string };

      if (!response.ok || !("job" in data)) {
        throw new Error(
          "error" in data ? data.error : "Could not start music generation.",
        );
      }

      setJobs((current) => upsertById(current, data.job));
      setSongs((current) => upsertById(current, data.song));
      setActiveSongId(data.song.id);

      if (data.job.status === "FAILED") {
        setNotice({
          tone: "error",
          text: data.job.error_message || `Failed to start "${data.song.title}".`,
        });
      } else {
        setNotice(null);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not start the generation request.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function shareSong(songId: number) {
    try {
      const response = await fetch(`/api/share-links/song/${songId}`, {
        method: "POST",
      });
      const payload = (await response.json()) as
        | ShareLinkResponse
        | { error: string };

      if (!response.ok || !("share_url" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Could not create a share link.",
        );
      }

      setSongs((current) => upsertById(current, payload.song));

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(payload.share_url);
        } catch {}
      }

      setNotice(null);
      return true;
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not share this song.",
      });
      return false;
    }
  }

  async function deleteSong(songId: number) {
    const song = songs.find((item) => item.id === songId);

    if (!song) {
      setNotice({
        tone: "error",
        text: "Could not find that song.",
      });
      return false;
    }

    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { status?: string; error?: string };

      if (!response.ok || payload.status !== "deleted") {
        throw new Error(
          payload.error || "Could not delete this song.",
        );
      }

      setSongs((current) => current.filter((item) => item.id !== songId));
      setJobs((current) =>
        song.generation_job_id === null
          ? current
          : current.filter((job) => job.id !== song.generation_job_id),
      );
      setActiveSongId((current) => (current === songId ? null : current));
      setAutoPlaySongId((current) => (current === songId ? null : current));
      setNotice({
        tone: "success",
        text: `"${song.title}" was deleted from your library.`,
      });
      return true;
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not delete this song.",
      });
      return false;
    }
  }

  async function togglePublic(songId: number, isPublic: boolean) {
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_public: isPublic }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Could not update privacy setting.");
      }

      setSongs((current) => upsertById(current, payload));
      setNotice({
        tone: "success",
        text: `Song is now ${isPublic ? "public" : "private"}.`,
      });
      return true;
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not update privacy setting.",
      });
      return false;
    }
  }

  function dismissNotice() {
    setNotice(null);
  }

  function playSong(songId: number) {
    setActiveSongId(songId);
    setAutoPlaySongId(songId);
  }

  function consumeAutoPlaySongId() {
    setAutoPlaySongId(null);
  }

  function getUserName(userId: number) {
    return users.find((user) => user.id === userId)?.name ?? `User ${userId}`;
  }

  return (
    <CithaiContext.Provider
      value={{
        users,
        songs,
        jobs,
        backend,
        viewer,
        selectedUser,
        activeSong,
        autoPlaySongId,
        isLoading,
        isGenerating,
        notice,
        librarySongs,
        browseSongs,
        completedCount,
        pendingCount,
        sharedCount,
        totalMinutes,
        setActiveSongId,
        playSong,
        consumeAutoPlaySongId,
        dismissNotice,
        loadDashboard,
        pollJob,
        generateSong,
        shareSong,
        deleteSong,
        togglePublic,
        getUserName,
      }}
    >
      {children}
    </CithaiContext.Provider>
  );
}

export function useCithai() {
  const context = useContext(CithaiContext);

  if (!context) {
    throw new Error("useCithai must be used inside CithaiProvider.");
  }

  return context;
}

function upsertById<T extends { id: number }>(items: T[], nextItem: T) {
  const remaining = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...remaining];
}
