import { NextResponse } from "next/server";

/**
 * handleApiError
 * Centralised error handler for the stock-adjustment API route handlers.
 * Returns a standardised JSON error response.
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 }
  );
}
