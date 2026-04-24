import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AuthenticatedAccount, GenerationJob, Song, User } from "@/lib/types";
import { requestDjangoJson } from "./django";

type VisibleDashboard = {
  users: User[];
  songs: Song[];
  jobs: GenerationJob[];
};

export async function requireAuthenticatedViewer() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const account: AuthenticatedAccount = {
    name: session.user?.name?.trim() || email,
    email,
    image: session.user?.image ?? null,
  };

  const viewer = await ensureViewer(account);

  return { account, viewer };
}

export async function loadVisibleDashboard(viewer: User): Promise<VisibleDashboard> {
  const [usersResponse, songsResponse, jobsResponse] = await Promise.all([
    requestDjangoJson<User[]>("/api/users/"),
    requestDjangoJson<Song[]>("/api/songs/"),
    requestDjangoJson<GenerationJob[]>("/api/generation-jobs/"),
  ]);

  const visibleSongs = songsResponse.data.filter(
    (song) => song.user_id === viewer.id || song.is_shared,
  );
  const visibleUserIds = new Set<number>([
    viewer.id,
    ...visibleSongs.map((song) => song.user_id),
  ]);
  const ownJobIds = new Set<number>(
    visibleSongs
      .filter((song) => song.user_id === viewer.id)
      .map((song) => song.generation_job_id)
      .filter((jobId): jobId is number => jobId !== null),
  );

  return {
    users: usersResponse.data.filter((user) => visibleUserIds.has(user.id)),
    songs: visibleSongs,
    jobs: jobsResponse.data.filter((job) => ownJobIds.has(job.id)),
  };
}

async function ensureViewer(account: AuthenticatedAccount) {
  const usersResponse = await requestDjangoJson<User[]>("/api/users/");
  const existing = usersResponse.data.find(
    (user) => user.email.toLowerCase() === account.email.toLowerCase(),
  );

  if (!existing) {
    const createdResponse = await requestDjangoJson<User>("/api/users/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: account.name,
        email: account.email,
      }),
    });

    return createdResponse.data;
  }

  if (existing.name !== account.name) {
    const updatedResponse = await requestDjangoJson<User>(
      `/api/users/${existing.id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: account.name }),
      },
    );

    return updatedResponse.data;
  }

  return existing;
}
