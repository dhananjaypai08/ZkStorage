/// Compliance Ledger Module
///
/// This module maintains a permanent, auditable record of all compliance
/// verifications. It enables:
/// - Tracking compliance history for receipts
/// - Querying compliance status
/// - Generating compliance reports
/// - Supporting regulatory audits
module zk_storage::compliance_ledger {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};

    // ======== Errors ========
    const EUnauthorized: u64 = 0;
    const ERecordNotFound: u64 = 1;
    const EAlreadyRegistered: u64 = 2;

    // ======== Types ========

    /// Global compliance ledger
    public struct ComplianceLedger has key {
        id: UID,
        /// Total compliance records
        total_records: u64,
        /// Records indexed by receipt address
        records_by_receipt: Table<address, vector<u64>>,
        /// Counter for record IDs
        next_record_id: u64,
    }

    /// Individual compliance record
    public struct ComplianceRecord has key, store {
        id: UID,
        /// Unique record ID
        record_id: u64,
        /// Receipt this record refers to
        receipt_id: address,
        /// Type of compliance verified
        compliance_type: String,
        /// Proof hash used for verification
        proof_hash: vector<u8>,
        /// Who verified it
        verifier: address,
        /// When it was verified
        verified_at: u64,
        /// Additional metadata
        metadata: String,
    }

    /// Auditor capability for querying records
    public struct AuditorCap has key, store {
        id: UID,
        /// Auditor's address
        auditor: address,
        /// Which compliance types they can audit
        authorized_types: vector<String>,
    }

    // ======== Events ========

    /// Emitted when compliance is recorded
    public struct ComplianceRecorded has copy, drop {
        record_id: u64,
        receipt_id: address,
        compliance_type: String,
        verifier: address,
        timestamp: u64,
    }

    /// Emitted when auditor queries records
    public struct AuditPerformed has copy, drop {
        auditor: address,
        receipt_id: address,
        timestamp: u64,
    }

    // ======== Functions ========

    /// Initialize the compliance ledger
    fun init(ctx: &mut TxContext) {
        transfer::share_object(ComplianceLedger {
            id: object::new(ctx),
            total_records: 0,
            records_by_receipt: table::new(ctx),
            next_record_id: 1,
        });
    }

    /// Record a compliance verification
    public fun record_compliance(
        ledger: &mut ComplianceLedger,
        receipt_id: address,
        compliance_type: String,
        proof_hash: vector<u8>,
        metadata: String,
        clock: &Clock,
        ctx: &mut TxContext
    ): ComplianceRecord {
        let current_time = clock::timestamp_ms(clock);
        let sender = tx_context::sender(ctx);
        let record_id = ledger.next_record_id;

        let record = ComplianceRecord {
            id: object::new(ctx),
            record_id,
            receipt_id,
            compliance_type,
            proof_hash,
            verifier: sender,
            verified_at: current_time,
            metadata,
        };

        // Update ledger
        ledger.next_record_id = record_id + 1;
        ledger.total_records = ledger.total_records + 1;

        // Add to receipt index
        if (!table::contains(&ledger.records_by_receipt, receipt_id)) {
            table::add(&mut ledger.records_by_receipt, receipt_id, vector::empty());
        };
        let receipt_records = table::borrow_mut(&mut ledger.records_by_receipt, receipt_id);
        std::vector::push_back(receipt_records, record_id);

        // Emit event
        event::emit(ComplianceRecorded {
            record_id,
            receipt_id,
            compliance_type: record.compliance_type,
            verifier: sender,
            timestamp: current_time,
        });

        record
    }

    /// Record compliance and transfer to verifier
    public entry fun record_and_transfer(
        ledger: &mut ComplianceLedger,
        receipt_id: address,
        compliance_type: vector<u8>,
        proof_hash: vector<u8>,
        metadata: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let record = record_compliance(
            ledger,
            receipt_id,
            string::utf8(compliance_type),
            proof_hash,
            string::utf8(metadata),
            clock,
            ctx
        );
        transfer::transfer(record, tx_context::sender(ctx));
    }

    /// Create an auditor capability
    public entry fun create_auditor(
        auditor: address,
        authorized_types: vector<String>,
        ctx: &mut TxContext
    ) {
        let cap = AuditorCap {
            id: object::new(ctx),
            auditor,
            authorized_types,
        };
        transfer::transfer(cap, auditor);
    }

    /// Get number of compliance records for a receipt
    public fun get_record_count(
        ledger: &ComplianceLedger,
        receipt_id: address
    ): u64 {
        if (table::contains(&ledger.records_by_receipt, receipt_id)) {
            std::vector::length(table::borrow(&ledger.records_by_receipt, receipt_id))
        } else {
            0
        }
    }

    /// Get record IDs for a receipt
    public fun get_record_ids(
        ledger: &ComplianceLedger,
        receipt_id: address
    ): vector<u64> {
        if (table::contains(&ledger.records_by_receipt, receipt_id)) {
            *table::borrow(&ledger.records_by_receipt, receipt_id)
        } else {
            vector::empty()
        }
    }

    /// Check if receipt has any compliance records
    public fun has_compliance_records(
        ledger: &ComplianceLedger,
        receipt_id: address
    ): bool {
        get_record_count(ledger, receipt_id) > 0
    }

    /// Get total records in ledger
    public fun total_records(ledger: &ComplianceLedger): u64 {
        ledger.total_records
    }

    /// Get record details
    public fun record_details(record: &ComplianceRecord): (
        u64,        // record_id
        address,    // receipt_id
        String,     // compliance_type
        address,    // verifier
        u64,        // verified_at
    ) {
        (
            record.record_id,
            record.receipt_id,
            record.compliance_type,
            record.verifier,
            record.verified_at,
        )
    }

    /// Perform audit query (requires auditor cap)
    public fun audit_receipt(
        _cap: &AuditorCap,
        ledger: &ComplianceLedger,
        receipt_id: address,
        clock: &Clock,
        ctx: &TxContext
    ): vector<u64> {
        event::emit(AuditPerformed {
            auditor: tx_context::sender(ctx),
            receipt_id,
            timestamp: clock::timestamp_ms(clock),
        });

        get_record_ids(ledger, receipt_id)
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
