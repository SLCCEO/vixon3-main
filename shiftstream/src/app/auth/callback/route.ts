import { NextRequest, NextResponse } from "next/server";
import { isAllowedManager } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=sign-in-failed", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=sign-in-failed", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedManager(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not-authorized", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
