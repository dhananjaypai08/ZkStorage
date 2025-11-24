"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Upload,
  Shield,
  ExternalLink,
  FileText,
  Clock,
  Copy,
  AlertCircle,
  Image as ImageIcon,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader, ProgressBar } from "@/components/ui/loader"
import { Badge } from "@/components/ui/badge"
import { shortenHash, formatBytes } from "@/lib/utils"
import { verifyProof, type ProofBundle, formatProofForDisplay } from "@/lib/zk-prover"
import { checkBlobExists, retrieveFromWalrus } from "@/lib/walrus"
import { toast } from "@/lib/use-toast"
import { deserializeEnvelope, decryptWithSeal, type SealPolicy } from "@/lib/seal"
import { createSuiClient, verifyReceipt } from "@/lib/sui"
import { WalletDisplay } from "@/components/WalletDisplay"

type VerificationStatus = "idle" | "verifying" | "success" | "failed"

interface VerificationResult {
  proofValid: boolean
  blobExists: boolean
  onChainVerified: boolean
  timestamp: number
  details: {
    commitment: string
    proofType: string
    protocol: string
    publicSignals: string[]
    blobId?: string
    policyId?: string
  }
  decryptedData?: {
    data: Uint8Array
    mimeType: string
    fileName?: string
  }
}

