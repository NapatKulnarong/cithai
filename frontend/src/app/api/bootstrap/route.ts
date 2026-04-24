import { NextResponse } from "next/server";

import { getDjangoBaseUrl } from "../_lib/django";
import { requestDjangoJson } from "../_lib/django";
import { loadVisibleDashboard, requireAuthenticatedViewer } from "../_lib/viewer";
import type { BootstrapResponse } from "@/lib/types";

export async function GET() {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { users, songs, jobs } = await loadVisibleDashboard(authResult.viewer);
    const backendResponse = await requestDjangoJson<{ backend: { strategy: string } }>(
      "/api/bootstrap/",
    );

    const payload: BootstrapResponse = {
      viewer: authResult.viewer,
      users,
      songs,
      jobs,
      backend: {
        baseUrl: getDjangoBaseUrl(),
        strategy: backendResponse.data.backend.strategy,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load dashboard data.",
      },
      { status: 502 },
    );
  }
}
