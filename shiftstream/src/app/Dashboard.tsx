"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./page.module.css";

type Connection = {
  provider_login: string | null;
  updated_at: string;
} | null;

type Props = {
  email: string;
  connections: { twitch: Connection; google: Connection };
  connectionStatus: string;
};

const connectionMessages: Record<string, string> = {
  failed: "A provider connection failed. Check its OAuth settings and try again.",
  "not-configured": "That provider's OAuth credentials are not configured yet.",
  "twitch-connected": "Twitch schedule connected.",
  "google-connected": "Google Calendar connected.",
};

function providerLabel(connection: Connection, provider: string) {
  if (!connection) return "Not connected";
  return connection.provider_login || `${provider} connected`;
}

export default function Dashboard({
  email,
  connections,
  connectionStatus,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(
    connectionMessages[connectionStatus] ?? "",
  );
  const [error, setError] = useState("");

  const syncSchedule = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json()) as {
        error?: string;
        channel?: string;
        total?: number;
        created?: number;
        updated?: number;
      };
      if (!response.ok) throw new Error(result.error || "Schedule sync failed.");
      setMessage(
        `Synced ${result.total} stream(s) for @${result.channel}: ${result.created} created, ${result.updated} updated.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Schedule sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const signOut = async () => {
    const { error: signOutError } =
      await createSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError("Unable to sign out. Please try again.");
      return;
    }
    router.replace("/login");
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark}>S</span>
          <span>
            <strong>SHIFTSTREAM</strong>
            <small>STREAM OPERATIONS</small>
          </span>
        </Link>
        <div className={styles.account}>
          <span>{email}</span>
          <button type="button" className={styles.textButton} onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>STREAM MANAGER WORKSPACE / 01</p>
          <h1>Schedules, in sync.</h1>
          <p className={styles.subtitle}>
            Link a Twitch broadcaster and Google Calendar. ShiftStream mirrors
            upcoming Twitch schedule slots into that calendar without creating
            duplicate events.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <span className={styles.pulse} />
          <span>PRIVATE WORKSPACE</span>
        </div>
      </section>

      <section className={styles.grid} aria-label="Connected services">
        <article className={styles.service}>
          <div className={styles.serviceHead}>
            <span className={styles.serviceIcon}>TW</span>
            <span className={connections.twitch ? styles.connected : styles.pending}>
              {connections.twitch ? "CONNECTED" : "REQUIRED"}
            </span>
          </div>
          <h2>Twitch schedule</h2>
          <p>
            {connections.twitch
              ? `Connected as ${providerLabel(connections.twitch, "Twitch")}`
              : "Authorize the broadcaster account whose schedule should be copied."}
          </p>
          <form action="/api/connect/twitch" method="get">
            <button className={styles.secondaryButton} type="submit">
              {connections.twitch ? "Reconnect Twitch" : "Connect Twitch"}
            </button>
          </form>
        </article>

        <article className={styles.service}>
          <div className={styles.serviceHead}>
            <span className={styles.serviceIcon}>GC</span>
            <span className={connections.google ? styles.connected : styles.pending}>
              {connections.google ? "CONNECTED" : "REQUIRED"}
            </span>
          </div>
          <h2>Google Calendar</h2>
          <p>
            {connections.google
              ? `Connected as ${providerLabel(connections.google, "Google")}`
              : "Grant permission to create and update events in your primary calendar."}
          </p>
          <form action="/api/connect/google" method="get">
            <button className={styles.secondaryButton} type="submit">
              {connections.google ? "Reconnect Google" : "Connect Google"}
            </button>
          </form>
        </article>
      </section>

      <section className={styles.syncPanel}>
        <div>
          <p className={styles.eyebrow}>MANUAL SYNC</p>
          <h2>Keep your calendar current</h2>
          <p>
            Each sync checks the next 25 Twitch schedule entries. Existing events
            are updated by their Twitch segment ID; removed Twitch slots are not
            deleted from your calendar.
          </p>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={syncing || !connections.twitch || !connections.google}
          onClick={syncSchedule}
        >
          {syncing ? "Syncing…" : "Sync Twitch schedule"}
        </button>
      </section>

      {message && <p className={styles.notice} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.footer}>
        <span>SHIFTSTREAM // VEXON STUDIO</span>
        <span>OAuth tokens are encrypted before storage.</span>
      </footer>
    </main>
  );
}
