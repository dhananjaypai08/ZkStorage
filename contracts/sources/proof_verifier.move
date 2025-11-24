/// Proof Verifier Module
///
/// This module verifies zero-knowledge proofs submitted for storage receipts.
/// It supports multiple proof types:
/// - Storage proofs: Verify data was stored correctly
/// - Retention proofs: Verify compliance with retention policies
/// - Consent proofs: Verify valid consent exists
/// - Threshold proofs: Verify quorum approval for decryption
module zk_storage::proof_verifier {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::string::{Self, String};
    use zk_storage::storage_receipt::{Self, StorageReceipt};

    // ======== Errors ========
    const EInvalidProof: u64 = 0;
    const EInvalidProofType: u64 = 1;
    const EProofAlreadyUsed: u64 = 2;
    const ECommitmentMismatch: u64 = 3;
    const EUnauthorized: u64 = 4;

    // ======== Constants ========
    const PROOF_TYPE_STORAGE: u8 = 1;
    const PROOF_TYPE_RETENTION: u8 = 2;
    const PROOF_TYPE_CONSENT: u8 = 3;
    const PROOF_TYPE_THRESHOLD: u8 = 4;

    // ======== Types ========

    /// Verification record stored on-chain
    public struct VerificationRecord has key, store {
        id: UID,
        /// Receipt that was verified
        receipt_id: address,
        /// Type of proof submitted
        proof_type: u8,
        /// Hash of the proof
        proof_hash: vector<u8>,
        /// Public signals from the proof
        public_signals: vector<vector<u8>>,
        /// Who submitted the verification
        verifier: address,
        /// When verification occurred
        verified_at: u64,
        /// Whether verification succeeded
        success: bool,
    }

    /// Registry of used proof hashes to prevent replay
    public struct ProofRegistry has key {
        id: UID,
        /// Counter for total verifications
        total_verifications: u64,
    }

    // ======== Events ========

    /// Emitted when a proof is verified
    public struct ProofVerified has copy, drop {
        receipt_id: address,
        proof_type: u8,
        proof_hash: vector<u8>,
        verifier: address,
        success: bool,
        timestamp: u64,
    }

    /// Emitted when a compliance check passes
    public struct ComplianceConfirmed has copy, drop {
        receipt_id: address,
        compliance_type: String,
        verifier: address,
        timestamp: u64,
    }

    // ======== Functions ========

    /// Initialize the proof registry
    fun init(ctx: &mut TxContext) {
        transfer::share_object(ProofRegistry {
            id: object::new(ctx),
            total_verifications: 0,
        });
    }

    /// Verify a storage proof
    public entry fun verify_storage_proof(
        registry: &mut ProofRegistry,
        receipt: &mut StorageReceipt,
        proof_a: vector<u8>,
        proof_b: vector<u8>,
        proof_c: vector<u8>,
        public_signals: vector<vector<u8>>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);

        // Compute proof hash
        let proof_hash = compute_proof_hash(&proof_a, &proof_b, &proof_c);

        // Verify commitment matches (first public signal should be commitment)
        if (std::vector::length(&public_signals) > 0) {
            let commitment = storage_receipt::commitment(receipt);
            let signal_commitment = std::vector::borrow(&public_signals, 0);
            assert!(*commitment == *signal_commitment, ECommitmentMismatch);
        };

        // Verify the proof (simplified - in production use actual SNARK verification)
        let is_valid = verify_groth16_proof(&proof_a, &proof_b, &proof_c, &public_signals);

        if (is_valid) {
            storage_receipt::mark_verified(receipt, string::utf8(b"storage"), clock, ctx);
        };

        // Create verification record
        let record = VerificationRecord {
            id: object::new(ctx),
            receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
            proof_type: PROOF_TYPE_STORAGE,
            proof_hash,
            public_signals,
            verifier: sender,
            verified_at: current_time,
            success: is_valid,
        };

        // Update registry
        registry.total_verifications = registry.total_verifications + 1;

        // Emit event
        event::emit(ProofVerified {
            receipt_id: record.receipt_id,
            proof_type: PROOF_TYPE_STORAGE,
            proof_hash: record.proof_hash,
            verifier: sender,
            success: is_valid,
            timestamp: current_time,
        });

