"use client"

import Link from "next/link"
import { useRef, useState, useEffect } from "react"
import { gsap } from "gsap"
import { Plus, ArrowRight, Shield, Lock, FileCheck } from "lucide-react"

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null)
  const pixelGridRef = useRef<HTMLDivElement>(null)
  const tagsRef = useRef<HTMLDivElement>(null)
  const customCursorRef = useRef<HTMLDivElement>(null)
  const [showCustomCursor, setShowCustomCursor] = useState(false)

  useEffect(() => {
    const tagsElement = tagsRef.current
    const cursorElement = customCursorRef.current

    if (!tagsElement || !cursorElement) return

    let cursorX = 0
    let cursorY = 0

    const handleMouseMove = (e: MouseEvent) => {
      cursorX = e.clientX
      cursorY = e.clientY

      gsap.to(cursorElement, {
        x: cursorX - 15,
        y: cursorY - 15,
        duration: 0.3,
        ease: "power2.out",
      })
    }

    const handleMouseEnter = () => {
      setShowCustomCursor(true)
    }

    const handleMouseLeave = () => {
      setShowCustomCursor(false)
    }

    tagsElement.addEventListener("mouseenter", handleMouseEnter)
    tagsElement.addEventListener("mouseleave", handleMouseLeave)
    tagsElement.addEventListener("mousemove", handleMouseMove)

    return () => {
      tagsElement.removeEventListener("mouseenter", handleMouseEnter)
      tagsElement.removeEventListener("mouseleave", handleMouseLeave)
      tagsElement.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const handleMouseLeave = () => {
    if (!cardRef.current || !pixelGridRef.current) return

    const gridSize = 4
    const pixelSize = 100 / gridSize

    pixelGridRef.current.innerHTML = ""

    const totalPixels = gridSize * gridSize
    const clearIndices = new Set<number>()
    while (clearIndices.size < 3) {
      clearIndices.add(Math.floor(Math.random() * totalPixels))
    }

    let pixelIndex = 0
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (clearIndices.has(pixelIndex)) {
          pixelIndex++
          continue
        }

        const pixel = document.createElement("div")
        const isCyan = Math.random() < 0.5

        const normalizedPosition = (col + (gridSize - 1 - row)) / ((gridSize - 1) * 2)
        const targetOpacity = 0.5 + normalizedPosition * 0.5

        pixel.className = `absolute ${isCyan ? "bg-cyan-600" : "bg-black"}`
        pixel.style.width = `${pixelSize}%`
        pixel.style.height = `${pixelSize}%`
        pixel.style.left = `${col * pixelSize}%`
        pixel.style.top = `${row * pixelSize}%`
        pixel.style.opacity = "0"
        pixel.style.display = "block"
        pixel.setAttribute("data-target-opacity", targetOpacity.toString())
        pixelGridRef.current!.appendChild(pixel)

        pixelIndex++
      }
    }

    const pixels = Array.from(pixelGridRef.current.children)
    const animationStepDuration = 0.18
    const actualPixelCount = pixels.length
    const staggerDuration = animationStepDuration / actualPixelCount

    const tl = gsap.timeline()

    tl.to(cardRef.current, {
      scale: 0.995,
      duration: 0.1,
      ease: "power2.in",
    })

    tl.to(
      pixels,
      {
        opacity: (_index, target) => {
          const el = target as HTMLElement
          return el.getAttribute("data-target-opacity") || "1"
        },
        duration: 0.18,
        ease: "power2.in",
        stagger: {
          each: staggerDuration,
          from: "random",
        },
      },
      "<",
    )

    tl.to(
      pixels,
      {
        opacity: 0,
        duration: 0.15,
        ease: "power2.out",
      },
      `+=${animationStepDuration * 0.5}`,
    )

    tl.to(
      cardRef.current,
      {
        scale: 1,
        duration: 0.15,
        ease: "power2.in",
      },
      "<",
    )

    tl.set(pixels, {
      display: "none",
    })
  }

  return (
    <section className="p-[1.5%] bg-zinc-950">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <mask id="heroMask" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="black" />
            <path
              d="M0 0.1474 V0.9863 C0 0.9938 0.0038 0.9996 0.0085 0.9996 H0.9912 C0.9958 0.9996 1 0.9863 1 0.9863 V0.0581 C1 0.0506 0.9958 0.0444 0.9912 0.0444 H0.9255 C0.9208 0.0444 0.9165 0.0383 0.9165 0.0307 V0.0149 C0.9165 0.0074 0.9132 0.0013 0.9084 0.0013 L0.2060 0.0000 C0.2012 -0.0000 0.1975 0.0061 0.1975 0.0137 V0.0312 C0.1975 0.0387 0.1936 0.0448 0.1889 0.0448 H0.0915 C0.0868 0.0448 0.0830 0.0510 0.0830 0.0585 V0.1201 C0.0830 0.1276 0.0792 0.1337 0.0745 0.1337 H0.0085 C0.0038 0.1337 0 0.1399 0 0.1474 Z"
              fill="white"
            />
          </mask>
        </defs>
      </svg>

      <div className="relative isolate w-full min-h-[calc(100svh-3vh)] sm:min-h-[calc(100svh-3vh)]">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            mask: "url(#heroMask)",
            WebkitMask: "url(#heroMask)",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/liquid-metal.mp4" type="video/mp4" />
          </video>

          <div
            className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
            style={{
              // backgroundImage: "url(/hero-noise-green.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
            <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
          </div>

          <div className="absolute bottom-6 left-6 right-6 max-w-[min(52rem,92vw)] md:bottom-8 md:left-8 z-10">
            <div
              ref={cardRef}
              onMouseLeave={handleMouseLeave}
              className="relative overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 transition-transform duration-500 ease-in hover:scale-[1.01]"
            >
              <div ref={pixelGridRef} className="absolute inset-0 pointer-events-none z-10" />

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400">Zero-Knowledge</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <Lock className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-medium text-white/70">Seal Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <FileCheck className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-medium text-white/70">Walrus Storage</span>
                </div>
              </div>

              <h1 className="text-balance text-3xl/tight sm:text-4xl/tight md:text-5xl/tight tracking-tight text-cyan-50">
                Verifiable Storage
                <br />
                <span className="text-cyan-400">Without Disclosure</span>
              </h1>
              <p className="mt-3 text-sm/6 text-cyan-100/85 max-w-prose">
                Store data privately with Walrus & Seal encryption. Generate ZK receipts proving compliance,
                consent, and retention without revealing content. Verify on-chain with Sui.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35 hover:scale-[1.02] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  Upload & Encrypt
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center rounded-full border border-cyan-400/50 bg-cyan-600/10 px-4 py-2 text-sm font-medium text-cyan-50 backdrop-blur hover:bg-cyan-600/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  Verify Receipt
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-[1.5%] top-[5%] z-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
              zkStorage
            </span>
          </Link>
        </div>

        <div ref={tagsRef} className="absolute top-[0.75%] left-1/2 -translate-x-1/2 z-20 cursor-none pb-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white font-normal">Powered by</span>
            <button className="rounded-full border border-white bg-transparent px-3 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors">
              Walrus
            </button>
            <Plus className="w-3 h-3 text-white stroke-[2.5]" />
            <button className="rounded-full border border-white bg-transparent px-3 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors">
              Seal
            </button>
            <Plus className="w-3 h-3 text-white stroke-[2.5]" />
            <button className="rounded-full border border-white bg-transparent px-3 py-1 text-xs font-bold text-white hover:bg-white/10 transition-colors">
              Sui
            </button>
          </div>
        </div>

        <div
          ref={customCursorRef}
          className={`fixed w-[30px] h-[30px] rounded-full bg-cyan-600 pointer-events-none z-50 transition-opacity duration-200 ${
            showCustomCursor ? "opacity-100" : "opacity-0"
          }`}
          style={{ left: 0, top: 0 }}
        />

        <div className="absolute right-[0.85%] top-[0.75%] z-20">
          <Link
            href="/upload"
            className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-mono font-light uppercase tracking-[-0.01em] text-white shadow-md hover:shadow-cyan-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  )
}
