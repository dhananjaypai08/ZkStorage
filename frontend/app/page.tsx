"use client"

import Link from "next/link"
import { Hero } from "@/components/Hero"
import {
  ArrowUpRight,
  Shield,
  ArrowRight,
  Lock,
  FileCheck,
  Eye,
  Database,
  Key,
  CheckCircle,
  Fingerprint,
  Clock
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Hero />

      {/* CTA Section */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Privacy-First Storage</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Prove Without
            <br />
            <span className="text-cyan-400">Revealing</span>
          </h2>
          <p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload encrypted data to Walrus, generate cryptographic commitments,
            and prove compliance with zero-knowledge proofs. Your data stays private.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/upload"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 text-base font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-200"
            >
              Start Encrypting
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3.5 text-base font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Verify a Receipt
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Complete Privacy,
              <span className="text-cyan-400"> Verifiable Trust</span>
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
              End-to-end encryption with cryptographic proofs for compliance and data integrity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Lock className="w-5 h-5" />}
              title="Seal Encryption"
              description="Encrypt data with policy-based access control. Define retention periods, consent requirements, and threshold decryption rules."
            />
            <FeatureCard
              icon={<Database className="w-5 h-5" />}
              title="Walrus Storage"
              description="Store encrypted blobs on Walrus decentralized storage. Retrieve with blob IDs, query metadata, and manage retention."
            />
            <FeatureCard
              icon={<Fingerprint className="w-5 h-5" />}
              title="ZK Receipts"
              description="Generate zero-knowledge proofs showing your data satisfies compliance requirements without revealing the content."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl -translate-y-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              How It Works
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
              Four steps to verifiable private storage.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            <StepCard
              number="01"
              title="Upload"
              description="Select a file and configure your encryption policy with retention and consent rules."
            />
            <StepCard
              number="02"
              title="Encrypt"
              description="Seal encrypts your data with the policy. A Merkle commitment is generated from the plaintext."
            />
            <StepCard
              number="03"
              title="Store"
              description="Encrypted blob is stored on Walrus. The commitment and policy ID are recorded on Sui."
            />
            <StepCard
              number="04"
              title="Prove"
              description="Generate a ZK proof showing compliance. Verifiers check on-chain without seeing your data."
            />
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Use Cases
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
              Privacy-preserving verification for real-world compliance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <UseCaseCard
              icon={<FileCheck className="w-6 h-6" />}
              title="Data Retention Compliance"
              description="Prove your data has a deletion deadline without revealing the data itself."
            />
            <UseCaseCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="Consent Verification"
              description="Show you have valid consent for data processing without exposing PII."
            />
            <UseCaseCard
              icon={<Eye className="w-6 h-6" />}
              title="Auditor Access"
              description="Enable threshold decryption for authorized auditors with quorum approval."
            />
            <UseCaseCard
              icon={<Key className="w-6 h-6" />}
              title="Document Provenance"
              description="Prove a document existed at a specific time with cryptographic certainty."
            />
            <UseCaseCard
              icon={<Clock className="w-6 h-6" />}
              title="TTL Verification"
              description="Demonstrate your retention policy meets regulatory requirements."
            />
            <UseCaseCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy-First Storage"
              description="Store sensitive data with full encryption and access control."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-4 py-16 md:py-20 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-4">
            <StatCard value="ZK" label="Zero-Knowledge Proofs" />
            <StatCard value="E2E" label="End-to-End Encryption" />
            <StatCard value="On-Chain" label="Sui Verification" />
            <StatCard value="Decentralized" label="Walrus Storage" />
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Built on the Best
            </h2>
            <p className="mt-4 text-zinc-400 max-w-lg mx-auto">
              Industry-leading protocols. Battle-tested infrastructure.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IntegrationCard
              name="Walrus"
              description="Decentralized storage"
              href="https://docs.walrus.site"
            />
            <IntegrationCard
              name="Seal"
              description="Encryption & policies"
              href="https://seal.mystenlabs.com"
            />
            <IntegrationCard
              name="Sui"
              description="On-chain verification"
              href="https://sui.io"
            />
            <IntegrationCard
              name="snarkjs"
              description="ZK proof generation"
              href="https://github.com/iden3/snarkjs"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-4 py-20 md:py-28 bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Ready to Store Privately?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Start encrypting your data and generating verifiable receipts.
          </p>
          <Link
            href="/upload"
            className="mt-8 group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 text-base font-medium text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-200"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-4 py-10 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">zkStorage</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="https://docs.walrus.site" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              Walrus
            </a>
            <a href="https://seal.mystenlabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              Seal
            </a>
            <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              Sui
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function StepCard({
  number,
  title,
  description
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="relative">
      <div className="text-6xl font-bold text-cyan-500/10 mb-2">{number}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  )
}

function UseCaseCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  )
}

function StatCard({
  value,
  label
}: {
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-cyan-400">{value}</div>
      <div className="mt-2 text-sm text-zinc-400">{label}</div>
    </div>
  )
}

function IntegrationCard({
  name,
  description,
  href
}: {
  name: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all duration-300"
    >
      <div>
        <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{name}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
    </a>
  )
}
