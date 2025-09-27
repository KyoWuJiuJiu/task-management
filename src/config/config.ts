// config.ts
// This file holds frontend configuration values, such as the backend API endpoint.
// Update the URL here if your backend server address or port changes.

// 留空表示默认不向外部发送数据。若业务确需对接后台，请在发布前
// 将此值替换为受信任的 HTTPS 域名（并在平台白名单中配置）。
// 提交审核前保持为空，默认不向外发送数据
export const BACKEND_URL: string = "";

// 多维表格批量同步任务的目标回调地址
export const TASK_SYNC_URL: string =
  "https://open.feishu.cn/anycross/trigger/callback/MTFhYTI3YmQ5ZDU0MzJmOWRhMThkNzFlMWEwNjE5YzQw";

const envTaskSyncApi = (import.meta.env?.VITE_TASK_SYNC_API as string | undefined)?.trim();

export const TASK_SYNC_API: string = envTaskSyncApi || "";

const normalizedTaskSyncApi = TASK_SYNC_API.replace(/\/+$/, "");

export const TASK_SYNC_STATUS_API: string = normalizedTaskSyncApi
  ? `${normalizedTaskSyncApi}/status`
  : "";
