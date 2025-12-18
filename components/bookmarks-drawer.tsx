import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bookmark, X, ExternalLink, Clock } from 'lucide-react'
import type { NewsItem } from "@/app/page"
import { Badge } from "@/components/ui/badge"

type BookmarksDrawerProps = {
  bookmarkedIds: Set<string>
  news: NewsItem[]
  onRemoveBookmark: (id: string) => void
}

export function BookmarksDrawer({ bookmarkedIds, news, onRemoveBookmark }: BookmarksDrawerProps) {
  // Find all bookmarked articles from the current news feed
  // Note: In a real app with pagination, you might need to fetch these separately if they aren't in the current feed
  const bookmarkedArticles = news.filter(item => bookmarkedIds.has(item.id))

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Bookmark className="h-4 w-4" />
          <span className="hidden sm:inline">Bookmarks</span>
          {bookmarkedIds.size > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent-bright text-[10px] font-bold text-black flex items-center justify-center">
              {bookmarkedIds.size}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-accent-bright" />
            Saved Articles
          </SheetTitle>
          <SheetDescription>
            Your personal collection of market catalysts.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          {bookmarkedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
              <Bookmark className="h-12 w-12 mb-4 opacity-20" />
              <p>No bookmarks yet.</p>
              <p className="text-sm">Save articles to read them later.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {bookmarkedArticles.map(article => (
                <div key={article.id} className="group relative bg-muted/30 rounded-lg p-3 border border-border hover:border-accent-bright/30 transition-colors">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {article.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveBookmark(article.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group-hover:text-accent-bright transition-colors"
                  >
                    <h4 className="font-medium text-sm leading-snug mb-2 line-clamp-2">
                      {article.title}
                    </h4>
                  </a>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{article.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(article.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {bookmarkedIds.size > bookmarkedArticles.length && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  {bookmarkedIds.size - bookmarkedArticles.length} older bookmarks not shown
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
