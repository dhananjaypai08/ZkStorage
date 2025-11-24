# Import CLI Account to Sui Wallet - Quick Guide

## Your Account Details

**Address:** `0xce80cc3d453b2994691322674a2282c008716847f088c942c3113fe8e95ee9fa`  
**Private Key:** `suiprivkey1qrc88xuqt5vvyw430h05alfe2r6rq4rw50nhxje3m4hq2rkwxcax2ekpenf`  
**Network:** Testnet  
**Balance:** ~19.83 SUI

## Step-by-Step Import Instructions

### 1. Open Sui Wallet Extension
- Click the Sui Wallet icon in your browser toolbar
- If you don't have it, install from: https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil

### 2. Import Private Key
1. Click on your profile/account icon (top right)
2. Click **"Import Private Key"** or **"Add Account"** → **"Import Private Key"**
3. Paste this private key:
   ```
   suiprivkey1qrc88xuqt5vvyw430h05alfe2r6rq4rw50nhxje3m4hq2rkwxcax2ekpenf
   ```
4. Give it a name: `CLI Account` or `Testnet Deployer`
5. Click **"Import"**

### 3. Switch to Testnet
1. In Sui Wallet, look for the network selector (usually shows "Mainnet" or "Devnet")
2. Click it and select **"Testnet"**
3. Make sure your imported account is selected

### 4. Verify Connection
- The address should match: `0xce80cc3d...ee9fa`
- Balance should show ~19.83 SUI
- Network should show "Testnet"

## Package Information

**Package ID:** `0x0dbece3f879282e81274060838c48e6a9739a157aa14e91613e6128d13043554`  
**Network:** Testnet  
**Transaction:** `96CJ7GVs4HiDtswZWqMao2kHsQJWwuzYmwb6Q4bv6zzx`

You can verify the package exists at:
- SuiScan: https://suiscan.xyz/testnet/object/0x0dbece3f879282e81274060838c48e6a9739a157aa14e91613e6128d13043554
- Sui Explorer: https://suiexplorer.com/object/0x0dbece3f879282e81274060838c48e6a9739a157aa14e91613e6128d13043554?network=testnet

## Troubleshooting

### If "Package Not Found" Error Persists:

1. **Check Network Match:**
   - Wallet must be on **Testnet**
   - Frontend is configured for Testnet
   - Package was deployed to Testnet

2. **Verify Package ID:**
   - Must be exactly: `0x0dbece3f879282e81274060838c48e6a9739a157aa14e91613e6128d13043554`
   - Case-sensitive, starts with lowercase `0x`
   - No spaces or extra characters

3. **Clear Browser Cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear browser cache and reload

4. **Check Wallet Connection:**
   - Disconnect and reconnect wallet
   - Make sure you're using the imported account
   - Verify the address matches: `0xce80cc3d...ee9fa`

### If You Need to Redeploy:

```bash
cd contracts
./scripts/deploy.sh
```

Then update `frontend/lib/sui.ts` with the new package ID.

## Next Steps

After importing:
1. ✅ Connect wallet in the app
2. ✅ Upload a file
3. ✅ Create on-chain receipt (wallet popup should work)
4. ✅ Verify proof and view image

