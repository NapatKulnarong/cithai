import { NextResponse } from "next/server";

import type { Song } from "@/lib/types";

import { requestDjangoJson } from "../../_lib/django";
import { requireAuthenticatedViewer } from "../../_lib/viewer";

type Params = Promise<{ songId: string }>;

export async function DELETE(_request: Request, context: { params: Params }) {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { songId } = await context.params;
    const { data: song } = await requestDjangoJson<Song>(`/api/songs/${songId}/`);

    if (song.user_id !== authResult.viewer.id) {
      return NextResponse.json(
        { error: "You cannot delete another user's song." },
        { status: 403 },
      );
    }

    const { data, status } = await requestDjangoJson<{ status: string }>(
      `/api/songs/${songId}/`,
      {
        method: "DELETE",
      },
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not delete this song.",
      },
      { status: 502 },
    );
  }
}

export async function PATCH(request: Request, context: { params: Params }) {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { songId } = await context.params;
    const { data: song } = await requestDjangoJson<Song>(`/api/songs/${songId}/`);

    if (song.user_id !== authResult.viewer.id) {
      return NextResponse.json(
        { error: "You cannot modify another user's song." },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;

    const { data, status } = await requestDjangoJson<Song>(
      `/api/songs/${songId}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not update this song.",
      },
      { status: 502 },
    );
  }
}
