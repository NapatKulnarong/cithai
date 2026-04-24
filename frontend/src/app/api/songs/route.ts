import { NextResponse } from "next/server";

import { loadVisibleDashboard, requireAuthenticatedViewer } from "../_lib/viewer";

export async function GET() {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { songs } = await loadVisibleDashboard(authResult.viewer);
    return NextResponse.json(songs);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load songs.",
      },
      { status: 502 },
    );
  }
}
