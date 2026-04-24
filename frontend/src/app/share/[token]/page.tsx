import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requestDjangoJson } from "@/app/api/_lib/django";
import { formatDate, formatLabel, isSongReady } from "@/lib/song-ui";
import type { ShareLink } from "@/lib/types";
import styles from "./share-page.module.css";

type Params = Promise<{ token: string }>;

export default async function SharePage(props: { params: Params }) {
  const session = await auth();
  const email = session?.user?.email;
  const { token } = await props.params;

  if (!email) {
    redirect(`/login?callbackUrl=/share/${token}`);
  }

  let shareLink: ShareLink | null = null;

  try {
    const { data } = await requestDjangoJson<ShareLink>(`/api/share-links/${token}/`);
    shareLink = data;
  } catch {
    shareLink = null;
  }

  if (!shareLink) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Shared Track</p>
          <h1 className={styles.title}>Link unavailable</h1>
          <p className={styles.copy}>
            This share link does not exist anymore or was deactivated.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href="/studio">
              Open Studio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const song = shareLink.song;

  return (
    <main className={styles.page}>
      <div className={styles.aura} />
      <section className={styles.card}>
        <p className={styles.eyebrow}>Shared Track</p>
        <h1 className={styles.title}>{song.title}</h1>
        <p className={styles.meta}>
          {formatLabel(song.genre)} · {formatLabel(song.mood)} · {formatDate(song.creation_date)}
        </p>
        <p className={styles.copy}>
          Sign-in is required for playback. This share page stays on Cithai and only exposes tracks through an active token.
        </p>

        <div className={styles.detailRow}>
          <span>{formatLabel(song.occasion)}</span>
          <span>{formatLabel(song.voice_type)}</span>
          <span>{song.is_shared ? "Shared" : "Private"}</span>
        </div>

        {isSongReady(song) ? (
          <audio className={styles.audio} controls preload="none" src={song.audio_file_path ?? undefined} />
        ) : (
          <div className={styles.placeholder}>
            This shared track is not ready for playback yet.
          </div>
        )}

        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/studio">
            Open Studio
          </Link>
          <Link className={styles.secondaryLink} href="/browse">
            Browse More Songs
          </Link>
        </div>
      </section>
    </main>
  );
}
