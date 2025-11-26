import { ConnectButton } from "@rainbow-me/rainbowkit";

// 用来显示连接状态、ENS、余额、切换/查看钱包按钮
interface WalletWidgetProps {
  formattedBalance: string;
  symbol: string;
  ensName: string | null | undefined;
  address: string | undefined;
  isConnected: boolean;
  ensAvatar: string | null | undefined;
}

export default function WalletWidget({
  formattedBalance,
  symbol,
  ensName,
  address,
  isConnected,
  ensAvatar
}: WalletWidgetProps) {
  return (
    <ConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, openChainModal }) => (
        <div className="wallet-card">
          <div className="wallet-card-header">
            <div>
              <p className="wallet-label">钱包状态</p>
              <p
                className={`status-chip ${isConnected ? "online" : "offline"}`}
              >
                {isConnected ? "已连接" : "离线"}
              </p>
            </div>
            <span className={`avatar-glow ${account ? "active" : ""}`}>
              {ensAvatar && (
                <img src={ensAvatar} alt="" className="ens-avatar" />
              )}
            </span>
          </div>
          <div className="wallet-card-body">
            {ensName && (
              <p className="wallet-ens">
                {account?.displayName ?? "ENS 未解析"}
              </p>
            )}
            <p className="wallet-address">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "--"}
            </p>
            <p className="wallet-balance">
              {formattedBalance} {symbol}
            </p>
          </div>
          <div className="wallet-card-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={account ? openAccountModal : openConnectModal}
            >
              {account ? "查看钱包" : "连接钱包"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => openChainModal?.()}
            >
              切换网络
            </button>
          </div>
        </div>
      )}
    </ConnectButton.Custom>
  );
}
