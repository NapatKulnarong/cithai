"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import styles from "./app-shell.module.css";
import { useCithai } from "./cithai-context";
import {
  CloseIcon,
  LibraryIcon,
  LogoutIcon,
  PauseControlIcon,
  PlayControlIcon,
  ShareIcon,
  StudioIcon,
  UserIcon,
  VinylIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./icons";
import { buildArtworkStyle, formatDate, formatLabel, isSongReady } from "@/lib/song-ui";
import type { AuthenticatedAccount, Song } from "@/lib/types";
import { signOutFromApp } from "@/app/(app)/actions";

const navItems = [
  { href: "/studio", label: "Studio", icon: StudioIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
];

export function AppShell({
  children,
  account,
}: {
  children: ReactNode;
  account: AuthenticatedAccount;
}) {
  const pathname = usePathname();
  const shareResetTimer = useRef<number | null>(null);
  const {
    activeSong,
    autoPlaySongId,
    dismissNotice,
    notice,
    selectedUser,
    songs,
    consumeAutoPlaySongId,
    shareSong,
  } = useCithai();
  const playerSong = activeSong && isSongReady(activeSong) ? activeSong : null;
  const [lastPlayableSong, setLastPlayableSong] = useState<Song | null>(null);
  const mostRecentPlayableSong = songs.find((song) => isSongReady(song)) ?? null;
  const dockSong = playerSong ?? lastPlayableSong ?? mostRecentPlayableSong;
  const [animatedShareSongId, setAnimatedShareSongId] = useState<number | null>(null);

  useEffect(() => {
    if (playerSong) {
      setLastPlayableSong(playerSong);
      return;
    }

    if (lastPlayableSong && !songs.some((song) => song.id === lastPlayableSong.id)) {
      setLastPlayableSong(mostRecentPlayableSong);
      return;
    }

    if (!lastPlayableSong && mostRecentPlayableSong) {
      setLastPlayableSong(mostRecentPlayableSong);
    }
  }, [playerSong, songs, lastPlayableSong, mostRecentPlayableSong]);

  useEffect(() => {
    return () => {
      if (shareResetTimer.current !== null) {
        window.clearTimeout(shareResetTimer.current);
      }
    };
  }, []);

  async function handleShare(songId: number) {
    const didCopy = await shareSong(songId);

    if (!didCopy) {
      return;
    }

    setAnimatedShareSongId(songId);

    if (shareResetTimer.current !== null) {
      window.clearTimeout(shareResetTimer.current);
    }

    shareResetTimer.current = window.setTimeout(() => {
      setAnimatedShareSongId(null);
      shareResetTimer.current = null;
    }, 800);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.backgroundAura} />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <Image
              className={styles.brandMarkImage}
              src="/icon.png"
              alt="Cithai"
              width={54}
              height={54}
              priority
            />
            <div>
              <p className={styles.eyebrow}>Cithai</p>
              <h1 className={styles.brandTitle}>Studio Suite</h1>
            </div>
          </div>

          <section className={styles.profileCard}>
            <div className={styles.profileCardTop}>
              <div className={styles.profileIdentity}>
                <div className={styles.avatar}>
                  {account.image ? (
                    <Image
                      className={styles.avatarImage}
                      src={account.image}
                      alt={account.name}
                      fill
                      sizes="48px"
                    />
                  ) : selectedUser ? (
                    initialsFor(selectedUser.name)
                  ) : (
                    <UserIcon />
                  )}
                </div>
                <div className={styles.profileCopy}>
                  <p className={styles.profileName}>
                    {selectedUser?.name ?? account.name}
                  </p>
                  <p className={styles.profileMeta}>{account.email}</p>
                </div>
              </div>
              <form action={signOutFromApp}>
                <button
                  type="submit"
                  className={styles.iconButton}
                  aria-label="Sign out"
                >
                  <LogoutIcon />
                </button>
              </form>
            </div>
          </section>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive ? styles.navItemActive : ""
                  }`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <p className={styles.eyebrow}>Sound posture</p>
            <h2 className={styles.sidebarFooterTitle}>
              Keep Studio focused, let Library breathe, and browse the wider catalog without losing the player.
            </h2>
          </div>
        </aside>

        <div className={styles.mainColumn}>
          {notice?.tone === "error" ? (
            <div className={styles.notice} data-tone={notice.tone}>
              <p>{notice.text}</p>
              <button
                type="button"
                className={styles.noticeDismiss}
                aria-label="Dismiss notice"
                onClick={dismissNotice}
              >
                <CloseIcon />
              </button>
            </div>
          ) : null}
          <main className={styles.pageContent}>{children}</main>
        </div>
      </div>

      <div className={styles.playerDock}>
        <div className={styles.playerSurface}>
          {dockSong ? (
            <>
              <div
                className={styles.playerArtwork}
                style={buildArtworkStyle(dockSong, 2)}
              >
                <div className={styles.playerArtworkGlow} />
              </div>
              <div className={styles.playerMeta}>
                <p className={styles.playerTitle}>{dockSong.title}</p>
                <p className={styles.playerSubtitle}>
                  {formatLabel(dockSong.genre)} · {formatLabel(dockSong.mood)} ·{" "}
                  {formatDate(dockSong.creation_date)}
                </p>
              </div>
              <div className={styles.playerControls}>
                <div className={styles.playerTransport}>
                  <DockPlayer
                    key={dockSong.id}
                    song={dockSong}
                    autoPlay={autoPlaySongId === dockSong.id}
                    onAutoPlayHandled={consumeAutoPlaySongId}
                  />
                  <button
                    type="button"
                    className={`${styles.playerShareButton} ${
                      animatedShareSongId === dockSong.id ? styles.playerShareButtonJingled : ""
                    }`}
                    aria-label={
                      animatedShareSongId === dockSong.id ? "Share link copied" : "Share track"
                    }
                    title="Share track"
                    onClick={() => void handleShare(dockSong.id)}
                  >
                    <ShareIcon />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.playerEmpty}>
              <VinylIcon />
              <p>
                Select a completed track from Studio, Library, or Browse to keep it pinned here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function DockPlayer({
  song,
  autoPlay = false,
  onAutoPlayHandled,
}: {
  song: Song;
  autoPlay?: boolean;
  onAutoPlayHandled?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVolumeRef = useRef(0.85);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => song.duration ?? 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  function setAudioNode(node: HTMLAudioElement | null) {
    audioRef.current = node;

    if (!node) {
      return;
    }

    node.volume = 0.85;
    node.muted = false;
    lastVolumeRef.current = 0.85;
  }

  function syncFromAudio() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrentTime(audio.currentTime);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : song.duration ?? 0);
    setIsPlaying(!audio.paused && !audio.ended);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    if (audio.volume > 0) {
      lastVolumeRef.current = audio.volume;
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {}
      return;
    }

    audio.pause();
  }

  function handleSeek(value: string) {
    const audio = audioRef.current;
    const nextTime = Number(value);

    if (!audio || Number.isNaN(nextTime)) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function handleVolume(value: string) {
    const audio = audioRef.current;
    const nextVolume = Number(value);

    if (!audio || Number.isNaN(nextVolume)) {
      return;
    }

    audio.muted = false;
    audio.volume = nextVolume;
    setVolume(nextVolume);
    setIsMuted(false);

    if (nextVolume > 0) {
      lastVolumeRef.current = nextVolume;
    }
  }

  function toggleMute() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.muted || audio.volume === 0) {
      const restoredVolume = lastVolumeRef.current || 0.85;
      audio.muted = false;
      audio.volume = restoredVolume;
      setVolume(restoredVolume);
      setIsMuted(false);
      return;
    }

    lastVolumeRef.current = audio.volume;
    audio.muted = true;
    setIsMuted(true);
  }

  const shownDuration = duration > 0 ? duration : song.duration ?? 0;
  const volumeIcon = isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeOnIcon />;

  useEffect(() => {
    const audio = audioRef.current;

    if (!autoPlay || !audio) {
      return;
    }

    void audio.play().catch(() => {});
    onAutoPlayHandled?.();
  }, [autoPlay, onAutoPlayHandled, song.id]);

  return (
    <div className={styles.audioWrap}>
      <audio
        key={song.id}
        ref={setAudioNode}
        className={styles.nativeAudio}
        preload="none"
        src={song.audio_file_path ?? undefined}
        onLoadedMetadata={syncFromAudio}
        onDurationChange={syncFromAudio}
        onTimeUpdate={syncFromAudio}
        onPlay={syncFromAudio}
        onPause={syncFromAudio}
        onVolumeChange={syncFromAudio}
        onEnded={syncFromAudio}
      />
      <button
        type="button"
        className={styles.playerControlButton}
        aria-label={isPlaying ? "Pause track" : "Play track"}
        onClick={() => void togglePlayback()}
      >
        {isPlaying ? <PauseControlIcon /> : <PlayControlIcon />}
      </button>
      <div className={styles.playerTimeline}>
        <div className={styles.playerTimeRow}>
          <span>{formatPlayerTime(currentTime)}</span>
          <span>{formatPlayerTime(shownDuration)}</span>
        </div>
        <input
          className={styles.playerSeek}
          type="range"
          min="0"
          max={shownDuration > 0 ? shownDuration : 0}
          step="0.1"
          value={shownDuration > 0 ? Math.min(currentTime, shownDuration) : 0}
          aria-label="Seek track"
          onChange={(event) => handleSeek(event.target.value)}
        />
      </div>
      <div className={styles.playerVolumeGroup}>
        <button
          type="button"
          className={styles.playerVolumeButton}
          aria-label={isMuted || volume === 0 ? "Unmute track" : "Mute track"}
          onClick={toggleMute}
        >
          {volumeIcon}
        </button>
        <input
          className={styles.playerVolume}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          aria-label="Adjust volume"
          onChange={(event) => handleVolume(event.target.value)}
        />
      </div>
    </div>
  );
}

function formatPlayerTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
