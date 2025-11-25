import React from "react";

// 红包操作区域，包括发包和抢包的输入/按钮
interface RedEnvelopeActionsProps {
  totalAmountInput: string;
  envelopeCountInput: string;
  onTotalAmountChange: (value: string) => void;
  onEnvelopeCountChange: (value: string) => void;
  onCreate: React.FormEventHandler<HTMLFormElement>;
  onClaim: () => Promise<void>;
  isCreateDisabled: boolean;
  isClaimDisabled: boolean;
  createStatus: string;
  claimStatus: string;
  createError: string | null;
  claimError: string | null;
  hasAvailableEnvelopes: boolean;
  userHasClaimed: boolean;
  latestClaimDisplay: string | null;
}

export default function RedEnvelopeActions({
  totalAmountInput,
  envelopeCountInput,
  onTotalAmountChange,
  onEnvelopeCountChange,
  onCreate,
  onClaim,
  isCreateDisabled,
  isClaimDisabled,
  createStatus,
  claimStatus,
  createError,
  claimError,
  hasAvailableEnvelopes,
  userHasClaimed,
  latestClaimDisplay
}: RedEnvelopeActionsProps) {
  return (
    <section className="panel action-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">红包操作</p>
          <h2>发送或抢红包</h2>
        </div>
        <span className="status-pill">钱包已连接</span>
      </div>

      <form className="action-card" onSubmit={onCreate}>
        <div>
          <label className="input-label">红包总金额 (ETH)</label>
          <input
            className="input-field"
            value={totalAmountInput}
            onChange={(event) => onTotalAmountChange(event.target.value)}
            placeholder="例如 0.1"
          />
        </div>
        <div>
          <label className="input-label">红包数量</label>
          <input
            className="input-field"
            type="number"
            min={1}
            value={envelopeCountInput}
            onChange={(event) => onEnvelopeCountChange(event.target.value)}
          />
        </div>
        <button type="submit" className="primary-btn" disabled={isCreateDisabled}>
          {createStatus === "pending" ? "发送中..." : "发布红包"}
        </button>
        {createError && <p className="error-text">{createError}</p>}
        {hasAvailableEnvelopes && (
          <p className="hint-text">
            当前已有红包正在进行，请等待领取完成后再发布新的
          </p>
        )}
      </form>

      <div className="action-card claim-card">
        <div>
          <p className="input-label">抢红包</p>
          <p className="claim-description">
            抢取当前合约中的一个红包，成功后 ETH 会自动转入钱包。
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={onClaim}
          disabled={isClaimDisabled}
        >
          {claimStatus === "pending" ? "抢夺中..." : "立即抢红包"}
        </button>
        {claimError && <p className="error-text">{claimError}</p>}
        {!hasAvailableEnvelopes && (
          <p className="hint-text">
            当前没有可抢的红包，请先等待有人发起
          </p>
        )}
        {userHasClaimed && (
          <p className="hint-text">
            当前钱包已抢过红包，无法再次领取
          </p>
        )}
        {latestClaimDisplay && (
          <div className="claim-badge">
            <p className="claim-badge-title">刚刚抢到</p>
            <p className="claim-badge-value">{latestClaimDisplay} ETH</p>
          </div>
        )}
      </div>

      <div className="action-status">
        <div>
          <p className="status-label">创建交易状态</p>
          <p className="status-value">{createStatus}</p>
        </div>
        <div>
          <p className="status-label">抢红包状态</p>
          <p className="status-value">{claimStatus}</p>
        </div>
      </div>
    </section>
  );
}
