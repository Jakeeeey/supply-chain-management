import { NextResponse } from "next/server";

/**
 * Standard Application Error Class
 */
export class AppError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Centralized API Error Handler
 * Translates service-level exceptions into standardized HTTP responses.
 */
export const handleApiError = (error: any) => {
  console.error("[API Error Trace]:", {
    message: error.message,
    stack: error.stack,
    code: error.code || "UNKNOWN",
  });

  // 1. Handle Custom AppErrors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  // 2. Handle DB Not Found
  if (
    error.message?.includes("DB_NOT_FOUND") ||
    error.message?.includes("not found")
  ) {
    return NextResponse.json(
      {
        error: "The requested resource could not be found.",
        code: "NOT_FOUND",
      },
      { status: 404 },
    );
  }

  // 3. Handle Validation Failures
  if (
    error.message?.includes("VALIDATION_FAILED") ||
    error.name === "ZodError"
  ) {
    return NextResponse.json(
      {
        error: "Submission failed. Please check your inputs and try again.",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  // 4. Default Internal Server Error
  return NextResponse.json(
    {
      error: "An unexpected system error occurred. Our team has been notified.",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 },
  );
};