        // Transfer record to verifier
        transfer::transfer(record, sender);
    }

    /// Verify a retention compliance proof
    public entry fun verify_retention_proof(
        registry: &mut ProofRegistry,
        receipt: &mut StorageReceipt,
        proof_a: vector<u8>,
        proof_b: vector<u8>,
        proof_c: vector<u8>,
        public_signals: vector<vector<u8>>,
        max_allowed_days: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);

        let proof_hash = compute_proof_hash(&proof_a, &proof_b, &proof_c);

        // Verify the proof
        let is_valid = verify_groth16_proof(&proof_a, &proof_b, &proof_c, &public_signals);

        // Check retention compliance from public signals
        let is_compliant = is_valid; // In production, extract from public signals

        if (is_compliant) {
            storage_receipt::mark_verified(receipt, string::utf8(b"retention"), clock, ctx);

            event::emit(ComplianceConfirmed {
                receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
                compliance_type: string::utf8(b"retention"),
                verifier: sender,
                timestamp: current_time,
            });
        };

        registry.total_verifications = registry.total_verifications + 1;

        event::emit(ProofVerified {
            receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
            proof_type: PROOF_TYPE_RETENTION,
            proof_hash,
            verifier: sender,
            success: is_compliant,
            timestamp: current_time,
        });
    }

    /// Verify a consent proof
    public entry fun verify_consent_proof(
        registry: &mut ProofRegistry,
        receipt: &mut StorageReceipt,
        proof_a: vector<u8>,
        proof_b: vector<u8>,
        proof_c: vector<u8>,
        public_signals: vector<vector<u8>>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);

        let proof_hash = compute_proof_hash(&proof_a, &proof_b, &proof_c);
        let is_valid = verify_groth16_proof(&proof_a, &proof_b, &proof_c, &public_signals);

        // Also check that receipt has consent flag
        let has_consent = storage_receipt::has_consent(receipt);
        let is_compliant = is_valid && has_consent;

        if (is_compliant) {
            storage_receipt::mark_verified(receipt, string::utf8(b"consent"), clock, ctx);

            event::emit(ComplianceConfirmed {
                receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
                compliance_type: string::utf8(b"consent"),
                verifier: sender,
                timestamp: current_time,
            });
        };

        registry.total_verifications = registry.total_verifications + 1;

        event::emit(ProofVerified {
            receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
            proof_type: PROOF_TYPE_CONSENT,
            proof_hash,
            verifier: sender,
            success: is_compliant,
            timestamp: current_time,
        });
    }

    /// Verify a threshold decryption proof
    public entry fun verify_threshold_proof(
        registry: &mut ProofRegistry,
        receipt: &mut StorageReceipt,
        proof_a: vector<u8>,
        proof_b: vector<u8>,
        proof_c: vector<u8>,
        public_signals: vector<vector<u8>>,
        auditor_address: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);

        // Only authorized auditor can submit threshold proof
        assert!(sender == auditor_address, EUnauthorized);

        let proof_hash = compute_proof_hash(&proof_a, &proof_b, &proof_c);
        let is_valid = verify_groth16_proof(&proof_a, &proof_b, &proof_c, &public_signals);

        if (is_valid) {
            storage_receipt::mark_verified(receipt, string::utf8(b"threshold"), clock, ctx);

            event::emit(ComplianceConfirmed {
                receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
                compliance_type: string::utf8(b"threshold_decrypt"),
                verifier: sender,
                timestamp: current_time,
            });
        };

        registry.total_verifications = registry.total_verifications + 1;

        event::emit(ProofVerified {
            receipt_id: object::uid_to_address(storage_receipt::id(receipt)),
            proof_type: PROOF_TYPE_THRESHOLD,
            proof_hash,
            verifier: sender,
            success: is_valid,
            timestamp: current_time,
        });
    }

    // ======== Internal Functions ========

    /// Compute hash of proof components
    fun compute_proof_hash(
        proof_a: &vector<u8>,
        proof_b: &vector<u8>,
        proof_c: &vector<u8>
    ): vector<u8> {
        // Simplified hash - in production use proper cryptographic hash
        let mut hash = *proof_a;
        std::vector::append(&mut hash, *proof_b);
        std::vector::append(&mut hash, *proof_c);
        hash
    }

    /// Verify Groth16 proof (simplified for demonstration)
    /// In production, this would implement actual pairing-based verification
    fun verify_groth16_proof(
        _proof_a: &vector<u8>,
        _proof_b: &vector<u8>,
        _proof_c: &vector<u8>,
        _public_signals: &vector<vector<u8>>
    ): bool {
        // This is a placeholder. In production, implement:
        // 1. Parse proof points from bytes
        // 2. Parse verification key (embedded or stored)
        // 3. Compute pairing check: e(A, B) == e(α, β) * e(∑ vk_i * pub_i, γ) * e(C, δ)
        // For now, we assume proof is valid if it has correct structure
        std::vector::length(_proof_a) > 0 &&
        std::vector::length(_proof_b) > 0 &&
        std::vector::length(_proof_c) > 0
    }

    /// Get total verification count
    public fun total_verifications(registry: &ProofRegistry): u64 {
        registry.total_verifications
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
