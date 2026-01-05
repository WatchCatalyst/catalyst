"use client"

import { useState } from "react"
import { useUser } from "@/hooks/use-user"
import { signInWithGoogle, signOut } from "@/lib/supabase/auth-actions"
import { useToast } from "@/hooks/use-toast"

/**
 * Google Sign-in Button
 * Style matches the reference: white background, Google "G" icon, "Sign in" text
 * 
 * When signed in, shows user avatar with dropdown to sign out
 */
export function AuthButton() {
  const { user, loading } = useUser()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const { url, error } = await signInWithGoogle()
      
      if (error) {
        toast({
          title: "Sign in failed",
          description: error,
          variant: "destructive",
        })
        return
      }
      
      if (url) {
        // Redirect to Google OAuth
        window.location.href = url
      }
    } catch (err) {
      console.error("Sign in error:", err)
      toast({
        title: "Sign in failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      const { error } = await signOut()
      
      if (error) {
        toast({
          title: "Sign out failed",
          description: error,
          variant: "destructive",
        })
      } else {
        toast({ title: "Signed out successfully" })
        setShowDropdown(false)
        // Refresh the page to clear user state
        window.location.reload()
      }
    } catch (err) {
      console.error("Sign out error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state - show subtle skeleton
  if (loading) {
    return (
      <div className="h-8 w-24 bg-white/10 rounded-md animate-pulse" />
    )
  }

  // Signed in - show avatar with dropdown
  if (user) {
    const initial = user.user_metadata?.name?.[0] || user.email?.[0] || "U"
    const avatarUrl = user.user_metadata?.avatar_url
    const displayName = user.user_metadata?.name || user.email?.split("@")[0] || "Account"

    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
          title={`Signed in as ${user.email}`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white">
              {initial.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-white font-medium max-w-[100px] truncate">
            {displayName}
          </span>
          <svg 
            className={`w-3 h-3 text-white/60 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg glass-premium border border-white/10 shadow-xl z-[100] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-xs text-white/60">Signed in as</p>
                <p className="text-sm text-white truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Not signed in - show Google sign-in button (matching reference style)
  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2 bg-white text-zinc-800 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Sign in with Google to sync your preferences"
    >
      {/* Google "G" Logo - Official colors */}
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? "Signing in..." : "Sign in"}
    </button>
  )
}
