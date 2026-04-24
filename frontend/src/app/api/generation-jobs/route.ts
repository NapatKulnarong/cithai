import { NextResponse } from "next/server";

import { loadVisibleDashboard, requireAuthenticatedViewer } from "../_lib/viewer";

export async function GET() {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { jobs } = await loadVisibleDashboard(authResult.viewer);
    return NextResponse.json(jobs);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load generation jobs.",
      },
      { status: 502 },
    );
  }
}
