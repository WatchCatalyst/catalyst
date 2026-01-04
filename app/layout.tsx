import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, JetBrains_Mono, Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/toaster"
import { AuroraBackground } from "@/components/aurora-background"
import { Spotlight } from "@/components/spotlight"
import "@/styles/globals.css"

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

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
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
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
