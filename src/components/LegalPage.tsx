import Link from "next/link"
import { LEGAL } from "@/lib/legal"

interface LegalPageProps {
  title: string
  children: React.ReactNode
}

/**
 * The frame both legal pages share.
 *
 * Deliberately plain: these are read by someone deciding whether to trust the
 * app with a child's training record, and the one thing they should be able to
 * do is read them.
 */
export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {LEGAL.product} · {LEGAL.company} · Effective {LEGAL.effectiveDate}
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-300 [&_a]:text-green-400 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
      </div>

      <nav className="flex gap-4 border-t border-zinc-800 pt-6 text-sm">
        <Link href="/privacy" className="text-zinc-400 hover:text-zinc-100">
          Privacy
        </Link>
        <Link href="/terms" className="text-zinc-400 hover:text-zinc-100">
          Terms
        </Link>
        <Link href="/" className="text-zinc-400 hover:text-zinc-100">
          Back to the app
        </Link>
      </nav>
    </main>
  )
}
