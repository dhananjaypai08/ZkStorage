import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"

const PACKAGE_ID = (process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || "0x0e0dafd65a12c710882eb586ac9fc76416497453a3fa3169c6468de1775f1a4f").toLowerCase()
const STORAGE_RECEIPT_MODULE = "storage_receipt"
const PROOF_VERIFIER_MODULE = "proof_verifier"
const COMPLIANCE_LEDGER_MODULE = "compliance_ledger"

if (!PACKAGE_ID || !PACKAGE_ID.startsWith("0x") || PACKAGE_ID.length !== 66) {
  throw new Error("Invalid PACKAGE_ID format")
}

export interface StorageReceipt {
  id: string
  owner: string
  commitment: string
  blobId: string
  policyId: string
  createdAt: number
  expiresAt: number
  verified: boolean
}

export interface ComplianceRecord {
  receiptId: string
  proofHash: string
  proofType: string
  verifiedAt: number
  verifier: string
}

export function createSuiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl("testnet") })
}

export async function getStorageReceipt(
  client: SuiClient,
  receiptId: string
): Promise<StorageReceipt | null> {
  try {
    const object = await client.getObject({
      id: receiptId,
      options: {
        showContent: true,
      },
    })

    if (!object.data?.content || object.data.content.dataType !== "moveObject") {
      return null
    }

    const fields = object.data.content.fields as Record<string, unknown>

    return {
      id: receiptId,
      owner: fields.owner as string,
      commitment: fields.commitment as string,
      blobId: fields.blob_id as string,
      policyId: fields.policy_id as string,
      createdAt: Number(fields.created_at),
      expiresAt: Number(fields.expires_at),
      verified: fields.verified as boolean,
    }
  } catch (error) {
    console.error("Failed to get storage receipt:", error)
    return null
  }
}

export async function getReceiptsByOwner(
  client: SuiClient,
  owner: string
): Promise<StorageReceipt[]> {
  try {
    const objects = await client.getOwnedObjects({
      owner,
      filter: {
        StructType: `${PACKAGE_ID}::${STORAGE_RECEIPT_MODULE}::StorageReceipt`,
      },
      options: {
        showContent: true,
      },
    })

    return objects.data
      .filter((obj) => obj.data?.content?.dataType === "moveObject")
      .map((obj) => {
        const fields = (obj.data!.content as { fields: Record<string, unknown> }).fields
        return {
          id: obj.data!.objectId,
          owner: fields.owner as string,
          commitment: fields.commitment as string,
          blobId: fields.blob_id as string,
          policyId: fields.policy_id as string,
          createdAt: Number(fields.created_at),
          expiresAt: Number(fields.expires_at),
          verified: fields.verified as boolean,
        }
      })
  } catch (error) {
    console.error("Failed to get receipts by owner:", error)
    return []
  }
}

export function buildCreateReceiptTx(params: {
  commitment: string
  blobId: string
  policyId: string
  retentionDays: number
  consentSigned?: boolean
}): Transaction {
  if (!params) {
    throw new Error("Parameters object is null or undefined")
  }
  
  if (typeof params !== "object" || Array.isArray(params)) {
    throw new Error("Parameters must be a plain object")
  }
  
  const commitment = params.commitment ? String(params.commitment).trim() : ""
  const blobId = params.blobId ? String(params.blobId).trim() : ""
  const policyId = params.policyId ? String(params.policyId).trim() : ""
  const retentionDays = Number(params.retentionDays) || 0
  const consentSigned = Boolean(params.consentSigned)
  
  if (!commitment) {
    throw new Error("Commitment is required and cannot be empty")
  }
  
  if (!blobId) {
    throw new Error("Blob ID is required and cannot be empty")
  }
  
  if (!policyId) {
    throw new Error("Policy ID is required and cannot be empty")
  }
  
  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    throw new Error(`Invalid retention days: ${retentionDays}. Must be a non-negative integer.`)
  }

  if (!PACKAGE_ID) {
    throw new Error("PACKAGE_ID is not configured")
  }

  const normalizedPackageId = String(PACKAGE_ID).toLowerCase().trim()
  
  if (!normalizedPackageId.startsWith("0x") || normalizedPackageId.length !== 66) {
    throw new Error(`Invalid package ID format: ${normalizedPackageId}. Expected 66 characters starting with 0x.`)
  }

  try {
    const commitmentBytes = Array.from(new TextEncoder().encode(commitment))
    const blobIdBytes = Array.from(new TextEncoder().encode(blobId))
    const policyIdBytes = Array.from(new TextEncoder().encode(policyId))

    if (commitmentBytes.length === 0 || blobIdBytes.length === 0 || policyIdBytes.length === 0) {
      throw new Error("Encoded bytes cannot be empty")
    }

    const target = `${normalizedPackageId}::${STORAGE_RECEIPT_MODULE}::create_and_transfer_receipt`

    const tx = new Transaction()
    
    if (!tx) {
      throw new Error("Failed to create Transaction object")
    }

    const args = [
      tx.pure("vector<u8>", commitmentBytes),
      tx.pure("vector<u8>", blobIdBytes),
      tx.pure("vector<u8>", policyIdBytes),
      tx.pure.u64(BigInt(retentionDays)),
      tx.pure.bool(consentSigned),
      tx.object("0x6"),
    ]

    if (!args || args.length !== 6) {
      throw new Error("Failed to build transaction arguments")
    }

    tx.moveCall({
      target,
      arguments: args,
    })

    return tx
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Transaction build failed: ${error.message}`)
    }
    throw new Error("Transaction build failed: Unknown error")
  }
}

export function buildSubmitProofTx(params: {
  receiptId: string
  proofHash: string
  proofType: string
  publicSignals: string[]
}): Transaction {
  const tx = new Transaction()
  const target = `${PACKAGE_ID}::${PROOF_VERIFIER_MODULE}::verify_and_record`
  
  tx.moveCall({
    target,
    arguments: [
      tx.object(params.receiptId),
      tx.pure.string(params.proofHash),
      tx.pure.string(params.proofType),
      tx.pure.vector("string", params.publicSignals),
    ],
  })
  
  return tx
}

export async function getComplianceRecords(
  client: SuiClient,
  receiptId: string
): Promise<ComplianceRecord[]> {
  try {
    // Query dynamic fields or events related to the receipt
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${COMPLIANCE_LEDGER_MODULE}::ComplianceVerified`,
      },
      limit: 50,
    })

    return events.data
      .filter((event) => {
        const fields = event.parsedJson as Record<string, unknown>
        return fields.receipt_id === receiptId
      })
      .map((event) => {
        const fields = event.parsedJson as Record<string, unknown>
        return {
          receiptId: fields.receipt_id as string,
          proofHash: fields.proof_hash as string,
          proofType: fields.proof_type as string,
          verifiedAt: Number(fields.verified_at),
          verifier: fields.verifier as string,
        }
      })
  } catch (error) {
    console.error("Failed to get compliance records:", error)
    return []
  }
}

export async function verifyReceipt(
  client: SuiClient,
  receiptId: string
): Promise<{
  valid: boolean
  receipt: StorageReceipt | null
  error?: string
}> {
  const receipt = await getStorageReceipt(client, receiptId)

  if (!receipt) {
    return { valid: false, receipt: null, error: "Receipt not found" }
  }

  if (Date.now() > receipt.expiresAt) {
    return { valid: false, receipt, error: "Receipt has expired" }
  }

  return { valid: true, receipt }
}

export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getExplorerUrl(type: "object" | "tx" | "address", id: string): string {
  const base = "https://suiscan.xyz/testnet"
  return `${base}/${type}/${id}`
}
