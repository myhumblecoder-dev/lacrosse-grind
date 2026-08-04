import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
};

const NAV = [
  { href: "/", label: "Today" },
  { href: "/lanes", label: "Lanes" },
  { href: "/boss-battles", label: "Battles" },
  { href: "/reflection", label: "Reflect" },
  { href: "/history", label: "History" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative bg-zinc-950 text-zinc-100">
        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-900/90 px-4 py-3 backdrop-blur">
          <ul className="mx-auto flex max-w-md items-center justify-around">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </body>
    </html>
  );
}
