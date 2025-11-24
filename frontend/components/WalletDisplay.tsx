"use client"

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit"
import { ConnectButton } from "@mysten/dapp-kit"
import { formatAddress } from "@/lib/sui"

export function WalletDisplay() {
  const account = useCurrentAccount()
  const { data: balance } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address || "" },
    { enabled: !!account?.address }
  )

  if (!account) {
    return (
      <div className="wallet-button-wrapper">
        <ConnectButton />
      </div>
    )
  }

  const suiBalance = balance ? Number(balance.totalBalance) / 1e9 : 0

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-400">
            {suiBalance.toFixed(2)} SUI
          </span>
        </div>
      </div>
      <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
        <span className="text-xs font-mono text-white">
          {formatAddress(account.address)}
        </span>
      </div>
      <div className="wallet-button-wrapper">
        <ConnectButton />
      </div>
    </div>
  )
}

