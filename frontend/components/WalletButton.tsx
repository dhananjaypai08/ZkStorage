"use client"

import { ConnectButton } from "@mysten/dapp-kit"

export function WalletButton() {
  return (
    <div className="wallet-button-wrapper">
      <ConnectButton />
    </div>
  )
}

