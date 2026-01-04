import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type NewsCardSkeletonProps = {
  compact?: boolean
}

export function NewsCardSkeleton({ compact = false }: NewsCardSkeletonProps) {
  if (compact) {
    return (
      <Card className="bg-zinc-950/50 backdrop-blur-sm animate-fade-in-up">
        <CardContent className="p-3 flex items-center gap-4">
          <Skeleton className="h-8 w-24 rounded-full skeleton-advanced" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 skeleton-advanced" />
            <Skeleton className="h-3 w-1/2 skeleton-advanced" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md skeleton-advanced" />
            <Skeleton className="h-8 w-8 rounded-md skeleton-advanced" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm animate-fade-in-up">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-full skeleton-advanced" />
                <Skeleton className="h-6 w-4/5 skeleton-advanced" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full skeleton-advanced" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full skeleton-advanced" />
              <Skeleton className="h-4 w-full skeleton-advanced" />
              <Skeleton className="h-4 w-2/3 skeleton-advanced" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-md skeleton-advanced" />
              <Skeleton className="h-5 w-16 rounded-md skeleton-advanced" />
              <Skeleton className="h-5 w-24 rounded-md skeleton-advanced" />
            </div>
          </div>
          <div className="md:w-64 space-y-3">
            <Skeleton className="h-20 w-full rounded-lg skeleton-advanced" />
            <Skeleton className="h-10 w-full rounded-md skeleton-advanced" />
            <Skeleton className="h-9 w-full rounded-md skeleton-advanced" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
