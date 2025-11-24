/// Storage Receipt Module
///
/// This module manages storage receipts that link encrypted data on Walrus
/// to on-chain commitments and policies. Each receipt contains:
/// - Merkle commitment of the original data
/// - Walrus blob ID for the encrypted data
/// - Seal policy ID
/// - Retention and consent metadata
module zk_storage::storage_receipt {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};

    // ======== Errors ========
    const EReceiptExpired: u64 = 0;
    const EInvalidCommitment: u64 = 1;
    const EUnauthorized: u64 = 2;
    const EAlreadyVerified: u64 = 3;

    // ======== Types ========

    /// A storage receipt proving data was stored with specific properties
    public struct StorageReceipt has key, store {
        id: UID,
        /// Owner's address
        owner: address,
        /// Merkle commitment of the original plaintext data
        commitment: vector<u8>,
        /// Walrus blob ID where encrypted data is stored
        blob_id: String,
        /// Seal policy ID
        policy_id: String,
        /// Timestamp when receipt was created
        created_at: u64,
        /// Timestamp when data expires
        expires_at: u64,
        /// Whether consent was signed
        consent_signed: bool,
        /// Whether this receipt has been verified with a ZK proof
        verified: bool,
        /// Number of successful verifications
        verification_count: u64,
    }

    /// Admin capability for managing the system
    public struct AdminCap has key, store {
        id: UID,
    }

    // ======== Events ========

    /// Emitted when a new storage receipt is created
    public struct ReceiptCreated has copy, drop {
        receipt_id: address,
        owner: address,
        commitment: vector<u8>,
        blob_id: String,
        policy_id: String,
        expires_at: u64,
    }

    /// Emitted when a receipt is verified
    public struct ReceiptVerified has copy, drop {
        receipt_id: address,
        verifier: address,
        proof_type: String,
        timestamp: u64,
    }

    /// Emitted when a receipt expires and is deleted
    public struct ReceiptExpired has copy, drop {
        receipt_id: address,
        owner: address,
    }

    // ======== Functions ========

    /// Initialize the module - creates admin capability
    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            AdminCap { id: object::new(ctx) },
            tx_context::sender(ctx)
        );
    }

    /// Create a new storage receipt
    public fun create_receipt(
        commitment: vector<u8>,
        blob_id: String,
        policy_id: String,
        retention_days: u64,
        consent_signed: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ): StorageReceipt {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let expires_at = current_time + (retention_days * 24 * 60 * 60 * 1000);

        let receipt = StorageReceipt {
            id: object::new(ctx),
            owner: sender,
            commitment,
            blob_id,
            policy_id,
            created_at: current_time,
            expires_at,
            consent_signed,
            verified: false,
            verification_count: 0,
        };

        event::emit(ReceiptCreated {
            receipt_id: object::uid_to_address(&receipt.id),
            owner: sender,
            commitment: receipt.commitment,
            blob_id: receipt.blob_id,
            policy_id: receipt.policy_id,
            expires_at,
        });

        receipt
    }

    /// Create and transfer a receipt to the sender
    public entry fun create_and_transfer_receipt(
        commitment: vector<u8>,
        blob_id: vector<u8>,
        policy_id: vector<u8>,
        retention_days: u64,
        consent_signed: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let receipt = create_receipt(
            commitment,
            string::utf8(blob_id),
            string::utf8(policy_id),
            retention_days,
            consent_signed,
            clock,
            ctx
        );
        transfer::transfer(receipt, tx_context::sender(ctx));
    }

    /// Mark a receipt as verified (called by proof verifier)
    public fun mark_verified(
        receipt: &mut StorageReceipt,
        proof_type: String,
        clock: &Clock,
        ctx: &TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < receipt.expires_at, EReceiptExpired);

        receipt.verified = true;
        receipt.verification_count = receipt.verification_count + 1;

        event::emit(ReceiptVerified {
            receipt_id: object::uid_to_address(&receipt.id),
            verifier: tx_context::sender(ctx),
            proof_type,
            timestamp: current_time,
        });
    }

    /// Check if a receipt is still valid (not expired)
    public fun is_valid(receipt: &StorageReceipt, clock: &Clock): bool {
        clock::timestamp_ms(clock) < receipt.expires_at
    }

    /// Get the commitment from a receipt
    public fun commitment(receipt: &StorageReceipt): &vector<u8> {
        &receipt.commitment
    }

    /// Get the blob ID from a receipt
    public fun blob_id(receipt: &StorageReceipt): &String {
        &receipt.blob_id
    }

    /// Get the policy ID from a receipt
    public fun policy_id(receipt: &StorageReceipt): &String {
        &receipt.policy_id
    }

    /// Get the owner of a receipt
    public fun owner(receipt: &StorageReceipt): address {
        receipt.owner
    }

    /// Check if consent was signed
    public fun has_consent(receipt: &StorageReceipt): bool {
        receipt.consent_signed
    }

    /// Check if receipt is verified
    public fun is_verified(receipt: &StorageReceipt): bool {
        receipt.verified
    }

    /// Get expiration timestamp
    public fun expires_at(receipt: &StorageReceipt): u64 {
        receipt.expires_at
    }

    /// Get the UID of a receipt (for package-level access)
    public(package) fun id(receipt: &StorageReceipt): &UID {
        &receipt.id
    }

    /// Delete an expired receipt
    public entry fun delete_expired_receipt(
        receipt: StorageReceipt,
        clock: &Clock,
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time >= receipt.expires_at, EReceiptExpired);

        event::emit(ReceiptExpired {
            receipt_id: object::uid_to_address(&receipt.id),
            owner: receipt.owner,
        });

        let StorageReceipt {
            id,
            owner: _,
            commitment: _,
            blob_id: _,
            policy_id: _,
            created_at: _,
            expires_at: _,
            consent_signed: _,
            verified: _,
            verification_count: _,
        } = receipt;
        object::delete(id);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
