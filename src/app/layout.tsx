import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";
import { cookies, headers } from "next/headers";
import { AuthProvider } from "@/components/auth";
import { I18nProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/dict";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: "Disclist",
  description: "Your vinyl collection and wishlist, as good online as on the shelf.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1eee8" },
    { media: "(prefers-color-scheme: dark)", color: "#100f0e" },
  ],
};

async function detectLang(): Promise<Lang> {
  const saved = (await cookies()).get("lang")?.value;
  if (saved === "fr" || saved === "en") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.trim().toLowerCase().startsWith("fr") ? "fr" : "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await detectLang();
  return (
    <html lang={lang} className={`${grotesk.variable} ${plex.variable}`}>
      <body>
        <I18nProvider initial={lang}>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
