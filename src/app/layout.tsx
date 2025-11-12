import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Toaster } from "@/components/ui/sonner"
import { GoogleAnalytics } from '@next/third-parties/google'

import "./globals.css"

export const metadata: Metadata = {
  title: "Where2Meet - Fair meetup planning for everyone",
  description: "Where2Meet helps groups find fair meeting locations instantly. No sign-ups needed—invite friends and get AI-powered spot recommendations.",
  keywords: ["where2meet", "meeting planner", "location finder", "group meetup", "AI meeting suggestions", "fair meeting point", "meetup organizer", "no signup", "share meeting location"],
  authors: [{ name: "Where2Meet" }],
  creator: "Where2Meet",
  publisher: "Where2Meet",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://where2meet.net",
    siteName: "Where2Meet",
    title: "Where2Meet - Fair meetup planning for everyone",
    description: "Where2Meet helps groups find fair meeting locations instantly. No sign-ups needed—invite friends and get AI-powered spot recommendations.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Where2Meet - Fair meetup planning",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Where2Meet - Fair meetup planning for everyone",
    description: "Where2Meet helps groups find fair meeting locations instantly. No sign-ups needed—invite friends and get AI-powered spot recommendations.",
    images: ["/og.png"],
    creator: "@where2meet",
    site: "@where2meet",
  },
  alternates: {
    canonical: "https://where2meet.net",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
					async
					src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3607695059683349"
					crossOrigin="anonymous"
				/>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is Where2Meet?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Where2Meet is a lightweight planning space that lets your group propose meeting locations, compare times, and finalize a meetup without endless chats. Whether you're organizing work meetings, social gatherings, or community events, Where2Meet's AI instantly identifies fair spots that work for everyone."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How does Where2Meet work from start to finish?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Creating a Where2Meet event is simple: First, you create an event with a title, purpose, and expected participants. Where2Meet generates a shareable link and 6-character code. Next, invite friends who join by adding their location—no sign-ups required. Once everyone joins, Where2Meet's AI analyzes all locations and instantly recommends fair meeting spots with distances, travel times, and nearby facilities. Finally, review the AI suggestions together and finalize your perfect meeting location. The entire process takes just minutes!"
                  }
                },
                {
                  "@type": "Question",
                  "name": "Do guests need an account to use Where2Meet?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No accounts are required—friends can instantly join your Where2Meet event with a 6-character code or shareable link and add their location in seconds. Where2Meet handles everything else for you."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can Where2Meet handle multiple plans?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. You can create unlimited Where2Meet events, revisit recent meeting plans, and duplicate the events that worked best. From weekly team meetups to group outings, Where2Meet scales with your needs."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What happens to my data if I clear my browser cache?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Where2Meet uses browser localStorage for simplicity and speed—no account or server login needed. Your local participation history is stored on your device. If you clear your browser cache, disable cookies, open Where2Meet in private/incognito mode, or switch to a different browser, your event history will be lost. However, event organizers can always share the Where2Meet code or link again, and you can rejoin anytime. For permanent access across devices, consider bookmarking the Where2Meet event link."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-100 to-purple-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 text-gray-900 dark:text-gray-100 antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        <Toaster />
        <GoogleAnalytics gaId="G-EH2F4J018H"/>
      </body>
    </html>
  )
}
