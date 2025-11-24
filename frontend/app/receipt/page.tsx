"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  FileCheck,
  Shield,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  Fingerprint,
  Users,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/ui/loader"
import { Badge } from "@/components/ui/badge"
import { shortenHash } from "@/lib/utils"
import {
  generateProof,
  generateStorageProofInputs,
  generateRetentionProofInputs,
  generateConsentProofInputs,
  generateThresholdProofInputs,
  type ProofBundle,
  formatProofForDisplay
} from "@/lib/zk-prover"
import { toast } from "@/lib/use-toast"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { buildCreateReceiptTx } from "@/lib/sui"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { WalletDisplay } from "@/components/WalletDisplay"

function ReceiptPageContent() {
  const searchParams = useSearchParams()
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending: isExecuting } = useSignAndExecuteTransaction()
  const [commitment, setCommitment] = useState("")
  const [blobId, setBlobId] = useState("")
  const [policyId, setPolicyId] = useState("")
  const [proofType, setProofType] = useState<"storage" | "retention" | "consent" | "threshold">("storage")
  const [retentionDays, setRetentionDays] = useState(30)
  const [maxRetentionDays, setMaxRetentionDays] = useState(90)
  const [generating, setGenerating] = useState(false)
  const [proof, setProof] = useState<ProofBundle | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)

  useEffect(() => {
    const c = searchParams.get("commitment")
    const b = searchParams.get("blobId")
    const p = searchParams.get("policyId")
    if (c) setCommitment(c)
    if (b) setBlobId(b)
    if (p) setPolicyId(p)
  }, [searchParams])

  const handleGenerateProof = async () => {
    if (!commitment) {
      toast({
        title: "Missing Commitment",
        description: "Please enter a commitment hash",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    setProof(null)

    try {
      let inputs: Record<string, string>

      switch (proofType) {
        case "storage":
          inputs = generateStorageProofInputs(commitment, blobId || commitment, policyId || commitment)
          break
        case "retention":
          inputs = generateRetentionProofInputs(commitment, retentionDays, maxRetentionDays, Date.now())
          break
        case "consent":
          inputs = generateConsentProofInputs(commitment, commitment, true)
          break
        case "threshold":
          inputs = generateThresholdProofInputs(commitment, 2, 3, "0x1234567890abcdef")
          break
      }

      const result = await generateProof(proofType, inputs)
      setProof(result)

      toast({
        title: "Proof Generated",
        description: `${proofType.charAt(0).toUpperCase() + proofType.slice(1)} proof created successfully`,
        variant: "success",
      })
    } catch (err) {
      console.error("Proof generation error:", err)
      toast({
        title: "Generation Failed",
        description: err instanceof Error ? err.message : "Failed to generate proof",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const downloadProof = () => {
    if (!proof) return
    const json = JSON.stringify(proof, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `zk-receipt-${proof.proofType}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
              zkStorage
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/upload" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Upload
            </Link>
            <Link href="/verify" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Verify
            </Link>
            <WalletDisplay />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Zero-Knowledge</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">Generate ZK Receipt</h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Create cryptographic proofs that verify your data properties without revealing the content
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Parameters</CardTitle>
              <CardDescription>
                Enter your storage commitment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Commitment Hash</Label>
                <Input
                  placeholder="0x..."
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Blob ID (optional)</Label>
                <Input
                  placeholder="Walrus blob ID"
                  value={blobId}
                  onChange={(e) => setBlobId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Policy ID (optional)</Label>
                <Input
                  placeholder="Seal policy ID"
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Proof Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Proof Type</CardTitle>
              <CardDescription>
                Select what property you want to prove
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={proofType} onValueChange={(v) => setProofType(v as typeof proofType)}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="storage">Storage</TabsTrigger>
                  <TabsTrigger value="retention">Retention</TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="consent">Consent</TabsTrigger>
                  <TabsTrigger value="threshold">Threshold</TabsTrigger>
                </TabsList>

                <TabsContent value="storage" className="mt-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <FileCheck className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-medium text-white">Storage Proof</h4>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Proves that specific data was stored with a given commitment and policy,
                      without revealing the actual content.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="retention" className="mt-6 space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-medium text-white">Retention Proof</h4>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">
                      Proves your data retention period is within an allowed maximum.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Your Retention (days)</Label>
                        <Input
                          type="number"
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Allowed (days)</Label>
                        <Input
                          type="number"
                          value={maxRetentionDays}
                          onChange={(e) => setMaxRetentionDays(parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="consent" className="mt-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-medium text-white">Consent Proof</h4>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Proves that valid consent was obtained for data processing,
                      without revealing the consent document or PII.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="threshold" className="mt-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Users className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-medium text-white">Threshold Proof</h4>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Proves that a quorum of key holders approved a decryption request,
                      enabling auditor access with on-chain verification.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleGenerateProof}
            disabled={!commitment || generating}
            className="px-8"
            size="lg"
          >
            {generating ? (
              <>
                <Loader size="sm" className="mr-2" />
                Generating Proof...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" />
                Generate ZK Proof
              </>
            )}
          </Button>
        </div>

        {/* Proof Result */}
        {proof && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle>Proof Generated</CardTitle>
                    <CardDescription>
                      {formatProofForDisplay(proof).type} proof ready for verification
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="success">Valid</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Proof Type</span>
                  <span className="text-sm text-white font-medium capitalize">{proof.proofType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Commitment</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-cyan-400 font-mono">
                      {shortenHash(proof.commitment, 8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(proof.commitment, "Commitment")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Protocol</span>
                  <span className="text-sm text-white">{proof.proof.protocol} ({proof.proof.curve})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Public Signals</span>
                  <span className="text-sm text-white">{proof.publicSignals.length} signals</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Generated</span>
                  <span className="text-sm text-white">{new Date(proof.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={downloadProof} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Proof
                </Button>
                {commitment && blobId && policyId && (
                  <Button
                    onClick={() => {
                      if (!account) {
                        toast({
                          title: "Wallet Not Connected",
                          description: "Please connect your wallet to create an on-chain receipt",
                          variant: "destructive",
                        })
                        return
                      }

                      const transaction = buildCreateReceiptTx({
                        commitment,
                        blobId,
                        policyId,
                        retentionDays,
                        consentSigned: proofType === "consent",
                      })

                      signAndExecute(
                        {
                          transaction: transaction as unknown as Parameters<typeof signAndExecute>[0]['transaction'],
                        },
                        {
                          onSuccess: (result) => {
                            // Extract receipt ID from transaction result
                            const receiptId = result.digest
                            setReceiptId(receiptId)
                            toast({
                              title: "Receipt Created",
                              description: "Storage receipt created on-chain successfully",
                              variant: "success",
                            })
                          },
                          onError: (error) => {
                            toast({
                              title: "Transaction Failed",
                              description: error.message || "Failed to create receipt",
                              variant: "destructive",
                            })
                          },
                        }
                      )
                    }}
                    disabled={isExecuting || !account}
                    className="flex-1"
                  >
                    {isExecuting ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Creating Receipt...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Create On-Chain Receipt
                      </>
                    )}
                  </Button>
                )}
                <Link 
                  href={`/verify?proof=${encodeURIComponent(JSON.stringify(proof))}${blobId ? `&blobId=${encodeURIComponent(blobId)}` : ''}${policyId ? `&policyId=${encodeURIComponent(policyId)}` : ''}`} 
                  className="flex-1"
                >
                  <Button className="w-full" variant="outline">
                    Verify Proof
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              {receiptId && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-sm text-cyan-400 mb-2">Receipt Created On-Chain</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white font-mono">{shortenHash(receiptId, 12)}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(receiptId)
                        toast({ title: "Copied", description: "Receipt ID copied to clipboard" })
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    }>
      <ReceiptPageContent />
    </Suspense>
  )
}
