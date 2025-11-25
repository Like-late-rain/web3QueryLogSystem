import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { gql, request } from "graphql-request";
import {
  useAccount,
  useBalance,
  useEnsName,
  useReadContract,
  useWalletClient,
  useWatchContractEvent
} from "wagmi";
import type { Address, Log } from "viem";
import { formatEther, parseEther } from "viem";
import ParticlesGalaxy from "./components/ParticlesGalaxy";
import WalletWidget from "./components/WalletWidget";
import StatusPanel from "./components/StatusPanel";
import RedEnvelopeActions from "./components/RedEnvelopeActions";
import logAbi from "./dataLoggerAbi.json";
import abi from "./abi.json";
import "./index.css";

const getRequiredEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const GRAPH_URL = getRequiredEnv(
  import.meta.env.VITE_GRAPH_URL,
  "VITE_GRAPH_URL"
);

const DATA_LOGGER_ADDRESS = getRequiredEnv(
  import.meta.env.VITE_CONTRACT_ADDRESS,
  "VITE_CONTRACT_ADDRESS"
) as Address;

const RED_ENVELOPE_ADDRESS: Address = import.meta.env
  .VITE_FALLBACK_ADDRESS as Address;

type TxStatus = "idle" | "pending" | "success" | "error";
const txLabelMap: Record<TxStatus, string> = {
  idle: "空闲",
  pending: "进行中",
  success: "成功",
  error: "失败"
};

type RedEnvelopeClaimLog = Log & {
  args?: {
    claimer?: Address;
    amount?: bigint;
  };
};

const safeParseEther = (value?: string) => {
  if (!value) return undefined;
  try {
    return parseEther(value);
  } catch {
    return undefined;
  }
};

