"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { checkSystemStatus, type SystemStatus } from "@/app/actions/check-system-status"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function SystemHealth() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSystemStatus()
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  const allGood = status?.theNewsApi.configured && status?.fmpApi.configured

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-2 w-2 p-0 rounded-full ${allGood ? "bg-green-500/50" : "bg-red-500/50"}`}
          title="System Status"
        >
          <span className="sr-only">System Status</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>System Health</DialogTitle>
          <DialogDescription>Check the status of your API connections.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium">TheNewsAPI (Main Feed)</h4>
              <p className="text-xs text-muted-foreground">
                {status?.theNewsApi.configured ? "API Key Configured" : "Missing API Key"}
              </p>
            </div>
            {status?.theNewsApi.configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium">Financial Modeling Prep (Calendar)</h4>
              <p className="text-xs text-muted-foreground">
                {status?.fmpApi.configured ? "API Key Configured" : "Missing API Key"}
              </p>
            </div>
            {status?.fmpApi.configured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>

          {!allGood && (
            <div className="text-xs text-red-500 bg-red-500/10 p-3 rounded-md">
              Please add the missing keys in the "Vars" tab in the sidebar.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
