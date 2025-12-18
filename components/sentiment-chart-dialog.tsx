"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import type { NewsItem } from "@/app/page"

type SentimentChartDialogProps = {
  news: NewsItem[]
}

export function SentimentChartDialog({ news }: SentimentChartDialogProps) {
  const [open, setOpen] = useState(false)

  const colors = {
    success: "#10b981", // green
    danger: "#ef4444", // red
    neutral: "#6b7280", // gray
    warning: "#f59e0b", // amber
  }

  // Calculate sentiment distribution
  const sentimentCounts = news.reduce(
    (acc, item) => {
      acc[item.sentiment]++
      return acc
    },
    { bullish: 0, bearish: 0, neutral: 0 }
  )

  const totalArticles = news.length

  const sentimentData = [
    {
      name: "Bullish",
      value: sentimentCounts.bullish,
      percentage: Math.round((sentimentCounts.bullish / totalArticles) * 100),
      color: colors.success,
    },
    {
      name: "Neutral",
      value: sentimentCounts.neutral,
      percentage: Math.round((sentimentCounts.neutral / totalArticles) * 100),
      color: colors.neutral,
    },
    {
      name: "Bearish",
      value: sentimentCounts.bearish,
      percentage: Math.round((sentimentCounts.bearish / totalArticles) * 100),
      color: colors.danger,
    },
  ]

  // Calculate category sentiment breakdown
  const categoryBreakdown = news.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { bullish: 0, bearish: 0, neutral: 0 }
    }
    acc[item.category][item.sentiment]++
    return acc
  }, {} as Record<string, { bullish: number; bearish: number; neutral: number }>)

  const categoryData = Object.entries(categoryBreakdown).map(([category, sentiments]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    bullish: sentiments.bullish,
    neutral: sentiments.neutral,
    bearish: sentiments.bearish,
  }))

  // Calculate market sentiment score (-100 to 100)
  const sentimentScore = Math.round(
    ((sentimentCounts.bullish - sentimentCounts.bearish) / totalArticles) * 100
  )

  const getScoreColor = () => {
    if (sentimentScore > 20) return "text-success"
    if (sentimentScore < -20) return "text-danger"
    return "text-warning"
  }

  const getScoreLabel = () => {
    if (sentimentScore > 40) return "Extremely Bullish"
    if (sentimentScore > 20) return "Bullish"
    if (sentimentScore > -20) return "Neutral"
    if (sentimentScore > -40) return "Bearish"
    return "Extremely Bearish"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-accent-bright/10 border-accent-bright/20 hover:bg-accent-bright/20">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Market Sentiment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6 text-accent-bright" />
            Market Sentiment Analysis
          </DialogTitle>
          <DialogDescription>
            Real-time sentiment analysis across {totalArticles} articles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Sentiment Score */}
          <Card className="bg-card/50 backdrop-blur-sm border-accent-bright/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overall Market Sentiment</p>
                  <p className={`text-4xl font-bold ${getScoreColor()}`}>{sentimentScore}</p>
                  <p className={`text-sm font-medium mt-1 ${getScoreColor()}`}>{getScoreLabel()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-2xl font-bold text-success">{sentimentCounts.bullish}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Minus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-muted-foreground">{sentimentCounts.neutral}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-danger" />
                    <span className="text-2xl font-bold text-danger">{sentimentCounts.bearish}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Distribution Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #666",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                    labelStyle={{
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700",
                      marginBottom: "4px"
                    }}
                    itemStyle={{
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sentiment by Category</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="category" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #666",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                    labelStyle={{
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700",
                      marginBottom: "4px"
                    }}
                    itemStyle={{
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="bullish" stackId="a" fill={colors.success} name="Bullish" />
                  <Bar dataKey="neutral" stackId="a" fill={colors.neutral} name="Neutral" />
                  <Bar dataKey="bearish" stackId="a" fill={colors.danger} name="Bearish" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Insights */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent-bright">•</span>
                  <span>
                    <strong className="text-foreground">{sentimentData[0].percentage}%</strong> of articles show{" "}
                    {sentimentData[0].name.toLowerCase()} sentiment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-bright">•</span>
                  <span>
                    The <strong className="text-foreground">{categoryData[0]?.category || "crypto"}</strong> category has the most coverage
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-bright">•</span>
                  <span>
                    Market sentiment is currently <strong className={getScoreColor().replace("text-", "")}>{getScoreLabel().toLowerCase()}</strong> with a score of{" "}
                    <strong className="text-foreground">{sentimentScore}</strong>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
