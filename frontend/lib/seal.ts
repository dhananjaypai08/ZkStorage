/**
 * Seal SDK Integration
 * Handles encryption with policy-based access control
 */

// Note: This uses the @mysten/seal SDK when available
// For now, we implement a compatible interface

export interface SealPolicy {
  id: string
  type: "time-lock" | "threshold" | "allowlist" | "custom"
  retentionDays: number
  consentRequired: boolean
  consentSignature?: string
  threshold?: {
    required: number
    total: number
    keyHolders: string[]
  }
  allowlist?: string[]
  expiresAt: number
  createdAt: number
}

export interface EncryptedEnvelope {
  ciphertext: Uint8Array
  nonce: Uint8Array
  policyId: string
  encryptedKey: Uint8Array
  metadata: {
    originalSize: number
    algorithm: string
    version: number
  }
}

export interface DecryptRequest {
  envelope: EncryptedEnvelope
  requesterAddress: string
  signature: string
}

/**
 * Generate encryption key using Web Crypto API
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
}

/**
 * Encrypt data with a random key
 */
async function encryptData(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  // Create a new ArrayBuffer to avoid SharedArrayBuffer type issues
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    buffer
  )

  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce,
  }
}

/**
 * Create a Seal policy
 */
export function createPolicy(params: {
  type: SealPolicy["type"]
  retentionDays: number
  consentRequired?: boolean
  consentSignature?: string
  threshold?: SealPolicy["threshold"]
  allowlist?: string[]
}): SealPolicy {
  const now = Date.now()
  const policyId = generatePolicyId()

  return {
    id: policyId,
    type: params.type,
    retentionDays: params.retentionDays,
    consentRequired: params.consentRequired ?? false,
    consentSignature: params.consentSignature,
    threshold: params.threshold,
    allowlist: params.allowlist,
    expiresAt: now + params.retentionDays * 24 * 60 * 60 * 1000,
    createdAt: now,
  }
}

/**
 * Generate a unique policy ID
 */
function generatePolicyId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Encrypt file with Seal policy
 */
export async function encryptWithSeal(
  data: Uint8Array,
  policy: SealPolicy
): Promise<EncryptedEnvelope> {
  // Generate a random encryption key
  const key = await generateEncryptionKey()

  // Export the key for wrapping
  const rawKey = await crypto.subtle.exportKey("raw", key)

  // Encrypt the data
  const { ciphertext, nonce } = await encryptData(data, key)

  // In production, the key would be encrypted to the Seal network
  // For now, we simulate this with a wrapped key
  const encryptedKey = new Uint8Array(rawKey)

  return {
    ciphertext,
    nonce,
    policyId: policy.id,
    encryptedKey,
    metadata: {
      originalSize: data.length,
      algorithm: "AES-256-GCM",
      version: 1,
    },
  }
}

/**
 * Decrypt data with Seal (requires policy check)
 */
export async function decryptWithSeal(
  envelope: EncryptedEnvelope,
  policy: SealPolicy,
  requesterAddress: string
): Promise<Uint8Array> {
  // Verify policy constraints
  const now = Date.now()

  if (now > policy.expiresAt) {
    throw new Error("Policy has expired")
  }

  if (policy.allowlist && !policy.allowlist.includes(requesterAddress)) {
    throw new Error("Address not in allowlist")
  }

  // Create proper ArrayBuffers to avoid SharedArrayBuffer type issues
  const keyBuffer = new ArrayBuffer(envelope.encryptedKey.length)
  new Uint8Array(keyBuffer).set(envelope.encryptedKey)

  // Import the decryption key
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  )

  // Create ArrayBuffer for ciphertext
  const ciphertextBuffer = new ArrayBuffer(envelope.ciphertext.length)
  new Uint8Array(ciphertextBuffer).set(envelope.ciphertext)

  // Create ArrayBuffer for nonce
  const nonceBuffer = new ArrayBuffer(envelope.nonce.length)
  new Uint8Array(nonceBuffer).set(envelope.nonce)

  // Decrypt the data
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonceBuffer },
    key,
    ciphertextBuffer
  )

  return new Uint8Array(plaintext)
}

/**
 * Serialize envelope for storage
 */
export function serializeEnvelope(envelope: EncryptedEnvelope): Uint8Array {
  const json = JSON.stringify({
    policyId: envelope.policyId,
    nonce: Array.from(envelope.nonce),
    encryptedKey: Array.from(envelope.encryptedKey),
    metadata: envelope.metadata,
  })

  const header = new TextEncoder().encode(json)
  const headerLength = new Uint32Array([header.length])

  // Format: [4 bytes header length][header JSON][ciphertext]
  const result = new Uint8Array(4 + header.length + envelope.ciphertext.length)
  result.set(new Uint8Array(headerLength.buffer), 0)
  result.set(header, 4)
  result.set(envelope.ciphertext, 4 + header.length)

  return result
}

/**
 * Deserialize envelope from storage
 */
export function deserializeEnvelope(data: Uint8Array): EncryptedEnvelope {
  const headerLength = new Uint32Array(data.buffer.slice(0, 4))[0]
  const headerBytes = data.slice(4, 4 + headerLength)
  const header = JSON.parse(new TextDecoder().decode(headerBytes))
  const ciphertext = data.slice(4 + headerLength)

  return {
    policyId: header.policyId,
    nonce: new Uint8Array(header.nonce),
    encryptedKey: new Uint8Array(header.encryptedKey),
    metadata: header.metadata,
    ciphertext,
  }
}

/**
 * Verify consent signature
 */
export function verifyConsent(
  policy: SealPolicy,
  _message: string,
  signature: string
): boolean {
  // In production, this would verify the signature cryptographically
  // The message would be used for signature verification
  return policy.consentRequired
    ? policy.consentSignature === signature
    : true
}
