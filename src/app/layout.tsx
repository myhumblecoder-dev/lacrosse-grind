import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import AccountControl from "@/components/AccountControl";
import PlayerSwitcher from "@/components/PlayerSwitcher";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ensureDefaultPlayer } from "@/app/actions/ensureDefaultPlayer";
import { switchPlayer } from "@/app/actions/switchPlayer";
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

// The layout reads the session and the active-player cookie on every request.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolved here, in a server component, so the header knows who you are
  // without every page having to tell it.
  const session = await auth();

  // Epic 6: signed-in accounts always have a player before any page renders —
  // ensureDefaultPlayer migrates pre-multiplayer rows on first sight — and the
  // header gets the switcher, fed by the active-player cookie.
  let playerSwitcher: React.ReactNode | undefined;
  if (session?.user) {
    await ensureDefaultPlayer();
    const players = await prisma.player.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    const activePlayerId =
      (await cookies()).get("x-active-player-id")?.value ?? players[0]?.id ?? "";
    playerSwitcher = (
      <PlayerSwitcher
        players={players}
        activePlayerId={activePlayerId}
        switchPlayer={switchPlayer}
      />
    );
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <AppShell
          signedIn={Boolean(session?.user)}
          account={<AccountControl signedIn={Boolean(session?.user)} />}
          playerSwitcher={playerSwitcher}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}