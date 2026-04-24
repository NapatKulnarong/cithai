import { NextResponse } from "next/server";

import { requestDjangoJson } from "../_lib/django";
import { requireAuthenticatedViewer } from "../_lib/viewer";
import type { GenerateResponse } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { data, status } = await requestDjangoJson<GenerateResponse>(
      "/api/generate/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          user_id: authResult.viewer.id,
        }),
      },
    );

    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start music generation.",
      },
      { status: 502 },
    );
  }
}
