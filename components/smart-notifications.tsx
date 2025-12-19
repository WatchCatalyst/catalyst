"use client"

import { useEffect, useRef } from "react"
import type { NewsItem } from "@/app/page"
import { isPortfolioMatch, type PortfolioAsset } from "@/lib/portfolio-utils"

type SmartNotificationsProps = {
  news: NewsItem[]
  portfolio: Array<{ symbol: string; type: string }> | PortfolioAsset[]
}

/**
 * Smart Browser Notifications component
 * Watches news articles and sends system notifications for critical news
 * Criteria: score >= 85 OR (isPortfolioMatch && score >= 60)
 */
export function SmartNotifications({ news, portfolio }: SmartNotificationsProps) {
  const seenArticleIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef<boolean>(true)
  const permissionRef = useRef<NotificationPermission | null>(null)

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.log("[SmartNotifications] Browser notifications are not supported")
      return
    }

    // Request permission if not already set
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        permissionRef.current = permission
        if (permission === "granted") {
          console.log("[SmartNotifications] Notification permission granted")
        } else {
          console.log("[SmartNotifications] Notification permission denied")
        }
      })
    } else {
      permissionRef.current = Notification.permission
    }
  }, [])

  // Watch news array for new articles
  useEffect(() => {
    if (!news || news.length === 0) return
    if (typeof window === "undefined") return
    if (Notification.permission !== "granted") return

    // On first load, just populate the Set (DO NOT notify)
    if (isInitialLoadRef.current) {
      news.forEach((article) => {
        seenArticleIdsRef.current.add(article.id)
      })
      isInitialLoadRef.current = false
      console.log(`[SmartNotifications] Initial load: tracking ${seenArticleIdsRef.current.size} articles`)
      return
    }

    // On subsequent updates, check for new articles
    const newArticles = news.filter((article) => !seenArticleIdsRef.current.has(article.id))

    if (newArticles.length > 0) {
      console.log(`[SmartNotifications] Found ${newArticles.length} new article(s)`)

      newArticles.forEach((article) => {
        // Mark as seen immediately to avoid duplicate notifications
        seenArticleIdsRef.current.add(article.id)

        // Check notification criteria
        const score = article.relevanceScore || 0
        const isPortfolioRelevant = isPortfolioMatch(article, portfolio as PortfolioAsset[])
        const shouldNotify =
          score >= 85 || // High-impact news
          (isPortfolioRelevant && score >= 60) // Portfolio-relevant with decent score

        if (shouldNotify) {
          try {
            const notification = new Notification(article.title, {
              body: article.summary || article.title,
              icon: "/icon-dark-32x32.png",
              badge: "/icon-dark-32x32.png",
              tag: article.id, // Prevent duplicate notifications for same article
              requireInteraction: false,
              silent: false, // Play system sound
            })

            // Optional: Play a subtle sound (using Web Audio API)
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              const oscillator = audioContext.createOscillator()
              const gainNode = audioContext.createGain()

              oscillator.connect(gainNode)
              gainNode.connect(audioContext.destination)

              oscillator.frequency.value = 800
              oscillator.type = "sine"
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

              oscillator.start(audioContext.currentTime)
              oscillator.stop(audioContext.currentTime + 0.3)
            } catch (audioError) {
              // Sound is optional, fail silently
              console.log("[SmartNotifications] Could not play notification sound:", audioError)
            }

            // Click handler: focus the window and scroll to the article
            notification.onclick = () => {
              window.focus()
              const element = document.getElementById(`news-${article.id}`)
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" })
                // Highlight the article briefly
                element.classList.add("ring-2", "ring-accent-bright", "ring-offset-2")
                setTimeout(() => {
                  element.classList.remove("ring-2", "ring-accent-bright", "ring-offset-2")
                }, 2000)
              }
              notification.close()
            }

            // Auto-close after 5 seconds
            setTimeout(() => {
              notification.close()
            }, 5000)

            console.log(
              `[SmartNotifications] Sent notification for: "${article.title.substring(0, 50)}..." (score: ${score}, portfolio: ${isPortfolioRelevant})`,
            )
          } catch (error) {
            console.error("[SmartNotifications] Failed to send notification:", error)
          }
        }
      })
    }
  }, [news, portfolio])

  // This component doesn't render anything
  return null
}

