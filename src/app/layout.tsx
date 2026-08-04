import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SidebarNav from "@/components/SidebarNav";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-zinc-950 text-zinc-100">
        <SidebarNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}