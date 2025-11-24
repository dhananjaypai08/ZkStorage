/**
 * Walrus SDK Integration
 * Handles blob storage operations on Walrus decentralized storage
 */

// Walrus Testnet publisher endpoints (try multiple)
const PUBLISHER_ENDPOINTS = [
  "https://publisher.walrus-testnet.walrus.space",
  "https://wal-publisher-testnet.staketab.org",
  "https://walrus-testnet-publisher.bartestnet.com",
  "https://walrus-testnet.blockscope.net",
]

// Walrus Testnet aggregator endpoints (try multiple)
const AGGREGATOR_ENDPOINTS = [
  "https://aggregator.walrus-testnet.walrus.space",
  "https://wal-aggregator-testnet.staketab.org",
  "https://walrus-testnet-aggregator.bartestnet.com",
  "https://walrus-testnet.blockscope.net:443",
]

export interface UploadResult {
  blobId: string
  suiObjectId?: string
  endEpoch: number
  cost: number
}

/**
 * Try uploading to multiple endpoints with fallback
 */
export async function uploadToWalrus(
  encryptedData: Uint8Array,
  epochs: number = 5
): Promise<UploadResult> {
  const buffer = new ArrayBuffer(encryptedData.length)
  new Uint8Array(buffer).set(encryptedData)
  const blob = new Blob([buffer], { type: "application/octet-stream" })

  let lastError: Error | null = null

  for (const publisher of PUBLISHER_ENDPOINTS) {
    try {
      // Correct endpoint is /v1/blobs (not /v1/store)
      const response = await fetch(`${publisher}/v1/blobs?epochs=${epochs}`, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "application/octet-stream" },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (result.newlyCreated) {
        return {
          blobId: result.newlyCreated.blobObject.blobId,
          suiObjectId: result.newlyCreated.blobObject.id,
          endEpoch: result.newlyCreated.blobObject.storage?.endEpoch || 0,
          cost: result.newlyCreated.cost || 0,
        }
      } else if (result.alreadyCertified) {
        return {
          blobId: result.alreadyCertified.blobId,
          endEpoch: result.alreadyCertified.endEpoch || 0,
          cost: 0,
        }
      }

      throw new Error("Unexpected response format")
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Publisher ${publisher} failed:`, lastError.message)
      continue
    }
  }

  throw new Error(
    `All Walrus publishers failed. Last error: ${lastError?.message || "Unknown"}`
  )
}

/**
 * Retrieve blob data from Walrus
 */
export async function retrieveFromWalrus(blobId: string): Promise<Uint8Array> {
  let lastError: Error | null = null

  for (const aggregator of AGGREGATOR_ENDPOINTS) {
    try {
      // Correct endpoint is /v1/blobs/<blobId>
      const response = await fetch(`${aggregator}/v1/blobs/${blobId}`)
      if (!response.ok) continue

      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      continue
    }
  }

  throw new Error(
    `Failed to retrieve blob from any aggregator. Last error: ${lastError?.message || "Unknown"}`
  )
}

/**
 * Check if a blob exists on Walrus
 */
export async function checkBlobExists(blobId: string): Promise<boolean> {
  for (const aggregator of AGGREGATOR_ENDPOINTS) {
    try {
      const response = await fetch(`${aggregator}/v1/blobs/${blobId}`, { method: "HEAD" })
      if (response.ok) return true
    } catch {
      continue
    }
  }
  return false
}

/**
 * Calculate epochs from TTL days
 */
export function daysToEpochs(days: number): number {
  return Math.max(1, Math.ceil(days))
}

/**
 * Estimate storage cost (in MIST)
 */
export function estimateStorageCost(sizeBytes: number, epochs: number): bigint {
  const kb = Math.ceil(sizeBytes / 1024)
  return BigInt(kb * epochs * 100)
}
