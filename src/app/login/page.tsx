"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useAuth } from "@/components/auth";
import { Logo, Spinner } from "@/components/bits";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/dict";

function errorKey(e: unknown): Key | null {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return null;
  if (code.includes("weak-password")) return "weakPassword";
  if (code.includes("email-already-in-use")) return "emailInUse";
  return "authError";
}

export default function LoginPage() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ key: Key; ok?: boolean } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") !== null) setMode("up");
  }, []);

  useEffect(() => {
    if (ready && user) router.replace("/collection");
  }, [ready, user, router]);

  const attempt = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      const key = errorKey(e);
      if (key) setMessage({ key });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    attempt(() =>
      mode === "in" ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password),
    );
  };

  const reset = () => {
    if (!email) return setMessage({ key: "authError" });
    attempt(async () => {
      await sendPasswordResetEmail(auth, email);
      setMessage({ key: "resetSent", ok: true });
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-10 text-2xl">
        <Logo />
      </Link>
      <div className="w-full max-w-sm">
        <button className="btn btn-ghost h-12 w-full bg-surface" disabled={busy} onClick={() => attempt(() => signInWithPopup(auth, new GoogleAuthProvider()))}>
          <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
          </svg>
          {t("continueGoogle")}
        </button>

        <div className="label my-6 flex items-center gap-4 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("or")}</div>

        <form onSubmit={submit} className="space-y-2.5">
          <input className="field h-12" type="email" required autoComplete="email" placeholder={t("email")} aria-label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="field h-12"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder={t("password")}
            aria-label={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary h-12 w-full" disabled={busy}>
            {busy && <Spinner />}
            {mode === "in" ? t("signIn") : t("signUp")}
          </button>
        </form>

        <p className={`mt-4 min-h-5 text-center text-[13px] ${message?.ok ? "text-muted" : "text-accent"}`} aria-live="polite">
          {message ? t(message.key) : ""}
        </p>

        <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
          <button className="hover:text-ink" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? `${t("noAccount")} ` : `${t("haveAccount")} `}
            <span className="text-ink underline underline-offset-4">{mode === "in" ? t("signUp") : t("signIn")}</span>
          </button>
          {mode === "in" && (
            <button className="hover:text-ink" onClick={reset}>
              {t("forgot")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
