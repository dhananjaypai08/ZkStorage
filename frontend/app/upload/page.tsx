"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import {
  Upload,
  FileText,
  Lock,
  Database,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader, ProgressBar } from "@/components/ui/loader"
import { Badge } from "@/components/ui/badge"
import { formatBytes, shortenHash } from "@/lib/utils"
import { createCommitmentWithMetadata } from "@/lib/merkle"
import { createPolicy, encryptWithSeal, serializeEnvelope, type SealPolicy } from "@/lib/seal"
import { uploadToWalrus, daysToEpochs } from "@/lib/walrus"
import { toast } from "@/lib/use-toast"
import { WalletDisplay } from "@/components/WalletDisplay"

type UploadStep = "select" | "configure" | "processing" | "complete"

interface UploadResult {
  blobId: string
  commitment: string
  policyId: string
  fileHash: string
  fileName: string
  fileSize: number
  retentionDays: number
  consentSigned: boolean
  timestamp: number
}

export default function UploadPage() {
  const [step, setStep] = useState<UploadStep>("select")
  const [file, setFile] = useState<File | null>(null)
  const [retentionDays, setRetentionDays] = useState(30)
  const [consentSigned, setConsentSigned] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setStep("configure")
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!file) return

    setProcessing(true)
    setStep("processing")
    setProgress(0)
    setError(null)

    try {
      setStatusMessage("Reading file...")
      setProgress(10)
      const fileBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(fileBuffer)

      setStatusMessage("Creating Merkle commitment...")
      setProgress(25)
      const { commitment, combinedCommitment } = await createCommitmentWithMetadata(
        fileData,
        { retentionDays, consentSigned, timestamp: Date.now() }
      )

      setStatusMessage("Creating encryption policy...")
      setProgress(40)
      const policy: SealPolicy = createPolicy({
        type: "time-lock",
        retentionDays,
        consentRequired: consentSigned,
        consentSignature: consentSigned ? "user-consent-signature" : undefined,
      })

      setStatusMessage("Encrypting data...")
      setProgress(55)
      const envelope = await encryptWithSeal(fileData, policy)
      const serializedEnvelope = serializeEnvelope(envelope)

      setStatusMessage("Uploading to Walrus...")
      setProgress(75)
      const epochs = daysToEpochs(retentionDays)
      const uploadResult = await uploadToWalrus(serializedEnvelope, epochs)

      setStatusMessage("Finalizing...")
      setProgress(100)

      const uploadResult_data = {
        blobId: uploadResult.blobId,
        commitment: combinedCommitment,
        policyId: policy.id,
        fileHash: commitment,
        fileName: file.name,
        fileSize: file.size,
        retentionDays,
        consentSigned,
        timestamp: Date.now(),
      }

      setResult(uploadResult_data)
      setStep("complete")

      // Store policy and blob info in localStorage for later decryption
      try {
        localStorage.setItem(
          `zkStorage_${combinedCommitment}`,
          JSON.stringify({
            blobId: uploadResult.blobId,
            policyId: policy.id,
            policy: policy,
            fileName: file.name,
            fileSize: file.size,
          })
        )
      } catch (e) {
        console.warn("Failed to store policy in localStorage:", e)
      }

      toast({
        title: "Upload Complete",
        description: "Your file has been encrypted and stored securely.",
        variant: "success",
      })
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
      setStep("configure")
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast({ title: "Copied", description: `${field} copied to clipboard` })
  }

  const resetUpload = () => {
    setStep("select")
    setFile(null)
    setResult(null)
    setProgress(0)
    setError(null)
  }

  const steps = ["select", "configure", "processing", "complete"]
  const currentStepIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Minimal Header */}
      <header className="border-b border-zinc-800/40 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/80 to-blue-600/80 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium">zkStorage</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/receipt" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Receipt
            </Link>
            <Link href="/verify" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Verify
            </Link>
            <WalletDisplay />
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-10"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-12">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  currentStepIndex >= i ? "bg-cyan-500" : "bg-zinc-800"
                }`}
              />
              {i < 3 && (
                <div className={`w-8 h-px mx-1 ${currentStepIndex > i ? "bg-cyan-500/50" : "bg-zinc-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Select */}
        {step === "select" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-medium text-white">Upload & Encrypt</h1>
              <p className="text-sm text-zinc-500">Encrypt with Seal, store on Walrus</p>
            </div>

            <Card className="border-zinc-800/60 bg-zinc-900/30">
              <CardContent className="p-0">
                <div
                  {...getRootProps()}
                  className={`p-16 text-center cursor-pointer transition-all rounded-xl ${
                    isDragActive
                      ? "bg-cyan-500/5 border-cyan-500/30"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-300 mb-1">
                    {isDragActive ? "Drop here" : "Drop a file or click to browse"}
                  </p>
                  <p className="text-xs text-zinc-600">Max 10MB</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configure */}
        {step === "configure" && file && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-medium text-white">Configure Policy</h1>
              <p className="text-sm text-zinc-500">Set retention and consent</p>
            </div>

            <Card className="border-zinc-800/60 bg-zinc-900/30">
              <CardContent className="p-6 space-y-6">
                {/* File */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                  <FileText className="w-8 h-8 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                  </div>
                  <button onClick={resetUpload} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Change
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-xs">{error}</p>
                  </div>
                )}

                {/* Retention */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Retention (days)</Label>
                  <Input
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={365}
                    className="bg-zinc-800/30 border-zinc-700/50"
                  />
                  <p className="text-xs text-zinc-600">{daysToEpochs(retentionDays)} epochs on Walrus</p>
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentSigned}
                    onChange={(e) => setConsentSigned(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
                  />
                  <div>
                    <p className="text-sm text-white">Sign consent</p>
                    <p className="text-xs text-zinc-500">Enable consent verification in ZK proofs</p>
                  </div>
                </label>

                {/* Summary */}
                <div className="pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Policy</span>
                    <span className="text-zinc-300">Time-lock · {retentionDays}d · {consentSigned ? "Consent" : "No consent"}</span>
                  </div>
                </div>


                <Button onClick={handleUpload} className="w-full" disabled={processing}>
                  <Lock className="w-4 h-4 mr-2" />
                  Encrypt & Upload
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="space-y-8">
            <Card className="border-zinc-800/60 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm overflow-hidden">
              <CardContent className="py-20">
                <div className="text-center space-y-8">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 animate-spin" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-2 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="relative">
                        <Lock className="w-10 h-10 text-cyan-400 animate-pulse" />
                        <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl animate-ping" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      {statusMessage || "Processing..."}
                    </h2>
                    <ProgressBar progress={progress} showLabel className="max-w-md mx-auto" />
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-8">
                    {[
                      { icon: FileText, label: "Creating Commitment", threshold: 25, color: "from-purple-500/20 to-purple-600/20" },
                      { icon: Lock, label: "Encrypting Data", threshold: 55, color: "from-cyan-500/20 to-cyan-600/20" },
                      { icon: Database, label: "Storing Securely", threshold: 100, color: "from-blue-500/20 to-blue-600/20" },
                    ].map(({ icon: Icon, label, threshold, color }) => (
                      <div key={label} className="text-center space-y-3">
                        <div className={`relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          progress >= threshold 
                            ? `bg-gradient-to-br ${color} border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-110` 
                            : "bg-zinc-800/50 border border-zinc-700/50"
                        }`}>
                          <Icon className={`w-6 h-6 transition-colors ${
                            progress >= threshold ? "text-cyan-400" : "text-zinc-600"
                          }`} />
                          {progress >= threshold && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className={`text-xs font-medium transition-colors ${
                            progress >= threshold ? "text-cyan-400" : "text-zinc-500"
                          }`}>
                            {label}
                          </p>
                          {progress >= threshold && (
                            <p className="text-[10px] text-cyan-400/70 mt-1">✓ Complete</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Your data is being encrypted and stored securely</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Complete */}
        {step === "complete" && result && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center border-2 border-cyan-500/30">
                  <CheckCircle className="w-10 h-10 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Upload Complete! 🎉
                </h1>
                <p className="text-sm text-zinc-400 mt-2">Your data has been encrypted and stored securely</p>
              </div>
            </div>

            <Card className="border-zinc-800/60 bg-zinc-900/30">
              <CardContent className="p-6 space-y-4">
                {[
                  { label: "Blob ID", value: result.blobId },
                  { label: "Commitment", value: result.commitment },
                  { label: "Policy ID", value: result.policyId },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                    <span className="text-xs text-zinc-500">{label}</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-cyan-400/80 font-mono">{shortenHash(value, 8)}</code>
                      <button
                        onClick={() => copyToClipboard(value, label)}
                        className="p-1 rounded hover:bg-zinc-800 transition-colors"
                      >
                        {copiedField === label ? (
                          <Check className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Encrypted
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {result.retentionDays}d
                  </Badge>
                  {result.consentSigned && (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Consent
                    </Badge>
                  )}
                </div>

              </CardContent>
            </Card>


            <div className="flex gap-3 pt-4">
              <Link href={`/receipt?commitment=${result.commitment}&blobId=${result.blobId}&policyId=${result.policyId}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Generate ZK Proof
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" onClick={resetUpload}>
                New Upload
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
