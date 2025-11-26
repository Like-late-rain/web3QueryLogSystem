'use client'

import type { FormEvent } from "react";

interface TransferPanelProps {
  recipient: string;
  amount: string;
  note: string;
  onRecipientChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  isDisabled: boolean;
  error: string | null;
  statusLabel: string;
}

// 用于展示转账表单及状态
export default function TransferPanel({
  recipient,
  amount,
  note,
  onRecipientChange,
  onAmountChange,
  onNoteChange,
  onSubmit,
  isSubmitting,
  isDisabled,
  error,
  statusLabel
}: TransferPanelProps) {
  return (
    <div className="panel send-panel sendEther">
      <p className="panel-eyebrow">转账</p>
      <h2>转账并写入备注</h2>
      <form className="send-form" onSubmit={onSubmit}>
        <label className="input-label">收款地址</label>
        <input
          className="input-field"
          value={recipient}
          onChange={(event) => onRecipientChange(event.target.value)}
          placeholder="0x..."
        />
        <label className="input-label">转账金额 (ETH)</label>
        <input
          className="input-field"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="例如 0.001"
        />
        <label className="input-label">备注内容</label>
        <textarea
          className="input-field"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={3}
          placeholder="链上备注"
        />
        <button type="submit" className="primary-btn" disabled={isDisabled}>
          {isSubmitting ? "转账中..." : "发送转账"}
        </button>
        {error && <p className="error-text">{error}</p>}
        <p className="status-label">状态：{statusLabel}</p>
      </form>
    </div>
  );
}
