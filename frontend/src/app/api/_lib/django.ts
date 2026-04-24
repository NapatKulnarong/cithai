import { NextResponse } from "next/server";

const defaultBaseUrl = "http://127.0.0.1:8000";

export function getDjangoBaseUrl() {
  return (process.env.DJANGO_API_BASE ?? defaultBaseUrl).replace(/\/$/, "");
}

function buildHeaders(contentType: string | null) {
  const headers = new Headers();

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return headers;
}

function cloneHeaders(headersInit?: HeadersInit | null) {
  return new Headers(headersInit ?? undefined);
}

export async function forwardToDjango(request: Request, path: string) {
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  try {
    const response = await fetch(`${getDjangoBaseUrl()}${path}`, {
      method: request.method,
      headers: buildHeaders(request.headers.get("content-type")),
      body,
      cache: "no-store",
    });

    const text = await response.text();
    const contentType =
      response.headers.get("content-type") ?? "application/json; charset=utf-8";

    return new NextResponse(text, {
      status: response.status,
      headers: buildHeaders(contentType),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reach the Django backend.",
      },
      { status: 502 },
    );
  }
}

export async function fetchDjangoJson<T>(path: string): Promise<T> {
  const { data } = await requestDjangoJson<T>(path);

  return data;
}

export async function requestDjangoJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; status: number }> {
  const response = await fetch(`${getDjangoBaseUrl()}${path}`, {
    ...init,
    headers: cloneHeaders(init.headers),
    cache: "no-store",
  });

  const data = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? data.error
        : `Upstream request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return { data: data as T, status: response.status };
}
