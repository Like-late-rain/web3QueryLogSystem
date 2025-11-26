import type { Address, Log } from "viem";
import { decodeEventLog, formatEther, parseEther } from "viem";
import abi from "../abi.json";

/**
 * 把前端输入尝试解析成 wei，非法时返回 undefined。
 */
export const safeParseEther = (value?: string) => {
  if (!value) return undefined;
  try {
    return parseEther(value);
  } catch {
    return undefined;
  }
};

/**
 * 格式化数字字符串，适用于界面上的千分位 + 4 位小数展示。
 */
export const formatNumberDisplay = (value?: string | number) => {
  if (value === undefined || value === null) return "--";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0
  });
};

/**
 * 手动从已打包的日志里解码出 `RedEnvelopeClaimed` 参数，避免依赖事件监听器的延迟。
 */
export const decodeRedEnvelopeClaimedLog = (log: Log) => {
  try {
    const decoded = decodeEventLog({
      abi,
      data: log.data,
      topics: log.topics,
      strict: false
    });
    if (decoded.eventName !== "RedEnvelopeClaimed") return undefined;
    return decoded.args as {
      claimer?: Address;
      amount?: bigint;
    } | undefined;
  } catch {
    return undefined;
  }
};
