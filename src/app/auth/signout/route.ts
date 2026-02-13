import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectTo = new URL("/", request.url);
  return NextResponse.redirect(redirectTo, { status: 302 });
}
