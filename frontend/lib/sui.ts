/**
 * Sui Client Integration
 * Handles on-chain operations for storage receipts and verification
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { bcs } from "@mysten/sui/bcs"

// Contract addresses (deployed to testnet)
// Package ID is set here - no .env needed unless you want to override it
const PACKAGE_ID = (process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || "0x0dbece3f879282e81274060838c48e6a9739a157aa14e91613e6128d13043554").toLowerCase()
const STORAGE_RECEIPT_MODULE = "storage_receipt"
const PROOF_VERIFIER_MODULE = "proof_verifier"
const COMPLIANCE_LEDGER_MODULE = "compliance_ledger"

// Validate package ID format
if (!PACKAGE_ID || !PACKAGE_ID.startsWith("0x") || PACKAGE_ID.length !== 66) {
  console.warn("⚠️ Invalid PACKAGE_ID format. Please deploy contracts and update the package ID.")
} else {
  console.log("✅ Package ID configured:", PACKAGE_ID)
  console.log("📍 Network: testnet")
  console.log("🔗 Verify at: https://suiscan.xyz/testnet/object/" + PACKAGE_ID)
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

/**
 * Create Sui client for testnet
 */
export function createSuiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl("testnet") })
}

/**
 * Verify that the package exists on-chain
 */
export async function verifyPackageExists(): Promise<{
  exists: boolean
  error?: string
}> {
  try {
    const client = createSuiClient()
    const packageObject = await client.getObject({
      id: PACKAGE_ID,
      options: {
        showContent: true,
        showType: true,
      },
    })

    if (packageObject.data && packageObject.data.type === "package") {
      return { exists: true }
    }

    return {
      exists: false,
      error: "Package object found but is not a package type",
    }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get the current package ID (for display/debugging)
 */
export function getPackageId(): string {
  return PACKAGE_ID
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
 * Returns a Transaction compatible with dapp-kit
 */
export function buildCreateReceiptTx(params: {
  commitment: string
  blobId: string
  policyId: string
  retentionDays: number
  consentSigned?: boolean
}): Transaction {
  const consentSigned = params.consentSigned ?? false
  const tx = new Transaction()

  // Ensure package ID is lowercase
  const normalizedPackageId = PACKAGE_ID.toLowerCase()
  
  // Convert strings to bytes for vector<u8>
  const commitmentBytes = new Uint8Array(new TextEncoder().encode(params.commitment))
  const blobIdBytes = new Uint8Array(new TextEncoder().encode(params.blobId))
  const policyIdBytes = new Uint8Array(new TextEncoder().encode(params.policyId))

  // Build the move call target
  const target = `${normalizedPackageId}::${STORAGE_RECEIPT_MODULE}::create_and_transfer_receipt`
  
  console.log("Building transaction:", {
    packageId: normalizedPackageId,
    target,
    network: "testnet"
  })

  // Serialize vectors using BCS
  const commitmentSerialized = bcs.vector(bcs.u8()).serialize(commitmentBytes)
  const blobIdSerialized = bcs.vector(bcs.u8()).serialize(blobIdBytes)
  const policyIdSerialized = bcs.vector(bcs.u8()).serialize(policyIdBytes)

  tx.moveCall({
    target,
    arguments: [
      tx.pure(commitmentSerialized),
      tx.pure(blobIdSerialized),
      tx.pure(policyIdSerialized),
      tx.pure.u64(params.retentionDays),
      tx.pure.bool(consentSigned),
      tx.object("0x6"), // Clock object
    ],
  })

  return tx
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
