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
  if (!params || typeof params !== "object") {
    throw new Error("Invalid parameters: params must be an object")
  }
  
  if (!params.commitment || typeof params.commitment !== "string") {
    throw new Error("Invalid commitment: must be a non-empty string")
  }
  
  if (!params.blobId || typeof params.blobId !== "string") {
    throw new Error("Invalid blobId: must be a non-empty string")
  }
  
  if (!params.policyId || typeof params.policyId !== "string") {
    throw new Error("Invalid policyId: must be a non-empty string")
  }
  
  if (typeof params.retentionDays !== "number" || params.retentionDays < 0) {
    throw new Error("Invalid retentionDays: must be a non-negative number")
  }

  if (!PACKAGE_ID || PACKAGE_ID.length !== 66) {
    throw new Error("Invalid PACKAGE_ID configuration")
  }

  const tx = new Transaction()
  const normalizedPackageId = PACKAGE_ID.toLowerCase()
  
  const commitmentBytes = Array.from(new TextEncoder().encode(params.commitment))
  const blobIdBytes = Array.from(new TextEncoder().encode(params.blobId))
  const policyIdBytes = Array.from(new TextEncoder().encode(params.policyId))

  const target = `${normalizedPackageId}::${STORAGE_RECEIPT_MODULE}::create_and_transfer_receipt`

  tx.moveCall({
    target,
    arguments: [
      tx.pure("vector<u8>", commitmentBytes),
      tx.pure("vector<u8>", blobIdBytes),
      tx.pure("vector<u8>", policyIdBytes),
      tx.pure.u64(BigInt(params.retentionDays)),
      tx.pure.bool(params.consentSigned ?? false),
      tx.object("0x6"),
    ],
  })

  return tx
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
