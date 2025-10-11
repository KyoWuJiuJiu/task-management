import { bitable } from "@lark-base-open/js-sdk";
import { TASK_SYNC_WEBHOOK_TABLE_NAME } from "../config/config";
import { fetchAllRecords } from "../utils/record";

let cachedWebhookUrl: string | null = null;
let ongoingFetch: Promise<string> | null = null;

function cellValueToString(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => cellValueToString(item)).join("");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.link === "string") return obj.link;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.value === "string") return obj.value;
  }
  return "";
}

async function loadWebhookUrl(): Promise<string> {
  if (
    !TASK_SYNC_WEBHOOK_TABLE_NAME ||
    TASK_SYNC_WEBHOOK_TABLE_NAME.trim() === ""
  ) {
    throw new Error("未配置任务同步 webhook 表名称");
  }

  const table = await bitable.base.getTableByName(TASK_SYNC_WEBHOOK_TABLE_NAME);
  if (!table) {
    throw new Error(`未找到名为 ${TASK_SYNC_WEBHOOK_TABLE_NAME} 的表`);
  }

  const fieldMetas = await table.getFieldMetaList();
  if (!Array.isArray(fieldMetas) || fieldMetas.length === 0) {
    throw new Error("集成流URL 表没有字段");
  }

  const primaryField =
    fieldMetas.find((field: any) => field?.isPrimary) || fieldMetas[0];

  const primaryFieldId = primaryField?.id;
  if (typeof primaryFieldId !== "string" || primaryFieldId.trim() === "") {
    throw new Error("无法确认集成流URL 表的首列字段");
  }

  const records = await fetchAllRecords(table);
  if (!records.length) {
    throw new Error("集成流URL 表中没有记录");
  }

  const firstRecord = records.find(
    (item: any) => item?.record?.fields?.[primaryFieldId]
  );
  if (!firstRecord) {
    throw new Error("未找到可用的集成流URL 记录");
  }

  const rawValue = firstRecord.record.fields[primaryFieldId];
  const webhookUrl = cellValueToString(rawValue).trim();
  if (!webhookUrl) {
    throw new Error("集成流URL 表首列首行未填写有效的 URL");
  }

  return webhookUrl;
}

export async function getTaskSyncWebhookUrl(): Promise<string> {
  if (cachedWebhookUrl) {
    return cachedWebhookUrl;
  }
  if (ongoingFetch) {
    return ongoingFetch;
  }

  ongoingFetch = loadWebhookUrl()
    .then((url) => {
      cachedWebhookUrl = url;
      return url;
    })
    .finally(() => {
      ongoingFetch = null;
    });

  return ongoingFetch;
}

export function resetTaskSyncWebhookCache(): void {
  cachedWebhookUrl = null;
  ongoingFetch = null;
}
