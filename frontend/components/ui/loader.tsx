"use client"

import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  variant?: "spin" | "bounce" | "pulse"
  className?: string
}

export function Loader({ size = "md", variant = "spin", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  if (variant === "bounce") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-cyan-400",
              size === "sm" ? "h-1.5 w-1.5" : size === "md" ? "h-2 w-2" : "h-2.5 w-2.5"
            )}
            style={{
              animation: "bounce 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full bg-cyan-400/50 animate-pulse",
          className
        )}
      />
    )
  }

  return (
    <svg
      className={cn(sizeClasses[size], "animate-spin text-cyan-400", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ progress, className, showLabel = false }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-zinc-400 text-right">{Math.round(progress)}%</p>
      )}
    </div>
  )
}