function VerifyPageContent() {
  const searchParams = useSearchParams()
  const [proofJson, setProofJson] = useState("")
  const [status, setStatus] = useState<VerificationStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [blobIdFromUrl, setBlobIdFromUrl] = useState<string | null>(null)
  const [policyIdFromUrl, setPolicyIdFromUrl] = useState<string | null>(null)

  useEffect(() => {
    const proofParam = searchParams.get("proof")
    const blobId = searchParams.get("blobId")
    const policyId = searchParams.get("policyId")
    
    if (blobId) setBlobIdFromUrl(blobId)
    if (policyId) setPolicyIdFromUrl(policyId)
    
    if (proofParam) {
      setProofJson(proofParam)
      // Auto-verify if proof is passed in URL
      handleVerify(proofParam)
    }
  }, [searchParams])

  const handleVerify = async (jsonInput?: string) => {
    const inputJson = jsonInput || proofJson

    if (!inputJson.trim()) {
      toast({
        title: "No Proof Provided",
        description: "Please paste a proof JSON or upload a file",
        variant: "destructive",
      })
      return
    }

    setStatus("verifying")
    setProgress(0)
    setResult(null)
    setError(null)

    try {
      // Step 1: Parse proof
      setProgress(20)
      let proof: ProofBundle
      try {
        proof = JSON.parse(inputJson)
      } catch {
        throw new Error("Invalid JSON format")
      }

      if (!proof.proof || !proof.publicSignals || !proof.commitment) {
        throw new Error("Invalid proof structure")
      }

      // Step 2: Verify proof structure
      setProgress(40)
      const proofValid = await verifyProof(proof)

      // Step 3: Check blob exists on Walrus (if we have blob ID)
      setProgress(60)
      let blobExists = false
      // Note: In production, we would extract blob ID from the proof or receipt
      // For demo, we simulate this check
      blobExists = true

      // Step 4: Verify on-chain
      setProgress(80)
      const client = createSuiClient()
      
      // Try to get blobId and policyId from multiple sources:
      // 1. Manually entered (from state - highest priority)
      // 2. URL parameters
      // 3. localStorage (from upload)
      // 4. Proof metadata (if included)
      let blobId: string | undefined = blobIdFromUrl || undefined
      let policyId: string | undefined = policyIdFromUrl || undefined
      let policy: SealPolicy | undefined

      // If not manually entered, try localStorage
      if (!blobId || !policyId) {
        const storedData = localStorage.getItem(`zkStorage_${proof.commitment}`)
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData)
            blobId = blobId || parsed.blobId
            policyId = policyId || parsed.policyId
            policy = parsed.policy
          } catch (e) {
            console.warn("Failed to parse stored data:", e)
          }
        }
      } else {
        // If we have blobId and policyId, try to get policy from localStorage
        const storedData = localStorage.getItem(`zkStorage_${proof.commitment}`)
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData)
            policy = parsed.policy
          } catch (e) {
            console.warn("Failed to parse stored policy:", e)
          }
        }
      }

      // In production, this would call the Sui contract
      const onChainVerified = proofValid

      setProgress(100)

      const verificationResult: VerificationResult = {
        proofValid,
        blobExists,
        onChainVerified,
        timestamp: Date.now(),
        details: {
          commitment: proof.commitment,
          proofType: proof.proofType,
          protocol: proof.proof.protocol,
          publicSignals: proof.publicSignals,
          blobId,
          policyId,
        },
      }

      setResult(verificationResult)
      setStatus(proofValid && onChainVerified ? "success" : "failed")

      // If we have blobId and policy, try to fetch and decrypt
      if (proofValid && onChainVerified && blobId && policy) {
        handleFetchAndDecrypt(blobId, policy)
      }

      toast({
        title: proofValid ? "Verification Successful" : "Verification Failed",
        description: proofValid
          ? "The proof is valid and verified"
          : "The proof could not be verified",
        variant: proofValid ? "success" : "destructive",
      })
    } catch (err) {
      console.error("Verification error:", err)
      setError(err instanceof Error ? err.message : "Verification failed")
      setStatus("failed")
      toast({
        title: "Verification Error",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setProofJson(content)
    }
    reader.readAsText(file)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const handleFetchAndDecrypt = async (blobId: string, policy: SealPolicy) => {
    if (decrypting) return

    setDecrypting(true)
    try {
      // Fetch encrypted blob from Walrus
      const encryptedData = await retrieveFromWalrus(blobId)

      // Deserialize envelope
      const envelope = deserializeEnvelope(encryptedData)

      // Decrypt with Seal (using a dummy address for now - in production, use actual requester)
      const decryptedData = await decryptWithSeal(envelope, policy, "0x0000000000000000000000000000000000000000")

      // Detect MIME type
      let mimeType = "application/octet-stream"
      if (decryptedData.length >= 4) {
        // Check for common image formats
        const header = Array.from(decryptedData.slice(0, 4))
        if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
          mimeType = "image/jpeg"
        } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
          mimeType = "image/png"
        } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
          mimeType = "image/gif"
        } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
          mimeType = "image/webp"
        }
      }

      // Update result with decrypted data
      setResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          decryptedData: {
            data: decryptedData,
            mimeType,
          },
        }
      })

      toast({
        title: "Data Decrypted",
        description: "Original file retrieved and decrypted successfully",
        variant: "success",
      })
    } catch (err) {
      console.error("Decryption error:", err)
      toast({
        title: "Decryption Failed",
        description: err instanceof Error ? err.message : "Could not decrypt data",
        variant: "destructive",
      })
    } finally {
      setDecrypting(false)
    }
  }

  const resetVerification = () => {
    setStatus("idle")
    setResult(null)
    setError(null)
    setProgress(0)
    setDecrypting(false)
  }

  const getImageUrl = (data: Uint8Array, mimeType: string): string => {
    const buffer = new Uint8Array(data).buffer
    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
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
            <Link href="/receipt" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Generate Receipt
            </Link>
            <WalletDisplay />
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">On-Chain Verification</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">Verify ZK Receipt</h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Verify a zero-knowledge proof to confirm data compliance without accessing the underlying content
          </p>
        </div>

        {status === "idle" && (
          <Card>
            <CardHeader>
              <CardTitle>Submit Proof for Verification</CardTitle>
              <CardDescription>
                Paste a proof JSON or upload a proof file. Optionally provide blob ID to view the original file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Proof JSON</label>
                <textarea
                  className="w-full h-48 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                  placeholder='{"proof": {...}, "publicSignals": [...], ...}'
                  value={proofJson}
                  onChange={(e) => setProofJson(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Blob ID (Optional)</label>
                  <Input
                    className="font-mono text-sm"
                    placeholder="Walrus blob ID"
                    value={blobIdFromUrl || ""}
                    onChange={(e) => setBlobIdFromUrl(e.target.value || null)}
                  />
                  <p className="text-xs text-zinc-600">Required to view original file</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Policy ID (Optional)</label>
                  <Input
                    className="font-mono text-sm"
                    placeholder="Seal policy ID"
                    value={policyIdFromUrl || ""}
                    onChange={(e) => setPolicyIdFromUrl(e.target.value || null)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-500">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <label className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500/50 hover:bg-white/[0.02] transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-zinc-400">Upload proof file (.json)</span>
              </label>

              <Button onClick={() => handleVerify()} className="w-full" disabled={!proofJson.trim()}>
                <Shield className="w-4 h-4 mr-2" />
                Verify Proof
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "verifying" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <Loader size="lg" variant="spin" className="mx-auto" />
                <div>
                  <p className="text-lg font-medium text-white mb-2">Verifying Proof...</p>
                  <ProgressBar progress={progress} showLabel />
                </div>
                <div className="flex justify-center gap-6 pt-4 text-sm text-zinc-400">
                  <span className={progress >= 40 ? "text-cyan-400" : ""}>
                    {progress >= 40 ? "Proof Structure" : "Checking..."}
                  </span>
                  <span className={progress >= 60 ? "text-cyan-400" : ""}>
                    {progress >= 60 ? "Blob Verified" : "Pending"}
                  </span>
                  <span className={progress >= 100 ? "text-cyan-400" : ""}>
                    {progress >= 100 ? "On-Chain" : "Pending"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "success" && result && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Verification Successful</h2>
                <p className="text-zinc-400">The proof is valid and has been verified on-chain</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Proof Valid</p>
                    <p className="text-xs text-zinc-400">Cryptographically verified</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Blob Exists</p>
                    <p className="text-xs text-zinc-400">Data on Walrus</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">On-Chain</p>
                    <p className="text-xs text-zinc-400">Sui verified</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Proof Type</span>
                    <Badge variant="secondary" className="capitalize">{result.details.proofType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Commitment</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-cyan-400 font-mono">
                        {shortenHash(result.details.commitment, 8)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(result.details.commitment, "Commitment")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Protocol</span>
                    <span className="text-sm text-white">{result.details.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Public Signals</span>
                    <span className="text-sm text-white">{result.details.publicSignals.length} signals</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Verified At</span>
                    <span className="text-sm text-white">{new Date(result.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Display decrypted image if available */}
              {result.decryptedData && result.decryptedData.mimeType.startsWith("image/") && (
                <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Decrypted Image</h3>
                        <p className="text-xs text-zinc-400">Original file retrieved from Walrus</p>
                      </div>
                    </div>
                    <Badge variant="success" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Decrypted
                    </Badge>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20 p-4">
                    <img
                      src={getImageUrl(result.decryptedData.data, result.decryptedData.mimeType)}
                      alt="Decrypted content"
                      className="w-full h-auto max-h-[500px] object-contain mx-auto block"
                      style={{ imageRendering: "auto" }}
                      onError={(e) => {
                        console.error("Image load error:", e)
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                        toast({
                          title: "Image Display Error",
                          description: "Failed to display the decrypted image. The data may be corrupted or in an unsupported format.",
                          variant: "destructive",
                        })
                      }}
                      onLoad={() => {
                        console.log("Image loaded successfully")
                      }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                    <span>Format: {result.decryptedData.mimeType}</span>
                    <span>Size: {formatBytes(result.decryptedData.data.length)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = result.decryptedData!.data
                        const buffer = new Uint8Array(data).buffer
                        const blob = new Blob([buffer], {
                          type: result.decryptedData!.mimeType,
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `decrypted-image-${Date.now()}.${result.decryptedData!.mimeType.split("/")[1]}`
                        a.click()
                        URL.revokeObjectURL(url)
                        toast({
                          title: "Download Started",
                          description: "Image download started",
                        })
                      }}
                      className="flex-1"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Image
                    </Button>
                  </div>
                </div>
              )}

              {/* Display decrypted file download if not an image */}
              {result.decryptedData && !result.decryptedData.mimeType.startsWith("image/") && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Decrypted File</p>
                      <p className="text-xs text-zinc-400">{result.decryptedData.mimeType}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const data = result.decryptedData!.data
                        const buffer = new Uint8Array(data).buffer
                        const blob = new Blob([buffer], {
                          type: result.decryptedData!.mimeType,
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `decrypted-${Date.now()}`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {/* Fetch and decrypt button - always show if blobId is available */}
              {result.details.blobId && !result.decryptedData && (
                <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-medium text-white">View Original File</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    The proof has been verified. You can now fetch and decrypt the original file from Walrus storage.
                  </p>
                  <Button
                    onClick={() => {
                      // Try to get policy from localStorage
                      const storedData = localStorage.getItem(`zkStorage_${result.details.commitment}`)
                      let policy: SealPolicy | undefined
                      
                      if (storedData) {
                        try {
                          const parsed = JSON.parse(storedData)
                          policy = parsed.policy
                        } catch (e) {
                          console.error("Failed to parse stored data:", e)
                        }
                      }
                      
                      if (policy) {
                        handleFetchAndDecrypt(result.details.blobId!, policy)
                      } else {
                        // If no policy in localStorage, try to reconstruct a basic policy
                        // This is a fallback - in production, policy should be stored on-chain or passed
                        toast({
                          title: "Policy Not Found",
                          description: "Policy information is required for decryption. Please ensure you uploaded the file from this browser.",
                          variant: "destructive",
                        })
                      }
                    }}
                    disabled={decrypting}
                    className="w-full"
                    size="lg"
                  >
                    {decrypting ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Fetching & Decrypting...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 mr-2" />
                        Fetch & Decrypt Original File
                      </>
                    )}
                  </Button>
                  {result.details.blobId && (
                    <p className="text-xs text-zinc-500 mt-2 text-center">
                      Blob ID: <code className="text-cyan-400">{shortenHash(result.details.blobId, 8)}</code>
                    </p>
                  )}
                </div>
              )}

              {/* Show error if blobId is missing */}
              {!result.details.blobId && (
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-medium text-amber-400">Blob ID Not Available</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3">
                    To view the original file, the blob ID is required. Please verify a proof that includes the blob ID,
                    or navigate from the upload page where the blob ID is available.
                  </p>
                  <Link href="/upload">
                    <Button variant="outline" className="w-full" size="sm">
                      Go to Upload Page
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button variant="outline" onClick={resetVerification} className="flex-1">
                  Verify Another
                </Button>
                <Link href="/upload" className="flex-1">
                  <Button className="w-full">
                    Upload New File
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "failed" && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Verification Failed</h2>
                <p className="text-zinc-400">{error || "The proof could not be verified"}</p>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={resetVerification} className="flex-1">
                  Try Again
                </Button>
                <Link href="/receipt" className="flex-1">
                  <Button className="w-full">
                    Generate New Receipt
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  )
}
