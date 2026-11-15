import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class AccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
  }
}

export function isAllowedManager(email: string | undefined) {
  if (!email) return false;
  const allowedEmails = (process.env.SHIFTSTREAM_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.toLowerCase());
}

export async function requireManager() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AccessError("Sign in is required.", 401);
  }
  if (!isAllowedManager(user.email)) {
    throw new AccessError("This account is not authorized for ShiftStream.", 403);
  }

  return { user, supabase };
}

export async function requireManagerPage() {
  try {
    return await requireManager();
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) {
      redirect("/login");
    }
    if (error instanceof AccessError && error.status === 403) {
      redirect("/login?error=not-authorized");
    }
    throw error;
  }
}
