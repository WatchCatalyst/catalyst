"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { useMagnetic } from "@/hooks/use-magnetic"
import { cn } from "@/lib/utils"

interface MagneticButtonProps extends ButtonProps {
  magneticDistance?: number
  children?: React.ReactNode
}

export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, className, magneticDistance = 20, ...props }, ref) => {
    const magneticRef = useMagnetic({ distance: magneticDistance })

    return (
      <Button
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          if (node) (magneticRef as React.MutableRefObject<HTMLElement | null>).current = node
        }}
        className={cn("magnetic-button", className)}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

MagneticButton.displayName = "MagneticButton"
