import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signInWithGoogle } from "./actions";
import styles from "./login.module.css";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams.callbackUrl;
  const session = await auth();
  const email = session?.user?.email;

  if (email) {
    redirect(callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/studio");
  }

  return (
    <main className={styles.page}>
      <div className={styles.aura} />
      <section className={styles.card}>
        <p className={styles.eyebrow}>Cithai</p>
        <h1 className={styles.title}>Sign in to enter the studio.</h1>
        <p className={styles.copy}>
          Google login is required before you can open the dashboard, generate
          songs, or access your library.
        </p>

        <form
          action={async () => {
            "use server";
            await signInWithGoogle(callbackUrl);
          }}
        >
          <button type="submit" className={styles.googleButton}>
            <span className={styles.googleMark} aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        </form>

        <p className={styles.caption}>
          Configure `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` in
          `frontend/.env.local` before using this screen.
        </p>
      </section>
    </main>
  );
}
