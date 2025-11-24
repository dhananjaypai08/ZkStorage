pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Retention Compliance Proof Circuit
 *
 * Proves that data has a retention period that complies with regulations
 * (i.e., retention <= maxAllowed) without revealing the actual retention value.
 *
 * Public Inputs:
 * - commitment: The data commitment
 * - maxAllowedDays: Maximum allowed retention period
 * - complianceResult: 1 if compliant, 0 if not
 *
 * Private Inputs:
 * - retentionDays: Actual retention period
 * - createdAt: Timestamp when data was created
 * - currentTime: Current timestamp
 */

template RetentionProof() {
    // Public inputs
    signal input commitment;
    signal input maxAllowedDays;

    // Private inputs
    signal input retentionDays;
    signal input createdAt;
    signal input currentTime;

    // Output
    signal output compliant;

    // Check retention <= maxAllowed
    component leq = LessEqThan(32);
    leq.in[0] <== retentionDays;
    leq.in[1] <== maxAllowedDays;

    // Check data hasn't expired
    signal expiresAt;
    expiresAt <== createdAt + retentionDays * 86400; // Convert days to seconds

    component notExpired = GreaterThan(64);
    notExpired.in[0] <== expiresAt;
    notExpired.in[1] <== currentTime;

    // Both conditions must be true
    compliant <== leq.out * notExpired.out;
}

component main {public [commitment, maxAllowedDays]} = RetentionProof();
