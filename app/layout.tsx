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
    "AI-powered news aggregation platform for crypto, stocks, and derivatives trading with sentiment analysis and trading signals. Track market-moving news in real-time.",
  keywords: ["trading news", "crypto news", "stock market", "sentiment analysis", "trading signals", "market intelligence", "financial news"],
  authors: [{ name: "WatchCatalyst" }],
  creator: "WatchCatalyst",
  publisher: "WatchCatalyst",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://watchcatalyst.xyz",
    siteName: "WatchCatalyst",
    title: "WatchCatalyst - Real-time Trading News Intelligence",
    description: "AI-powered news aggregation platform for crypto, stocks, and derivatives trading with sentiment analysis and trading signals.",
    images: [
      {
        url: "/favicon.png",
        width: 512,
        height: 512,
        alt: "WatchCatalyst Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchCatalyst - Real-time Trading News Intelligence",
    description: "AI-powered news aggregation platform for crypto, stocks, and derivatives trading.",
    images: ["/favicon.png"],
  },
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
      {
        url: "/favicon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/favicon.png",
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
