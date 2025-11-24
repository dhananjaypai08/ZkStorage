"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-600 text-white",
        secondary:
          "border-transparent bg-zinc-800 text-zinc-300",
        destructive:
          "border-transparent bg-red-600 text-white",
        outline:
          "border-white/20 text-zinc-300",
        success:
          "border-transparent bg-emerald-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
