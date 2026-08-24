import LegalPage from "@/components/LegalPage"
import { LEGAL } from "@/lib/legal"

export const metadata = { title: "Privacy — Lacrosse Grind" }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        {LEGAL.product} is run by {LEGAL.company}. It is a training log for a
        young athlete, so most of what it holds is about a child. This page says
        exactly what that is, where it goes, and how to get rid of it.
      </p>

      <h2>What we collect</h2>
      <p>Two things, and nothing else.</p>
      <ul>
        <li>
          <strong>From Google, when you sign in:</strong> your name, email
          address and profile picture. We never see your Google password.
        </li>
        <li>
          <strong>What you create in the app:</strong> your training lanes and
          their weekly targets, the days you checked in and whether each was a
          rest day, boss battles and their challenges, streak freezes, and your
          prize — its title, description, reasons and photo if you add one.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>No analytics, no tracking pixels, no advertising, no third-party scripts.</li>
        <li>No location, no contacts, no device identifiers.</li>
        <li>Nothing at all if you are just looking around — the demo is generated and touches no database.</li>
      </ul>

      <h2>What the coach is told</h2>
      <p>
        Boss challenges and victory notes are written by an AI model run by
        Anthropic. It is sent only the name and emoji of the lane, the rank
        name, the text of the challenge, and how many bosses have been beaten.
      </p>
      <p>
        <strong>
          It is never sent a name, an email address, a photo, or a check-in
          history.
        </strong>{" "}
        It has no memory between requests and cannot be chatted with. If you
        would rather nothing left the app at all, simply do not use the boss
        battles — everything else works without them.
      </p>

      <h2>Where it lives</h2>
      <p>
        In a hosted PostgreSQL database and, for prize photos, in file storage —
        both in {LEGAL.dataRegion}. The app is hosted on Vercel. Prize photos
        are stored at an unlisted public URL, which means anyone given that link
        could open it, so please do not upload anything you would mind a
        stranger seeing.
      </p>

      <h2>Who else sees it</h2>
      <p>
        Nobody. We do not sell, rent or share it. Four companies process it
        because they run the machinery: Google (sign-in), Vercel (hosting and
        photo storage), Neon (the database) and Anthropic (the coach text
        described above). We may disclose data if the law requires it.
      </p>

      <h2>Children</h2>
      <p>
        Accounts are for adults. A parent or guardian creates the account and is
        responsible for it; a child uses it with them. We do not knowingly let
        children under 13 create their own accounts or collect their personal
        information directly.
      </p>
      <p>
        If you believe a child has created an account without a parent, email us
        at <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> and
        we will delete it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete it. There is no scheduled purge and no archive: the
        data stays as long as the account does.
      </p>

      <h2>Deleting everything</h2>
      <p>
        Sign in, open <strong>Account</strong>, and use “Delete this account”.
        It removes the account and every lane, check-in, boss battle, streak
        freeze, prize and stored photo along with it, immediately and
        permanently. Nothing is kept back and there is no copy to restore from,
        so please be certain.
      </p>

      <h2>Cookies</h2>
      <p>
        One, for keeping you signed in, plus a short-lived one that protects the
        sign-in form. No advertising or tracking cookies. Signing out clears
        them.
      </p>

      <h2>Changes</h2>
      <p>
        If this page changes in a way that matters, the effective date at the
        top changes with it.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
      </p>
    </LegalPage>
  )
}
