import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { TransitionOverlay } from "@/components/TransitionOverlay"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "zkStorage - Verifiable Private Storage",
  description: "Store data privately with Walrus & Seal encryption. Generate ZK receipts proving compliance without revealing content. Verify on-chain with Sui.",
  keywords: ["zero-knowledge", "walrus", "seal", "sui", "encryption", "storage", "privacy", "zk-proofs"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-white min-h-screen`}
      >
        <TransitionOverlay />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
