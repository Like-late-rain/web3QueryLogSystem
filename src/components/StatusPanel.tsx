// 标题面板展示合约状态数据
interface StatusPanelProps {
  totalLockedDisplay: string;
  envelopesLeftDisplay: string;
  lastStatusRefresh: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function StatusPanel({
  totalLockedDisplay,
  envelopesLeftDisplay,
  lastStatusRefresh,
  onRefresh,
  isRefreshing
}: StatusPanelProps) {
  return (
    <section className="panel status-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">红包状态</p>
          <h2>当前链上概况</h2>
        </div>
        <button
          type="button"
          className="ghost-btn sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "同步中..." : "刷新状态"}
        </button>
      </div>
      <div className="status-grid">
        <article className="stat-card">
          <p className="stat-label">红包总金额</p>
          <p className="stat-value">{totalLockedDisplay} ETH</p>
          <p className="stat-sub">合约中锁定的 ETH</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">剩余红包数量</p>
          <p className="stat-value">{envelopesLeftDisplay}</p>
          <p className="stat-sub">可被抢夺的红包</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">最近更新</p>
          <p className="stat-value">
            {lastStatusRefresh ? lastStatusRefresh.toLocaleTimeString() : "等待链上刷新"}
          </p>
          <p className="stat-sub">状态会自动刷新</p>
        </article>
      </div>
    </section>
  );
}
