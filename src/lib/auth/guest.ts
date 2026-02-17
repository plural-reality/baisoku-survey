import { cookies } from "next/headers";

/**
 * Check if the current request has a valid guest token cookie.
 * Returns the token string if present, null otherwise.
 */
export async function getGuestToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("guest_token")?.value ?? null;
}
