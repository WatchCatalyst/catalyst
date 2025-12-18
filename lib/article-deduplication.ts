export function deduplicateArticles<T extends { title: string; summary: string }>(articles: T[]): T[] {
  const seen = new Map<string, T>()
  
  articles.forEach(article => {
    // Create a normalized fingerprint of the article
    const fingerprint = createFingerprint(article.title, article.summary)
    
    // Only keep the first occurrence
    if (!seen.has(fingerprint)) {
      seen.set(fingerprint, article)
    }
  })
  
  return Array.from(seen.values())
}

function createFingerprint(title: string, summary: string): string {
  // Normalize text: lowercase, remove punctuation, remove common words
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'more', 'than'].includes(word))
      .slice(0, 10) // Take first 10 meaningful words
      .sort() // Sort for order-independence
      .join(' ')
  }
  
  const titleFingerprint = normalize(title)
  const summaryFingerprint = normalize(summary).substring(0, 100)
  
  return `${titleFingerprint}|${summaryFingerprint}`
}

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}
