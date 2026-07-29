"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors outline-none",
        "data-[state=checked]:bg-[var(--rx-accent)] data-[state=checked]:border-[var(--rx-accent)]",
        "data-[state=unchecked]:bg-[#2c2824] data-[state=unchecked]:border-[rgba(235,220,200,0.18)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--rx-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rx-bg-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full shadow-sm transition-transform",
          "bg-[#f5ebe0]",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
