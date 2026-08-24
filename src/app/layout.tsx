import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import AccountControl from "@/components/AccountControl";
import { auth } from "@/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lacrosse Grind",
  description: "Daily training companion — effort over outcome.",
  // Belt and braces with robots.txt. A URL linked from elsewhere — the
  // marketing page links straight here — can be listed without ever being
  // crawled, so the disallow alone would not keep it out of results.
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolved here, in a server component, so the header knows who you are
  // without every page having to tell it.
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <AppShell account={<AccountControl signedIn={Boolean(session?.user)} />}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}