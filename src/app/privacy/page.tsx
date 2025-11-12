import type { Metadata } from "next"

const sections = [
  {
    title: "Information we collect",
    details: [
      "Location pins or addresses you submit to generate fair meetup suggestions.",
      "Optional event details such as titles, notes, or expected participants.",
      "Technical data (browser, device type) that helps keep Where2Meet reliable.",
    ],
  },
  {
    title: "How we use your information",
    details: [
      "Generate AI-powered midpoint recommendations that work for everyone.",
      "Surface recent plans on your device so you can revisit or duplicate them.",
      "Debug performance issues, prevent abuse, and keep the experience fast.",
    ],
  },
  {
    title: "Your choices & control",
    details: [
      "No accounts are required; you can erase your local history by clearing browser data.",
      "You decide which event links you share—participants keep control of their own location.",
      "Request help or deletion assistance anytime at support@where2meet.net.",
    ],
  },
]

export const metadata: Metadata = {
  title: "Privacy Policy — Where2Meet",
  description:
    "Learn how Where2Meet protects the minimal data we collect to plan fair meetups without accounts.",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 text-gray-900 dark:text-gray-100 sm:px-6 lg:px-8">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-600 dark:text-pink-300">
          Privacy
        </p>
        <h1 className="text-4xl font-bold leading-tight">We keep planning data lightweight by design</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          Where2Meet only stores what’s required to calculate fair meetup options and never forces sign-ups.
          This page describes the limited data we touch and how you control it.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-white/50 bg-white/70 p-8 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/50">
        {sections.map((section) => (
          <article key={section.title} className="space-y-3">
            <h2 className="text-2xl font-semibold">{section.title}</h2>
            <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {section.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-pink-200/40 bg-pink-50/80 p-8 text-center shadow-sm dark:border-pink-400/20 dark:bg-pink-950/30">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-pink-600 dark:text-pink-300">
          Need something removed?
        </p>
        <p className="mt-3 text-base text-gray-700 dark:text-gray-200">
          Reach the team at{" "}
          <a href="mailto:support@where2meet.net" className="font-semibold text-pink-600 underline dark:text-pink-300">
            support@where2meet.net
          </a>{" "}
          for any privacy requests or questions. We respond quickly and handle every request manually.
        </p>
      </section>
    </div>
  )
}
