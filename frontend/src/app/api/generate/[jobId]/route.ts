import { NextResponse } from "next/server";

import { requestDjangoJson } from "../../_lib/django";
import { requireAuthenticatedViewer } from "../../_lib/viewer";
import type { GenerateResponse } from "@/lib/types";

type Params = Promise<{ jobId: string }>;

export async function GET(request: Request, context: { params: Params }) {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { jobId } = await context.params;
    const { data, status } = await requestDjangoJson<GenerateResponse>(
      `/api/generate/${jobId}/`,
      {
        method: request.method,
      },
    );

    if (data.song.user_id !== authResult.viewer.id) {
      return NextResponse.json(
        { error: "Generation job not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not refresh generation status.",
      },
      { status: 502 },
    );
  }
}
