/**
 * JWT Utility — local copy for return-supplier-type module.
 * Do NOT import from @/lib/auth-utils inside this module.
 */

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const p = parts[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

    if (typeof Buffer !== "undefined") {
      const json = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(json);
    }

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserIdFromToken(token: string | null | undefined): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const idValue = payload.user_id ?? payload.userId ?? payload.id ?? payload.sub;

  if (idValue !== undefined && idValue !== null) {
    const num = Number(idValue);
    return isNaN(num) ? null : num;
  }

  return null;
}
