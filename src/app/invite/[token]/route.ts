import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return NextResponse.redirect(new URL("/login?error=invalid_invite", request.url));
  }

  const supabase = await createClient();

  // Validate and consume the invite token atomically
  const { data, error } = await supabase.rpc("validate_invite_token", {
    p_token: token,
  });

  if (error || !data || data.length === 0) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_invite", request.url)
    );
  }

  // Set guest_token cookie and redirect to home
  const redirectUrl = new URL("/", request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("guest_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
