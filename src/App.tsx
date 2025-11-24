import { useState, useEffect, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWriteContract, useAccount, useBalance } from "wagmi";
import { gql, request } from "graphql-request";
import { formatEther } from "viem";
import ParticlesGalaxy from "./components/ParticlesGalaxy";
import abi from "./abi.json";
import "./index.css";

const getRequiredEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const CONTRACT_ADDRESS = getRequiredEnv(
  import.meta.env.VITE_CONTRACT_ADDRESS,
  "VITE_CONTRACT_ADDRESS"
) as `0x${string}`;
const GRAPH_URL = getRequiredEnv(
  import.meta.env.VITE_GRAPH_URL,
  "VITE_GRAPH_URL"
);

export default function App() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const { isConnected, address, chain } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { data: balanceData } = useBalance({
    address: address,
    chainId: chain?.id
  });
  const balanceEther =
    balanceData && balanceData.value
      ? formatEther(balanceData.value)
      : undefined;

  const formatBalanceValue = (value?: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return value;
    return parsed.toLocaleString("en-US", {
      maximumFractionDigits: 3,
      minimumFractionDigits: 0
    });
  };
  const sendData = async () => {
    if (!input) return alert("请输入内容");
    try {
      await writeContract({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: "logData",
        args: [input]
      });
      alert("写入成功");
      setInput("");
    } catch (err) {
      console.error(err);
      alert("链上写入失败");
    }
  };

  const fetchLogs = useCallback(async () => {
    setIsFetchingLogs(true);
    const query = gql`
      {
        dataLoggeds(orderBy: id, orderDirection: desc) {
          id
          shender
          data
        }
      }
    `;
    try {
      const res = await request(GRAPH_URL, query);
      setLogs(res.dataLoggeds);
    } catch (err) {
      console.error(err);
      alert("Graph 查询失败");
    } finally {
      setIsFetchingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="page-container">
      <ParticlesGalaxy />
      {/* 顶部导航栏 */}
      <div className="navbar">
        <div className="nav-title">🚀 Web3 链上日志系统</div>
        <ConnectButton.Custom>
          {({ account, openAccountModal, openConnectModal, mounted }) => {
            const handleClick = () =>
              account ? openAccountModal?.() : openConnectModal?.();

            const displayedBalance = formatBalanceValue(
              balanceEther ?? account?.balance?.formatted
            );

            return (
              <button
                type="button"
                className={`connect-button ${account ? "connected" : ""}`}
                onClick={handleClick}
              >
                <div className="connect-balance">
                  <span className="balance-label">余额</span>
                  <span className="balance-value">
                    {displayedBalance ?? "0"}
                  </span>
                  <span className="balance-symbol">
                    {account?.balance?.symbol ?? balanceData?.symbol ?? "ETH"}
                  </span>
                </div>
                <div className="connect-account">
                  <span className="account-icon">🐷</span>
                  <span className="account-text">
                    {account ? account.displayName : "连接钱包"}
                  </span>
                  {account && <span className="account-caret">⌄</span>}
                </div>
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>

      <div style={{ padding: "40px", maxWidth: 900, margin: "auto" }}>
        {/* 输入区 */}
        <div className="card">
          <h2>写入链上数据</h2>

          {!isConnected && <p>请先连接钱包</p>}

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入要写入链上的内容"
          />

          <button
            onClick={sendData}
            disabled={isPending}
            style={{ marginLeft: 12 }}
          >
            {isPending ? "写入中..." : "写入链上"}
          </button>
        </div>

        {/* TheGraph 查询 */}
        <div className="card">
          <h2>TheGraph 数据查询</h2>
          <button onClick={fetchLogs} disabled={isFetchingLogs}>
            {isFetchingLogs ? "刷新中..." : "刷新链上数据"}
          </button>

          {logs.map((log) => (
            <div className="log-card" key={log.id}>
              <b>{log.shender}</b>
              <br />
              <span style={{ opacity: 0.8 }}>{log.data}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
