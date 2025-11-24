"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useCallback } from "react"
import { gsap } from "gsap"

const TRANSITION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"

const playTransitionSound = () => {
  if (typeof window === "undefined") return
  try {
    const audio = new Audio(TRANSITION_SOUND_URL)
    audio.volume = 0.3
    audio.playbackRate = 1.2
    audio.play().catch(() => {})
    setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
    }, 800)
  } catch {
    // Silently fail
  }
}

export function TransitionOverlay() {
  const containerRef = useRef<HTMLDivElement>(null)
  const wipeRef = useRef<HTMLDivElement>(null)
  const logoContainerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const isAnimating = useRef(false)

  const runTransition = useCallback(() => {
    if (!containerRef.current || !wipeRef.current || !logoRef.current || !logoContainerRef.current || !shineRef.current) return
    if (isAnimating.current) return

    isAnimating.current = true
    playTransitionSound()

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false
        gsap.set(containerRef.current, { visibility: "hidden" })
      }
    })

    gsap.set(containerRef.current, { visibility: "visible" })
    gsap.set(wipeRef.current, { x: "-100%" })
    gsap.set(logoContainerRef.current, { opacity: 1 })
    gsap.set(logoRef.current, { scale: 0.5, rotation: -90, opacity: 1 })
    gsap.set(shineRef.current, { x: "-100%", opacity: 0 })

    tl.to(wipeRef.current, {
      x: "0%",
      duration: 0.35,
      ease: "power2.inOut",
    })

    tl.to(logoContainerRef.current, {
      opacity: 1,
      duration: 0.2,
      ease: "power2.out",
    }, "-=0.20")

    tl.to(logoRef.current, {
      scale: 1,
      rotation: 0,
      duration: 0.25,
      ease: "back.out(1.4)",
    }, "-=0.15")

    tl.to(shineRef.current, {
      x: "200%",
      opacity: 1,
      duration: 0.20,
      ease: "power2.inOut",
    }, "-=0.1")

    tl.to({}, { duration: 0.05 })

    tl.to(logoRef.current, {
      scale: 1.2,
      opacity: 0,
      duration: 0.08,
      ease: "power2.in",
    })

    tl.to(logoContainerRef.current, {
      opacity: 0,
      duration: 0.15,
    }, "<")

    tl.to(wipeRef.current, {
      x: "100%",
      duration: 0.30,
      ease: "power2.inOut",
    }, "-=0.15")
  }, [])

  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    runTransition()
  }, [pathname, runTransition])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      <div
        ref={wipeRef}
        className="absolute inset-0 bg-zinc-950"
        style={{ transform: "translateX(-100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/50 via-zinc-950 to-zinc-900" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(6, 182, 212, 0.5) 10px,
              rgba(6, 182, 212, 0.5) 11px
            )`,
          }}
        />
        <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-l from-cyan-500/30 to-transparent" />
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-r from-cyan-400/20 to-transparent" />
      </div>

      <div
        ref={logoContainerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 1 }}
      >
        <div
          ref={logoRef}
          className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-cyan-500/30 flex items-center justify-center shadow-2xl overflow-hidden"
          style={{ transform: "scale(0.5) rotate(-90deg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
          <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-cyan-400 relative z-10">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div
            ref={shineRef}
            className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
            style={{ transform: "translateX(-100%)", opacity: 0 }}
          />
        </div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${10 + i * 11}%`,
              top: `${20 + (i % 4) * 18}%`,
              opacity: 0.4 - (i * 0.03),
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
