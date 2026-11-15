"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "../page.module.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setMessage("If this address is authorized, a sign-in link is on its way.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the sign-in link.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="email">Manager email</label>
      <input
        id="email"
        autoComplete="email"
        type="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button className={styles.primaryButton} type="submit" disabled={sending}>
        {sending ? "Sending…" : "Email sign-in link"}
      </button>
      {message && <p className={styles.notice} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
