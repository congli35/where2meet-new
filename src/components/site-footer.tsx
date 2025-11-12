'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function SiteFooter() {
  const pathname = usePathname()
  const isHomePage = pathname === "/"
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-pink-200/30 dark:border-pink-400/20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 text-gray-900 dark:text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
          <Image src="/icon.svg" alt="Where2Meet logo" width={40} height={40} className="h-10 w-10" priority />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">Where2Meet</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Fair meetup planning for everyone</span>
          </div>
        </Link>
        <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300 sm:items-end">
          <p className="text-center text-xs text-gray-600 dark:text-gray-400 sm:text-right">
            © {currentYear} Where2Meet. Built for collaborative planning without the hassle.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-700 dark:text-gray-300 sm:justify-end">
            {isHomePage ? (
              <>
                <Link href="#join" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Join
                </Link>
                <Link href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  FAQ
                </Link>
                <Link href="#recent" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Recent plans
                </Link>
              </>
            ) : (
              <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Home
              </Link>
            )}
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Terms
            </Link>
            <a
              href="mailto:support@where2meet.net"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              support@where2meet.net
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
