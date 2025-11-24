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
  Shield,
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
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { buildCreateReceiptTx } from "@/lib/sui"

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
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending: isCreatingReceipt } = useSignAndExecuteTransaction()
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
  const [receiptId, setReceiptId] = useState<string | null>(null)

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

                {!account && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                    <p className="text-xs text-amber-400">
                      💡 Connect your wallet to create an on-chain receipt after upload
                    </p>
                  </div>
                )}

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
          <Card className="border-zinc-800/60 bg-zinc-900/30">
            <CardContent className="py-16">
              <div className="text-center space-y-6">
                <Loader size="lg" variant="spin" className="mx-auto" />
                <div>
                  <p className="text-sm text-zinc-300 mb-3">{statusMessage}</p>
                  <ProgressBar progress={progress} showLabel className="max-w-xs mx-auto" />
                </div>
                <div className="flex justify-center gap-6 pt-4">
                  {[
                    { icon: FileText, label: "Commit", threshold: 25 },
                    { icon: Lock, label: "Encrypt", threshold: 55 },
                    { icon: Database, label: "Store", threshold: 100 },
                  ].map(({ icon: Icon, label, threshold }) => (
                    <div key={label} className="text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1.5 transition-colors ${
                        progress >= threshold ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-800 text-zinc-600"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete */}
        {step === "complete" && result && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <h1 className="text-xl font-medium text-white">Upload Complete</h1>
              <p className="text-sm text-zinc-500">Encrypted and stored securely</p>
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
                      <Shield className="w-3 h-3 mr-1" />
                      Consent
                    </Badge>
                  )}
                </div>

                {/* Explorer Links */}
                <div className="pt-4 border-t border-zinc-800/40 space-y-2">
                  <p className="text-xs text-zinc-500 mb-2">View on Explorer</p>
                  <a
                    href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.blobId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View blob on Walrus
                  </a>
                  <a
                    href={`https://suiscan.xyz/testnet/object/${result.blobId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on SuiScan (if on-chain)
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Create On-Chain Receipt Section */}
            {!receiptId && (
              <div className="pt-4 border-t border-zinc-800/40">
                <p className="text-xs text-zinc-500 mb-3">Create On-Chain Receipt</p>
                {!account ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 mb-2">
                      Connect your wallet to create an on-chain receipt
                    </p>
                    <WalletDisplay />
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      if (!account) {
                        toast({
                          title: "Wallet Not Connected",
                          description: "Please connect your wallet first",
                          variant: "destructive",
                        })
                        return
                      }

                      try {
                        const transaction = buildCreateReceiptTx({
                          commitment: result.commitment,
                          blobId: result.blobId,
                          policyId: result.policyId,
                          retentionDays: result.retentionDays,
                          consentSigned: result.consentSigned,
                        })

                        signAndExecute(
                          {
                            transaction,
                          },
                        {
                          onSuccess: (txResult) => {
                            const txDigest = txResult.digest
                            setReceiptId(txDigest)
                            toast({
                              title: "Receipt Created",
                              description: "Storage receipt created successfully",
                              variant: "success",
                            })
                          },
                          onError: (error) => {
                            console.error("Transaction error:", error)
                            let errorMsg = error.message || "Failed to create receipt"
                            
                            // Check if it's a package/network issue
                            if (errorMsg.includes("package") || errorMsg.includes("Package") || errorMsg.includes("unable to locate")) {
                              errorMsg = "Package not found. Make sure your wallet is connected to Testnet network."
                            }
                            
                            toast({
                              title: "Transaction Failed",
                              description: errorMsg,
                              variant: "destructive",
                            })
                          },
                        }
                        )
                      } catch (err) {
                        console.error("Transaction build error:", err)
                        toast({
                          title: "Transaction Error",
                          description: err instanceof Error ? err.message : "Failed to build transaction",
                          variant: "destructive",
                        })
                      }
                    }}
                    disabled={isCreatingReceipt}
                    className="w-full"
                  >
                    {isCreatingReceipt ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Signing Transaction...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Create On-Chain Receipt
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Receipt Created Success */}
            {receiptId && (
              <div className="pt-4 border-t border-zinc-800/40">
                <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">✅ Receipt Created On-Chain</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-black/20">
                      <span className="text-xs text-zinc-400">Transaction:</span>
                      <code className="text-xs text-cyan-400 font-mono flex-1">{shortenHash(receiptId, 16)}</code>
                      <button
                        onClick={() => copyToClipboard(receiptId, "Transaction ID")}
                        className="p-1 rounded hover:bg-zinc-800 transition-colors"
                        title="Copy transaction ID"
                      >
                        <Copy className="w-3 h-3 text-zinc-500 hover:text-cyan-400" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${receiptId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on SuiScan
                      </a>
                      <a
                        href={`https://suiexplorer.com/txblock/${receiptId}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Sui Explorer
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
