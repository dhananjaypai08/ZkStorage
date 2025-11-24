/**
 * Sui Client Integration
 * Handles on-chain operations for storage receipts and verification
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"

// Contract addresses (deployed to testnet)
const PACKAGE_ID = "0xd4749f0c1da174bd60ce5b87027d5fbf995a9aa3d0078914ca02bda06ed909ca"
const STORAGE_RECEIPT_MODULE = "storage_receipt"
const PROOF_VERIFIER_MODULE = "proof_verifier"
const COMPLIANCE_LEDGER_MODULE = "compliance_ledger"

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

/**
 * Create Sui client for testnet
 */
export function createSuiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl("testnet") })
}

/**
 * Get storage receipt by ID
 */
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

/**
 * Get receipts owned by an address
 */
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

/**
 * Build transaction to create storage receipt
 */
export function buildCreateReceiptTx(params: {
  commitment: string
  blobId: string
  policyId: string
  retentionDays: number
}): {
  packageId: string
  module: string
  function: string
  arguments: (string | number)[]
} {
  const expiresAt = Date.now() + params.retentionDays * 24 * 60 * 60 * 1000

  return {
    packageId: PACKAGE_ID,
    module: STORAGE_RECEIPT_MODULE,
    function: "create_receipt",
    arguments: [
      params.commitment,
      params.blobId,
      params.policyId,
      expiresAt,
    ],
  }
}

/**
 * Build transaction to submit proof verification
 */
export function buildSubmitProofTx(params: {
  receiptId: string
  proofHash: string
  proofType: string
  publicSignals: string[]
}): {
  packageId: string
  module: string
  function: string
  arguments: (string | string[])[]
} {
  return {
    packageId: PACKAGE_ID,
    module: PROOF_VERIFIER_MODULE,
    function: "verify_and_record",
    arguments: [
      params.receiptId,
      params.proofHash,
      params.proofType,
      params.publicSignals,
    ],
  }
}

/**
 * Get compliance records for a receipt
 */
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

/**
 * Verify receipt exists and is valid
 */
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

/**
 * Format Sui address for display
 */
export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Get Sui explorer URL
 */
export function getExplorerUrl(type: "object" | "tx" | "address", id: string): string {
  const base = "https://suiscan.xyz/testnet"
  return `${base}/${type}/${id}`
}
