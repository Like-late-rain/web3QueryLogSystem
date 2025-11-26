'use client'

interface LogEntry {
  id: string;
  shender: string;
  data: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  isFetching: boolean;
  onRefresh: () => void;
}

// 显示链上日志列表和刷新按钮
export default function LogPanel({ logs, isFetching, onRefresh }: LogPanelProps) {
  return (
    <div className="panel log-panel log">
      <p className="panel-eyebrow">链上日志</p>
      <h2>TheGraph 数据</h2>
      <button type="button" className="ghost-btn sm" onClick={onRefresh} disabled={isFetching}>
        {isFetching ? "刷新中..." : "刷新日志"}
      </button>
      <div className="log-list">
        {logs.length === 0 && <p className="hint-text">暂无数据，等待转账记录</p>}
        {logs.map((entry) => (
          <div className="log-item" key={entry.id}>
            <p className="log-title">{entry.shender}</p>
            <p className="log-value">{entry.data}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
