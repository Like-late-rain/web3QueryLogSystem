import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { gql, request } from "graphql-request";
import {
  useAccount,
  useBalance,
  useEnsAvatar,
  useEnsName,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWatchContractEvent
} from "wagmi";
import type { Address, Log } from "viem";
import { formatEther } from "viem";
import ParticlesGalaxy from "./components/ParticlesGalaxy";
import WalletWidget from "./components/WalletWidget";
import StatusPanel from "./components/StatusPanel";
import RedEnvelopeActions from "./components/RedEnvelopeActions";
import TransferPanel from "./components/TransferPanel";
import LogPanel from "./components/LogPanel";
import logAbi from "./dataLoggerAbi.json";
import abi from "./abi.json";
import "./index.css";

import {
  GRAPH_URL,
  DATA_LOGGER_ADDRESS,
  RED_ENVELOPE_ADDRESS,
  txLabelMap,
  type TxStatus
} from "./utils/constants";
import {
  decodeRedEnvelopeClaimedLog,
  formatNumberDisplay,
  safeParseEther
} from "./utils/web3Helpers";
import ToastMessage from "./components/ToastMessage";

type RedEnvelopeClaimLog = Log & {
  args?: {
    claimer?: Address;
    amount?: bigint;
  };
};

export default function App() {
  const { address, chain, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  // 头像只有在解析到 ENS 名称后才会尝试请求，避免无效调用
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ?? undefined });
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  // 红包金额/数量表单
  const [totalAmountInput, setTotalAmountInput] = useState("0.0002");
  const [envelopeCountInput, setEnvelopeCountInput] = useState("2");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);
  // 状态相关的时间戳与交易状态
  const [lastStatusRefresh, setLastStatusRefresh] = useState<Date | null>(null);
  const [createStatus, setCreateStatus] = useState<TxStatus>("idle");
  const [claimStatus, setClaimStatus] = useState<TxStatus>("idle");
  // 错误提示/最近领取记录
  const [createError, setCreateError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [latestClaim, setLatestClaim] = useState<{
    amount: bigint;
    timestamp: number;
  } | null>(null);
  // 转账表单状态
  const [sendAmountInput, setSendAmountInput] = useState("0.0002");
  const [recipientInput, setRecipientInput] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sendStatus, setSendStatus] = useState<TxStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [logs, setLogs] = useState<
    { id: string; shender: string; data: string }[]
  >([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
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

  // 提取钱包余额/符号/网络名用于展示
  const formattedBalance = balanceData?.value
    ? formatNumberDisplay(formatEther(balanceData.value))
    : "--";
  const symbol = balanceData?.symbol ?? "ETH";
  const networkName = chain?.name ?? "Sepolia";

  // 解析输入值和红包数量
  const safeAmount = safeParseEther(totalAmountInput);
  const envelopeCountNumber = Number(envelopeCountInput);
  // 红包数量必须为正整数，转换为 BigInt 以便合约调用
  const envelopeCountBigInt =
    Number.isFinite(envelopeCountNumber) && envelopeCountNumber > 0
      ? BigInt(Math.floor(envelopeCountNumber))
      : undefined;

  // 转账金额解析
  const sendAmount = safeParseEther(sendAmountInput);

  // 合约返回的状态元组：[剩余红包数，总锁定金额]
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

  // 查询日志
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

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 监听红包领取事件，更新最近领取记录
  useWatchContractEvent({
    address: RED_ENVELOPE_ADDRESS,
    abi,
    chainId: chain?.id,
    eventName: "RedEnvelopeClaimed",
    enabled: Boolean(address && chain?.id),
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

  // 创建红包
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

  // 抢红包
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
      const hash = await walletClient.writeContract({
        address: RED_ENVELOPE_ADDRESS,
        abi,
        functionName: "claimRedEnvelope"
      });
      if (!publicClient) {
        setClaimStatus("error");
        setClaimError("Public client 未就绪，无法查询回执");
        return;
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setClaimStatus("success");
      refreshStatus();
      refreshUserStatus();
      const normalizedAddress = address?.toLowerCase();
      const claimedArgs = receipt.logs
        .map(decodeRedEnvelopeClaimedLog)
        .find((decoded) => {
          if (!decoded?.claimer || !normalizedAddress) return false;
          return decoded.claimer.toLowerCase() === normalizedAddress;
        });
      if (claimedArgs?.amount) {
        setLatestClaim({
          amount: claimedArgs.amount,
          timestamp: Date.now()
        });
        setToastMessage({
          text: `恭喜你抢到 ${formatEther(claimedArgs.amount)} ETH`,
          type: "success"
        });
      }
    } catch (error) {
      console.error(error);
      setClaimStatus("error");
      setClaimError(error instanceof Error ? error.message : "交易失败");
    }
  };

  // 转账
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

  const isTransferDisabled =
    !walletClient || !sendAmount || sendStatus === "pending";
  const sendStatusLabel = txLabelMap[sendStatus];

  return (
    <div className="page-container">
      {toastMessage && (
        <div className="toast-wrapper">
          <ToastMessage message={toastMessage.text} type={toastMessage.type} />
        </div>
      )}
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
              ensAvatar={ensAvatar}
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
          <TransferPanel
            recipient={recipientInput}
            amount={sendAmountInput}
            note={sendNote}
            onRecipientChange={setRecipientInput}
            onAmountChange={setSendAmountInput}
            onNoteChange={setSendNote}
            onSubmit={handleSendEther}
            isSubmitting={sendStatus === "pending"}
            isDisabled={isTransferDisabled}
            error={sendError}
            statusLabel={sendStatusLabel}
          />

          <LogPanel
            logs={logs}
            isFetching={isFetchingLogs}
            onRefresh={fetchLogs}
          />
        </section>
      </div>
    </div>
  );
}
