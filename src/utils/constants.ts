import type { Address } from "viem";

// 内部通用方法，用于确保必需的环境变量被提供
const getRequiredEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export type TxStatus = "idle" | "pending" | "success" | "error";

export const txLabelMap: Record<TxStatus, string> = {
  idle: "空闲",
  pending: "进行中",
  success: "成功",
  error: "失败"
};

export const GRAPH_URL = getRequiredEnv(
  import.meta.env.VITE_GRAPH_URL,
  "VITE_GRAPH_URL"
);

export const DATA_LOGGER_ADDRESS = getRequiredEnv(
  import.meta.env.VITE_CONTRACT_ADDRESS,
  "VITE_CONTRACT_ADDRESS"
) as Address;

export const RED_ENVELOPE_ADDRESS = import.meta.env
  .VITE_FALLBACK_ADDRESS as Address;
