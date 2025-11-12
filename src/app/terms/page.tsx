import type { Metadata } from "next"

const commitments = [
  {
    title: "Using Where2Meet",
    details: [
      "You must only invite people who have consented to share their approximate location.",
      "Do not attempt to reverse-engineer other participants’ exact addresses or track them outside the product.",
      "You are responsible for what you post inside shared plans, including event names and notes.",
    ],
  },
  {
    title: "Availability & changes",
    details: [
      "Where2Meet is provided on an as-is basis; outages or feature changes may occur without notice.",
      "We may update these terms when we launch new capabilities—continued use means you accept the latest version.",
      "Feedback is always welcome; send product ideas or issues to support@where2meet.net.",
    ],
  },
  {
    title: "Liability",
    details: [
      "Where2Meet suggests meeting points based on user-provided data; you decide whether a location is safe or appropriate.",
      "We are not liable for travel arrangements, costs, or damages that occur during meetings coordinated via the product.",
      "If you believe someone is abusing the platform, please contact us so we can investigate.",
    ],
  },
]

export const metadata: Metadata = {
  title: "Terms of Service — Where2Meet",
  description: "Understand the guidelines for hosting or joining meetup plans on Where2Meet.",
}

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 text-gray-900 dark:text-gray-100 sm:px-6 lg:px-8">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
          Terms
        </p>
        <h1 className="text-4xl font-bold leading-tight">Simple rules for fair planning</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          These Terms of Service explain how you may use Where2Meet. By creating or joining an event, you confirm that
          you understand and accept the guidelines below.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-white/50 bg-white/70 p-8 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/50">
        {commitments.map((section) => (
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

      <section className="rounded-2xl border border-indigo-200/40 bg-indigo-50/80 p-8 text-center shadow-sm dark:border-indigo-400/20 dark:bg-indigo-950/30">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
          Questions or disputes
        </p>
        <p className="mt-3 text-base text-gray-700 dark:text-gray-200">
          If a conflict arises, email{" "}
          <a href="mailto:support@where2meet.net" className="font-semibold text-indigo-600 underline dark:text-indigo-300">
            support@where2meet.net
          </a>{" "}
          with details. We review every report and may suspend accounts or links that violate these terms.
        </p>
      </section>
    </div>
  )
}
