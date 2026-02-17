import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const redirectTo = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectTo, { status: 302 });

  // Clear the guest token cookie
  response.cookies.set("guest_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
