import { NextResponse } from "next/server";

import { requestDjangoJson } from "../../../_lib/django";
import { requireAuthenticatedViewer } from "../../../_lib/viewer";
import type { ShareLink, ShareLinkResponse } from "@/lib/types";

type Params = Promise<{ songId: string }>;

export async function POST(request: Request, context: { params: Params }) {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { songId } = await context.params;
    const { data, status } = await requestDjangoJson<ShareLink>(
      `/api/songs/${songId}/share/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewer_id: authResult.viewer.id,
        }),
      },
    );

    const origin = new URL(request.url).origin;
    const payload: ShareLinkResponse = {
      ...data,
      share_url: `${origin}${data.share_path}`,
    };

    return NextResponse.json(payload, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create a share link.",
      },
      { status: 502 },
    );
  }
}
