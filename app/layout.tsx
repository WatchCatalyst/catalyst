import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/toaster"
import { AuroraBackground } from "@/components/aurora-background"
import { Spotlight } from "@/components/spotlight"
import "@/styles/globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WatchCatalyst - Real-time Trading News Intelligence",
  description:
    "AI-powered news aggregation platform for crypto, stocks, and derivatives trading with sentiment analysis and trading signals",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <AuroraBackground />
        <Spotlight />
        <div className="fixed inset-0 arc-grid pointer-events-none z-0 opacity-30" />
        <div className="scanline" />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
