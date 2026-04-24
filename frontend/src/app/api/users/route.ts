import { NextResponse } from "next/server";

import { requireAuthenticatedViewer } from "../_lib/viewer";

export async function GET() {
  const authResult = await requireAuthenticatedViewer();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    return NextResponse.json(authResult.viewer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load user data.",
      },
      { status: 502 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "User accounts are provisioned through Google sign-in." },
    { status: 405 },
  );
}
