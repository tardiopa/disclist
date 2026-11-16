"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "@/components/auth";
import { Logo, Spinner } from "@/components/bits";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/dict";

/** Three separate screens, one job each. The URL carries which one (?mode=…). */
type Mode = "signin" | "signup" | "reset";

function errorKey(e: unknown): Key | null {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return null;
  if (code.includes("weak-password")) return "weakPassword";
  if (code.includes("email-already-in-use")) return "emailInUse";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found") || code.includes("invalid-email"))
    return "wrongCredentials";
  return "authError";
}

function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        {aside}
      </span>
      {children}
    </label>
  );
}

function GoogleButton({ disabled, onClick, label }: { disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="btn btn-ghost h-12 w-full bg-surface" disabled={disabled} onClick={onClick}>
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
      </svg>
      {label}
    </button>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [mode, setModeState] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const m = q.get("mode");
      setModeState(m === "signup" || q.get("new") !== null ? "signup" : m === "reset" ? "reset" : "signin");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  useEffect(() => {
    if (ready && user) router.replace("/collection");
  }, [ready, user, router]);

  // Switching screen keeps the email typed so far, clears everything else.
  const go = (m: Mode) => {
    setModeState(m);
    setError(null);
    setSent(false);
    setPassword("");
    setVisible(false);
    window.history.pushState(null, "", m === "signin" ? "/login" : `/login?mode=${m}`);
  };

  const attempt = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };

  const google = () => attempt(() => signInWithPopup(auth, new GoogleAuthProvider()));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset") {
      return attempt(async () => {
        await sendPasswordResetEmail(auth, email);
        setSent(true);
      });
    }
    attempt(() =>
      mode === "signin" ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password),
    );
  };

  const emailField = (
    <Field label={t("email")}>
      <input
        className="field h-12"
        type="email"
        required
        autoFocus
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </Field>
  );

  const errorLine = error && (
    <p className="text-[13.5px] text-accent" role="alert">
      {t(error)}
      {error === "emailInUse" && (
        <>
          {" · "}
          <button type="button" className="text-ink underline underline-offset-4" onClick={() => go("signin")}>
            {t("signInInstead")}
          </button>
        </>
      )}
    </p>
  );

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 pt-[12vh] pb-12">
      <Link href="/" className="mb-12 text-xl">
        <Logo />
      </Link>

      <div key={mode} className="anim-rise w-full max-w-sm">
        {mode === "reset" ? (
          sent ? (
            <div className="text-center">
              <MailCheck size={28} className="mx-auto text-accent" strokeWidth={1.5} />
              <h1 className="mt-5 text-[28px] leading-tight font-semibold tracking-[-0.03em]">{t("resetSentTitle")}</h1>
              <p className="mt-3 text-muted">
                {t("resetSentTo")} <span className="text-ink">{email}</span>.
              </p>
              <button className="btn btn-primary mt-8 h-12 w-full" onClick={() => go("signin")}>
                {t("backToSignIn")}
              </button>
            </div>
          ) : (
            <>
              <button className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink" onClick={() => go("signin")}>
                <ArrowLeft size={14} />
                {t("backToSignIn")}
              </button>
              <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">{t("resetTitle")}</h1>
              <p className="mt-2 text-muted">{t("resetHint")}</p>
              <form onSubmit={submit} className="mt-7 space-y-4">
                {emailField}
                {errorLine}
                <button className="btn btn-primary h-12 w-full" disabled={busy}>
                  {busy && <Spinner />}
                  {t("sendLink")}
                </button>
              </form>
            </>
          )
        ) : (
          <>
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">{t(mode === "signin" ? "signInTitle" : "signUpTitle")}</h1>
            <p className="mt-2 text-muted">
              {t(mode === "signin" ? "noAccount" : "haveAccount")}{" "}
              <button className="text-ink underline underline-offset-4" onClick={() => go(mode === "signin" ? "signup" : "signin")}>
                {t(mode === "signin" ? "signUp" : "signIn")}
              </button>
            </p>

            <div className="mt-7">
              <GoogleButton disabled={busy} onClick={google} label={t("continueGoogle")} />
            </div>
            <div className="label my-6 flex items-center gap-4 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t("or")}</div>

            <form onSubmit={submit} className="space-y-4">
              {emailField}
              <Field
                label={t("password")}
                aside={
                  mode === "signin" ? (
                    <button type="button" className="text-muted hover:text-ink" onClick={() => go("reset")}>
                      {t("forgot")}
                    </button>
                  ) : (
                    <span className="text-muted">{t("passwordHint")}</span>
                  )
                }
              >
                <span className="relative block">
                  <input
                    className="field h-12 pr-20"
                    type={visible ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-4 text-[13px] text-muted hover:text-ink"
                    onClick={() => setVisible((v) => !v)}
                  >
                    {t(visible ? "hide" : "show")}
                  </button>
                </span>
              </Field>
              {errorLine}
              <button className="btn btn-primary h-12 w-full" disabled={busy}>
                {busy && <Spinner />}
                {t(mode === "signin" ? "signIn" : "createMyAccount")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