export default function App() {
  const { address, chain, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { data: walletClient } = useWalletClient();
  const [totalAmountInput, setTotalAmountInput] = useState("0.08");
  const [envelopeCountInput, setEnvelopeCountInput] = useState("5");
  const [lastStatusRefresh, setLastStatusRefresh] = useState<Date | null>(null);
  const [createStatus, setCreateStatus] = useState<TxStatus>("idle");
  const [claimStatus, setClaimStatus] = useState<TxStatus>("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [latestClaim, setLatestClaim] = useState<{
    amount: bigint;
    timestamp: number;
  } | null>(null);
  const [sendAmountInput, setSendAmountInput] = useState("0.002");
  const [recipientInput, setRecipientInput] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sendStatus, setSendStatus] = useState<TxStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    { id: string; shender: string; data: string }[]
  >([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  const formattedBalance = balanceData?.value
    ? formatNumberDisplay(formatEther(balanceData.value))
    : "--";
  const symbol = balanceData?.symbol ?? "ETH";
  const networkName = chain?.name ?? "Sepolia";

  const safeAmount = safeParseEther(totalAmountInput);
  const envelopeCountNumber = Number(envelopeCountInput);
  const envelopeCountBigInt =
    Number.isFinite(envelopeCountNumber) && envelopeCountNumber > 0
      ? BigInt(Math.floor(envelopeCountNumber))
      : undefined;

  const sendAmount = safeParseEther(sendAmountInput);

  const {
    data: statusData,
    refetch: refreshStatus,
    isFetching: isFetchingStatus
  } = useReadContract({
    address: RED_ENVELOPE_ADDRESS,
    abi,
    functionName: "getStatus",
    args: [],
    query: {
      refetchInterval: 15000
    }
  });

  const { data: userStatusData, refetch: refreshUserStatus } = useReadContract(
    address
      ? {
          address: RED_ENVELOPE_ADDRESS,
          abi,
          functionName: "getUserStatus",
          args: [address]
        }
      : undefined
  );

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
      const response = await request(GRAPH_URL, query);
      console.log("🚀 ~ App ~ response:", response);
      setLogs(response.dataLoggeds ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetchingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (address) {
      refreshUserStatus();
    }
  }, [address, refreshUserStatus]);

  useEffect(() => {
    if (statusData) {
      setLastStatusRefresh(new Date());
    }
  }, [statusData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useWatchContractEvent({
    address: RED_ENVELOPE_ADDRESS,
    abi,
    eventName: "RedEnvelopeClaimed",
    enabled: Boolean(address),
    onLogs(logs) {
      for (const log of logs) {
        const claimLog = log as RedEnvelopeClaimLog;
        const claimer = claimLog.args?.claimer;
        if (!claimer || !address) continue;
        if (claimer.toLowerCase() !== address.toLowerCase()) continue;
        const eventAmount = claimLog.args?.amount;
        if (typeof eventAmount === "bigint") {
          setLatestClaim({
            amount: eventAmount,
            timestamp: Date.now()
          });
        }
      }
    }
  });

  const statusTuple = statusData as readonly [bigint, bigint] | undefined;
  const envelopesLeft = statusTuple?.[0];
  const totalLocked = statusTuple?.[1];

  const totalLockedDisplay = totalLocked ? formatEther(totalLocked) : "--";
  const envelopesLeftDisplay = envelopesLeft ? envelopesLeft.toString() : "--";
  const hasAvailableEnvelopes = Boolean(envelopesLeft && envelopesLeft > 0n);
  const hasActiveRedEnvelope = hasAvailableEnvelopes;
  const userHasClaimed = Boolean(userStatusData);
  const latestClaimDisplay = latestClaim
    ? formatEther(latestClaim.amount)
    : null;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) {
      alert("请先连接钱包再发红包");
      return;
    }
    if (!walletClient) {
      alert("钱包尚未准备好，请稍后重试");
      return;
    }
    if (!safeAmount || !envelopeCountBigInt) {
      alert("请输入正确的金额和红包数量");
      return;
    }

    setCreateError(null);
    setCreateStatus("pending");

    try {
      await walletClient.writeContract({
        address: RED_ENVELOPE_ADDRESS,
        abi,
        functionName: "createRedEnvelopes",
        args: [safeAmount, envelopeCountBigInt],
        value: safeAmount
      });
      setCreateStatus("success");
      refreshStatus();
    } catch (error) {
      console.error(error);
      setCreateStatus("error");
      setCreateError(error instanceof Error ? error.message : "交易失败");
    }
  };

  const handleClaim = async () => {
    if (!isConnected) {
      alert("连接钱包后才能抢红包");
      return;
    }
    if (!walletClient) {
      alert("钱包尚未准备好，请稍后重试");
      return;
    }

    setClaimError(null);
    setClaimStatus("pending");

    try {
      await walletClient.writeContract({
        address: RED_ENVELOPE_ADDRESS,
        abi,
        functionName: "claimRedEnvelope"
      });
      setClaimStatus("success");
      refreshStatus();
      refreshUserStatus();
    } catch (error) {
      console.error(error);
      setClaimStatus("error");
      setClaimError(error instanceof Error ? error.message : "交易失败");
    }
  };

  const handleSendEther = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) {
      alert("请先连接钱包再执行转账");
      return;
    }
    if (!walletClient) {
      alert("钱包未准备好，请稍后重试");
      return;
    }
    if (!sendAmount) {
      alert("请输入转账金额");
      return;
    }
    if (!recipientInput) {
      alert("请输入收款地址");
      return;
    }

    setSendError(null);
    setSendStatus("pending");

    try {
      await walletClient.writeContract({
        address: DATA_LOGGER_ADDRESS,
        abi: logAbi,
        functionName: "sendEther",
        args: [recipientInput, sendNote || ""],
        value: sendAmount
      });
      setSendStatus("success");
      setRecipientInput("");
      setSendNote("");
      fetchLogs();
    } catch (error) {
      console.error(error);
      setSendStatus("error");
      setSendError(error instanceof Error ? error.message : "转账失败");
    }
  };

  const isCreateDisabled =
    !walletClient ||
    !isConnected ||
    !safeAmount ||
    !envelopeCountBigInt ||
    createStatus === "pending" ||
    hasActiveRedEnvelope;

  const isClaimDisabled =
    !walletClient ||
    !isConnected ||
    claimStatus === "pending" ||
    !hasAvailableEnvelopes ||
    userHasClaimed;

  return (
    <div className="page-container">
      <ParticlesGalaxy />
      <div className="app-shell">
        <header className="hero">
          <div className="hero-text">
            <p className="hero-eyebrow">东方红包 · 链上瞬发</p>
            <h1>打造流畅的红包体验</h1>
            <p>
              连接钱包即可发布与抢夺红包，链上状态实时可见，界面经过全新打造，旨在打造高级质感与丝滑互动。
            </p>
            <div className="hero-meta">
              <span>{networkName} 链</span>
              <span>{isConnected ? "钱包已连接" : "未连接钱包"}</span>
            </div>
          </div>
          <div className="wallet-widget">
            <WalletWidget
              formattedBalance={formattedBalance}
              symbol={symbol}
              ensName={ensName}
              address={address}
              isConnected={isConnected}
            />
          </div>
        </header>

        <main className="dashboard-grid">
          <StatusPanel
            totalLockedDisplay={totalLockedDisplay}
            envelopesLeftDisplay={envelopesLeftDisplay}
            lastStatusRefresh={lastStatusRefresh}
            onRefresh={refreshStatus}
            isRefreshing={isFetchingStatus}
          />

          <RedEnvelopeActions
            totalAmountInput={totalAmountInput}
            envelopeCountInput={envelopeCountInput}
            onTotalAmountChange={setTotalAmountInput}
            onEnvelopeCountChange={setEnvelopeCountInput}
            onCreate={handleCreate}
            onClaim={handleClaim}
            isCreateDisabled={isCreateDisabled}
            isClaimDisabled={isClaimDisabled}
            createStatus={txLabelMap[createStatus]}
            claimStatus={txLabelMap[claimStatus]}
            createError={createError}
            claimError={claimError}
            hasAvailableEnvelopes={hasAvailableEnvelopes}
            userHasClaimed={userHasClaimed}
            latestClaimDisplay={latestClaimDisplay}
          />
        </main>

        <section className="secondary-grid">
          <div className="panel send-panel sendEther">
            <p className="panel-eyebrow">转账</p>
            <h2>转账并写入备注</h2>
            <form className="send-form" onSubmit={handleSendEther}>
              <label className="input-label">收款地址</label>
              <input
                className="input-field"
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                placeholder="0x..."
              />
              <label className="input-label">转账金额 (ETH)</label>
              <input
                className="input-field"
                value={sendAmountInput}
                onChange={(event) => setSendAmountInput(event.target.value)}
                placeholder="例如 0.001"
              />
              <label className="input-label">备注内容</label>
              <textarea
                className="input-field"
                value={sendNote}
                onChange={(event) => setSendNote(event.target.value)}
                rows={3}
                placeholder="链上备注"
              />
              <button
                type="submit"
                className="primary-btn"
                disabled={
                  !walletClient || !sendAmount || sendStatus === "pending"
                }
              >
                {sendStatus === "pending" ? "转账中..." : "发送转账"}
              </button>
              {sendError && <p className="error-text">{sendError}</p>}
              <p className="status-label">状态：{txLabelMap[sendStatus]}</p>
            </form>
          </div>

          <div className="panel log-panel log">
            <p className="panel-eyebrow">链上日志</p>
            <h2>TheGraph 数据</h2>
            <button
              type="button"
              className="ghost-btn sm"
              onClick={fetchLogs}
              disabled={isFetchingLogs}
            >
              {isFetchingLogs ? "刷新中..." : "刷新日志"}
            </button>
            <div className="log-list">
              {logs.length === 0 && (
                <p className="hint-text">暂无数据，等待转账记录</p>
              )}
              {logs.map((entry) => (
                <div className="log-item" key={entry.id}>
                  <p className="log-title">{entry.shender}</p>
                  <p className="log-value">{entry.data}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// 格式化数字显示，添加千分位分隔符，保留最多四位小数
function formatNumberDisplay(value?: string | number) {
  if (value === undefined || value === null) return "--";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0
  });
}
