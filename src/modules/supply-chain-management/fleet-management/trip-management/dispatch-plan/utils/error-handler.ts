import { NextResponse } from "next/server";

/**
 * AppError
 * Structured error class for application-level errors.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/**
 * handleApiError
 * Centralised error handler for Next.js API route handlers.
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

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
