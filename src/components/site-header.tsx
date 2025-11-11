'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <header className="border-b border-white/20 bg-transparent">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src="/icon.svg" alt="Where2Meet logo" width={40} height={40} className="h-10 w-10" priority />
          <span className="text-lg font-semibold tracking-tight">Where2Meet</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-white/80">
          {isHomePage ? (
            <>
              <Link href="#join" className="hover:text-white">
                Join
              </Link>
              <Link href="#faq" className="hover:text-white">
                FAQ
              </Link>
              <Link href="#recent" className="hover:text-white">
                Recent plans
              </Link>
              <Link href="mailto:support@where2meet.net" className="hover:text-white">
                support@where2meet.net
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <Link href="mailto:support@where2meet.net" className="hover:text-white">
                support@where2meet.net
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
