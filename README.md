# Web3 链上日志系统（React + Vite）

这是一个围绕 RainbowKit/Wagmi + TheGraph 的 Web3 Demo，提供钱包连接、链上写入、Graph 查询以及自定义的连接按钮展示。

## 主要功能

- ✅ 支持 RainbowKit 提供的 `ConnectButton`，并在按钮内实现余额 + 地址/头像的组合展示；
- ✅ 使用 Wagmi 的 `useBalance` 获取余额并格式化为最多 3 位小数，兼容当前激活链；
- ✅ 内置 TheGraph 查询（`dataLoggeds`）并提供“刷新链上数据”按钮，带 loading 状态；
- ✅ 链上写入通过 `wagmi.useWriteContract` 调用 `logData` 函数，前端保持输入校验与提示；
- ✅ 所有重要配置（合约地址、TheGraph URL、RainbowKit Project ID）通过 `.env` 读取，便于部署与切换环境。

## 快速开始

1. 安装依赖：
   ```bash
   cd web3QueryLogSystem
   npm install
   ```
2. 填写环境变量（`web3QueryLogSystem/.env`）：
   ```env
   VITE_CONTRACT_ADDRESS=0x...
   VITE_GRAPH_URL=https://api.studio.thegraph.com/...
   VITE_PROJECT_ID=你的 RainbowKit Project ID
   ```
3. 本地开发：
   ```bash
   npm run dev
   ```
4. 构建发布：
   ```bash
   npm run build
   ```

## 目录结构亮点

- `src/main.tsx`：初始化 RainbowKit/Wagmi、配置 On-chain 链（如 Sepolia）以及全局 Query Client；
- `src/App.tsx`：核心交互页，包含连接按钮、余额展示、写入/查询逻辑与 loading 状态；
- `src/shims/wagmi.ts`：对 Wagmi 的 `useBalance` 做 shim，补齐 `formatted` 字段以兼容 RainbowKit；
- `src/index.css`：全局视觉风格（暗黑背景、玻璃卡、定制按钮），按钮样式也在此处定义；
- `README.md`：当前文档，描述项目，方便复用或迁移。

## 开发提示

- 余额显示依赖 `formatEther` 和 `balance.value`，会在用户切换链/账户时自动更新；
- `ConnectButton.Custom` 用来替代默认 UI，可以直接控制按钮内的左右区域与交互；
- 查询按钮在请求中会禁用并显示“刷新中...”，避免重复触发；
- 为了保持高体验，`useBalance` 不再传死链 ID，而是使用 `chain?.id`，因此必须先连接钱包才能读取余额。

## 运行脚本

- `npm run dev`：启动 Vite 开发服务器；
- `npm run build`：生成生产构建；
- `npm run preview`：本地预览构建结果；
- `npm run lint`：运行 ESLint（基于官方配置）。

## 依赖

- `react@19` / `vite@7` / `typescript@5.9`；
- `@rainbow-me/rainbowkit` + `wagmi` + `viem`：钱包/链交互；
- `@tanstack/react-query`：缓存与 Graph 数据处理；
- `graphql-request` + `graphql`：TheGraph 查询。

## 其他

- 复制/部署时请务必更新 `.env` 中的合约地址与 TheGraph 的 URL；
- 如果需要接入其他链，请在 `main.tsx` 中将链添加到 `getDefaultConfig` 的 `chains` 数组；
- 运行 `npm run lint` 前可先 `npm run build` 确保类型正确。
