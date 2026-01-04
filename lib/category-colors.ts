import type { NewsCategory } from "@/app/page"

export const categoryColors: Record<NewsCategory, { bg: string; text: string; border: string }> = {
  all: {
    bg: "bg-accent/10",
    text: "text-accent-bright",
    border: "border-accent-bright/20",
  },
  crypto: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
  },
  stocks: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  technology: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
  },
  war: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
  },
  politics: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
    border: "border-indigo-500/20",
  },
  animals: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
  },
  sports: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/20",
  },
}

export function getCategoryColor(category: NewsCategory) {
  return categoryColors[category] || categoryColors.all
}
