#!/bin/bash

# zkStorage Contract Deployment Script for Sui Testnet
# This script deploys the StorageReceipt, ProofVerifier, and ComplianceLedger modules

set -e

echo "========================================="
echo "zkStorage Contract Deployment"
echo "========================================="

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "Error: Sui CLI not found. Please install it first."
    echo "Run: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CONTRACT_DIR="$SCRIPT_DIR/.."

# Check if we're in the right directory
if [ ! -f "$CONTRACT_DIR/Move.toml" ]; then
    echo "Error: Move.toml not found. Please run this script from the contracts directory."
    exit 1
fi

# Switch to testnet
echo ""
echo "Switching to Sui testnet..."
sui client switch --env testnet 2>/dev/null || sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443

# Check current address
echo ""
echo "Current active address:"
sui client active-address

# Check balance
echo ""
echo "Checking SUI balance..."
BALANCE=$(sui client gas --json 2>/dev/null | grep -o '"totalBalance":"[0-9]*"' | head -1 | grep -o '[0-9]*')

if [ -z "$BALANCE" ] || [ "$BALANCE" -lt "100000000" ]; then
    echo "Warning: Low balance. Requesting testnet SUI from faucet..."
    sui client faucet
    sleep 5
fi

# Build the contracts
echo ""
echo "Building contracts..."
cd "$CONTRACT_DIR"
sui move build

# Publish the contracts
echo ""
echo "Publishing contracts to testnet..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json 2>&1)

# Extract package ID
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | grep -o '"packageId":"0x[a-f0-9]*"' | head -1 | grep -o '0x[a-f0-9]*')

if [ -z "$PACKAGE_ID" ]; then
    echo "Error: Failed to extract package ID from publish output"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

echo ""
echo "========================================="
echo "Deployment Successful!"
echo "========================================="
echo ""
echo "Package ID: $PACKAGE_ID"
echo ""
echo "Update the following files with this Package ID:"
echo "  - frontend/lib/sui.ts (PACKAGE_ID constant)"
echo "  - contracts/Move.toml ([addresses] section)"
echo ""

# Create deployment info file
cat > "$CONTRACT_DIR/deployment-info.json" << EOF
{
  "network": "testnet",
  "packageId": "$PACKAGE_ID",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "modules": [
    "storage_receipt",
    "proof_verifier",
    "compliance_ledger"
  ]
}
EOF

echo "Deployment info saved to deployment-info.json"
echo ""
echo "Next steps:"
echo "1. Update PACKAGE_ID in frontend/lib/sui.ts"
echo "2. Run 'npm run dev' in the frontend directory"
echo "3. Test the upload and verification flow"
