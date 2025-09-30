// config.ts
// This file holds frontend configuration values, such as the backend API endpoint.
// Update the URL here if your backend server address or port changes.

// 留空表示默认不向外部发送数据。若业务确需对接后台，请在发布前
// 将此值替换为受信任的 HTTPS 域名（并在平台白名单中配置）。
// 提交审核前保持为空，默认不向外发送数据
const envTaskSendApi = (import.meta.env?.VITE_TASK_SEND_API as string | undefined)?.trim();
export const TASK_SEND_API: string = envTaskSendApi || "";


// 存放任务同步 webhook 的配置表名称（首行首列存储 URL）
export const TASK_SYNC_WEBHOOK_TABLE_NAME = "集成流URL";

const envTaskSyncTriggerApi = (import.meta.env?.VITE_TASK_SYNC_TRIGGER_API as string | undefined)?.trim();

export const TASK_SYNC_TRIGGER_API: string = envTaskSyncTriggerApi || "";

const normalizedTaskSyncTriggerApi = TASK_SYNC_TRIGGER_API.replace(/\/+$/, "");

export const TASK_SYNC_STATUS_API: string = normalizedTaskSyncTriggerApi
  ? `${normalizedTaskSyncTriggerApi}/status`
  : "";
