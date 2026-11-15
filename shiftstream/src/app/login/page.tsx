import Link from "next/link";
import LoginForm from "./LoginForm";
import styles from "../page.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className={styles.loginShell}>
      <Link className={styles.brand} href="/">
        <span className={styles.mark}>S</span>
        <span>
          <strong>SHIFTSTREAM</strong>
          <small>STREAM OPERATIONS</small>
        </span>
      </Link>
      <section className={styles.loginCard}>
        <p className={styles.eyebrow}>INVITE-ONLY ACCESS</p>
        <h1>Sign in to your workspace</h1>
        <p>
          Use an email address added to the ShiftStream manager allowlist. We’ll
          send a one-time sign-in link.
        </p>
        {query.error === "not-authorized" && (
          <p className={styles.error} role="alert">
            This email is not authorized for ShiftStream.
          </p>
        )}
        {query.error === "sign-in-failed" && (
          <p className={styles.error} role="alert">
            The sign-in link expired or could not be verified. Request a new link.
          </p>
        )}
        <LoginForm />
      </section>
    </main>
  );
}
