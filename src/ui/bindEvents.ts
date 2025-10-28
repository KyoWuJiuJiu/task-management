import $ from "jquery";
/**
 * `bindUIEvents` 函数用于为页面上的元素（例如 `#sendRecord` 按钮）绑定事件处理程序。
 * 该函数使用了 jQuery 来处理 DOM 操作和事件绑定，如 `$("#sendRecord").on("click", ...)`。
 *
 * **为什么 `jQuery` 没有显式导入？**
 * 由于在项目的其他地方（例如 `index.ts`）已经通过 `import` 或 `<script>` 标签引入了 `jQuery`，因此 `bindEvents.ts` 中不需要再次显式导入 `jQuery`。
 * 通过这种方式，`jQuery` 被全局引入并可在整个项目中使用，而不需要在每个文件中重复导入。
 */
import { bitable, FieldType } from "@lark-base-open/js-sdk";
import { getFieldIdByName } from "../utils/field";
import { filterTasksByDate } from "../core/recordFilter";
import { buildTaskSummary } from "../core/summaryBuilder";
import { sendSummaryToServer } from "../utils/request";
import { fmtYmd, parseYmd } from "../utils/date";
import { FIELD_KEYS } from "../config/fields";
import { logError, showUserError } from "../utils/logger";
import { getFieldText } from "../utils/fieldTools";
import { buildAvery5160WordHtml } from "../templates/wordLabelTemplate";
import { showToast } from "../utils/logger";
import { insertOneTask } from "../core/recordInsert";
import { fetchAllRecords } from "../utils/record";
import {
  TASK_SEND_API,
  TASK_SYNC_STATUS_API,
  TASK_SYNC_TRIGGER_API,
} from "../config/config";
import { getTaskSyncWebhookUrl } from "../core/taskSyncWebhook";
import { showConfirmDialog } from "../utils/dialog";

// Helper: HTML escape utility for measurement content
function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper: Measure if a label with given date + N tasks fits into 1in height
// We approximate Word layout: content width ~= 2.625in - leftPad(0.12in) - rightPad(0.125in) = 2.38in
// Date font ~= 8.6pt, Task font ~= 7.6pt, task line-height ~= 1.1
const labelMeasure = (() => {
  let root: HTMLDivElement | null = null;
  const WIDTH_IN = 2.625 - 0.119 - 0.125; // in inches
  const MAX_HEIGHT_PX = 96; // 1in in CSS px @96dpi
  function ensure(): HTMLDivElement {
    if (!root) {
      root = document.createElement("div");
      root.id = "label-measure-root";
      root.style.position = "fixed";
      root.style.left = "-9999px";
      root.style.top = "-9999px";
      root.style.width = `${WIDTH_IN}in`;
      root.style.visibility = "hidden";
      root.style.zIndex = "-1";
      root.style.padding = "0";
      root.style.margin = "0";
      (root.style as any).border = "0";
      (root.style as any).boxSizing = "border-box";
      (root.style as any).whiteSpace = "normal";
      (root.style as any).wordBreak = "break-word";
      root.style.fontFamily =
        "'凌慧体-简','Microsoft YaHei',Arial,Helvetica,sans-serif";
      (root.style as any).fontWeight = "700";
      document.body.appendChild(root);
    }
    return root;
  }
  function buildHtml(dateStr: string, tasks: string[]): string {
    const date = `<div style="text-align:center;font-size:8.6pt;line-height:1.1;margin:0;padding:0">${escHtml(
      dateStr
    )}</div>`;
    const items = tasks
      .map(
        (t) =>
          `<div style="font-size:7.6pt;line-height:1.1;margin:0;padding:0">• ${escHtml(
            t
          )}</div>`
      )
      .join("");
    return date + items;
  }
  function fits(dateStr: string, tasks: string[]): boolean {
    const el = ensure();
    el.innerHTML = buildHtml(dateStr, tasks);
    // include top padding ~= 1pt (~1.33px) as buffer
    const h = el.clientHeight + 2;
    return h <= MAX_HEIGHT_PX;
  }
  return { fits };
})();

const MAX_BULK_INSERT = 30;

// 基于字符宽度的粗略行数估算：CJK 计 1 单位，ASCII 计 ~0.58 单位
function estimateTaskLines(text: string): number {
  const s = String(text || "");
  let units = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    units += code <= 0x007f ? 0.58 : 1;
  }
  const UNITS_PER_LINE = 26; // 7.6pt、~2.38in 内容宽度下的经验值
  return Math.max(1, Math.ceil(units / UNITS_PER_LINE));
}

type TaskPerson = {
  id: string;
  name?: string;
  enName?: string;
};

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value))
    return value.some((item) => hasMeaningfulValue(item));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text.trim().length > 0;
    if (typeof obj.name === "string") return obj.name.trim().length > 0;
    if (typeof obj.id === "string") return obj.id.trim().length > 0;
    return Object.keys(obj).length > 0;
  }
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

function cellToPlainText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return fmtYmd(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "number") return String(item);
        if (typeof item === "object" && typeof (item as any).text === "string")
          return (item as any).text;
        if (typeof item === "object" && typeof (item as any).name === "string")
          return (item as any).name;
        if (typeof item === "object" && typeof (item as any).value === "string")
          return (item as any).value;
        return "";
      })
      .filter((v) => v.trim().length > 0)
      .join("");
  }
  if (typeof value === "object" && value) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.value === "string") return obj.value;
  }
  return String(value ?? "");
}

function extractUsers(value: unknown): TaskPerson[] {
  if (!Array.isArray(value)) return [];
  const users: TaskPerson[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as any).id || "").trim();
    if (!id) continue;
    const person: TaskPerson = { id };
    const name = (item as any).name;
    const enName = (item as any).enName || (item as any).en_name;
    if (typeof name === "string" && name.trim().length > 0) person.name = name;
    if (typeof enName === "string" && enName.trim().length > 0)
      person.enName = enName;
    users.push(person);
  }
  return users;
}

function usersToDisplay(users: TaskPerson[]): string {
  return users
    .map((u) => u.name || u.enName || u.id)
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join(",");
}

function formatDeadlineValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && !Number.isNaN(value))
    return fmtYmd(new Date(value));
  if (value instanceof Date) return fmtYmd(value);
  if (typeof value === "string") return value;
  if (typeof value === "object" && value) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.value === "string") return obj.value;
  }
  return cellToPlainText(value);
}

type TaskSyncEntry = {
  recordId: string;
  payload?: Record<string, unknown>;
};

type TaskSyncResultEntry = {
  recordId?: string;
  status?: string;
  message?: string;
  detail?: string;
  http?: number;
  body?: unknown;
};

type TaskSyncStatus =
  | "pending"
  | "running"
  | "success"
  | "accepted"
  | "partial"
  | "error"
  | "unknown";

interface TaskSyncResponse {
  status: TaskSyncStatus;
  jobId?: string;
  results: TaskSyncResultEntry[];
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
}

const FINAL_TASK_STATUSES = new Set<TaskSyncStatus>([
  "success",
  "accepted",
  "partial",
  "error",
]);

function normalizeTaskResults(input: unknown): TaskSyncResultEntry[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as TaskSyncResultEntry[];
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results as TaskSyncResultEntry[];
    if (Array.isArray(obj.data)) return obj.data as TaskSyncResultEntry[];
    if (obj.result && Array.isArray(obj.result))
      return obj.result as TaskSyncResultEntry[];
    if (obj.recordId || obj.status || obj.message || obj.detail) {
      return [obj as TaskSyncResultEntry];
    }
  }
  return [];
}

function extractResultMessage(result: TaskSyncResultEntry): string {
  const candidates = [result.message, result.detail];
  for (const item of candidates) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim();
    }
  }
  if (typeof result.body === "string" && result.body.trim().length > 0) {
    return result.body.trim();
  }
  if (result.body && typeof result.body === "object") {
    try {
      return JSON.stringify(result.body);
    } catch (e) {
      console.warn("无法序列化任务同步 body", e);
    }
  }
  return "未知错误";
}

function summarizeFailure(results: TaskSyncResultEntry[], limit = 3): string {
  return results
    .slice(0, limit)
    .map((item) => {
      const id = item.recordId || "未知记录";
      return `${id}:${extractResultMessage(item)}`;
    })
    .join("；");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureTaskSyncConfig(): Promise<string> {
  if (!TASK_SYNC_TRIGGER_API || TASK_SYNC_TRIGGER_API.trim() === "") {
    throw new Error("未配置 TASK_SYNC_TRIGGER_API，无法同步任务");
  }
  const webhookUrl = await getTaskSyncWebhookUrl();
  if (!webhookUrl || webhookUrl.trim() === "") {
    throw new Error("未找到有效的任务同步 webhook 地址");
  }
  return webhookUrl.trim();
}

async function triggerTaskSyncBatch(
  entries: TaskSyncEntry[]
): Promise<TaskSyncResponse> {
  const webhookUrl = await ensureTaskSyncConfig();
  const resp = await fetch(TASK_SYNC_TRIGGER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhookUrl,
      records: entries,
    }),
  });

  const raw = await resp.text();
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn("解析任务同步响应 JSON 失败", err, raw);
      data = { raw };
    }
  }

  if (resp.status === 202) {
    const jobId = typeof data === "object" ? data?.jobId : undefined;
    if (!jobId) {
      throw new Error("批量同步已受理，但未返回 jobId");
    }
    return {
      status: (typeof data === "object" && data?.status) || "accepted",
      jobId,
      results: [],
      createdAt: data?.createdAt,
    };
  }

  if (resp.ok) {
    return {
      status: (typeof data === "object" && data?.status) || "success",
      results: normalizeTaskResults(data),
      createdAt: data?.createdAt,
      completedAt: data?.completedAt,
      updatedAt: data?.updatedAt,
    };
  }

  const message =
    (typeof data === "object" &&
      (data?.message || data?.detail || data?.error)) ||
    (typeof raw === "string" && raw) ||
    "任务同步请求失败";
  throw new Error(`HTTP ${resp.status}: ${message}`);
}

async function pollTaskSyncJob(
  jobId: string,
  options: { attempts?: number; intervalMs?: number } = {}
): Promise<TaskSyncResponse> {
  if (!TASK_SYNC_STATUS_API || TASK_SYNC_STATUS_API.trim() === "") {
    throw new Error("未配置 TASK_SYNC_STATUS_API，无法查询批量任务状态");
  }
  const { attempts = 12, intervalMs = 5000 } = options;
  const url = `${TASK_SYNC_STATUS_API}/${encodeURIComponent(jobId)}`;

  for (let i = 0; i < attempts; i++) {
    const wait = i === 0 ? 3000 : intervalMs;
    if (wait > 0) {
      await delay(wait);
    }

    const resp = await fetch(url, { method: "GET" });
    const raw = await resp.text();
    let data: any = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.warn("解析批量任务状态 JSON 失败", err, raw);
        data = { raw };
      }
    }

    if (resp.status === 404) {
      throw new Error("批量任务不存在或已过期");
    }
    if (!resp.ok) {
      const message =
        (typeof data === "object" &&
          (data?.message || data?.detail || data?.error)) ||
        raw ||
        "查询批量任务状态失败";
      throw new Error(`HTTP ${resp.status}: ${message}`);
    }

    const status: TaskSyncStatus =
      (typeof data === "object" && data?.status) || "unknown";
    if (!FINAL_TASK_STATUSES.has(status)) {
      continue;
    }

    return {
      status,
      jobId,
      results: normalizeTaskResults(data),
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      completedAt: data?.completedAt,
    };
  }

  throw new Error("批量任务未在预期时间内完成，请稍后查看运行日志");
}

export function bindUIEvents() {
  const $customDeadline = $("#customDeadlinePicker");
  const $deadlineRadios = $(
    "#todayRadio, #tomorrowRadio, #afterTomorrowRadio, #somedayRadio"
  );

  const handleInsertShortcut = (event: JQuery.KeyDownEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!$("#insertButton").prop("disabled")) {
        $("#insertButton").trigger("click");
      }
    }
  };

  if ($customDeadline.length) {
    const clearCustomDeadline = () => {
      const picker = ($customDeadline.get(0) as any)?._flatpickr;
      if (picker) {
        picker.clear();
      } else {
        $customDeadline.val("");
      }
    };

    $customDeadline.on("change", function () {
      const val = String($customDeadline.val() ?? "").trim();
      if (val) {
        $deadlineRadios.prop("checked", false);
      } else {
        if (!$deadlineRadios.is(":checked")) {
          $("#todayRadio").prop("checked", true);
        }
      }
      // 当通过日期选择器选择日期后，flatpickr 不会自动聚焦输入框，需要手动触发一次 focus，
      // 以便后续能在该输入框上监听到 Cmd/Ctrl + Enter 快捷键。
      $customDeadline.trigger("focus");
    });

    $deadlineRadios.on("change", function () {
      if ($(this).prop("checked")) {
        clearCustomDeadline();
      }
    });
  }

  $("#syncTasksButton").on("click", async function () {
    const btn = this as HTMLButtonElement;
    const originalText = btn.textContent || "";
    btn.disabled = true;
    btn.textContent = "同步中...";
    try {
      const table = await bitable.base.getActiveTable();
      const fieldMetas = await table.getFieldMetaList();
      const assigneesId = getFieldIdByName(
        fieldMetas,
        FIELD_KEYS.assignees.name,
        FIELD_KEYS.assignees.type
      );
      const taskNameId = getFieldIdByName(
        fieldMetas,
        FIELD_KEYS.taskName.name,
        FIELD_KEYS.taskName.type
      );
      const deadlineId = getFieldIdByName(
        fieldMetas,
        FIELD_KEYS.deadline.name,
        FIELD_KEYS.deadline.type
      );
      const statusId = getFieldIdByName(
        fieldMetas,
        FIELD_KEYS.status.name,
        FIELD_KEYS.status.type
      );
      const followersId = getFieldIdByName(
        fieldMetas,
        FIELD_KEYS.followers.name,
        FIELD_KEYS.followers.type
      );
      const remarkId = getFieldIdByName(fieldMetas, "任务备注", FieldType.Text);
      const commentId = getFieldIdByName(
        fieldMetas,
        "任务评论",
        FieldType.Text
      );

      if (!assigneesId || !taskNameId || !deadlineId || !statusId) {
        showUserError("未找到同步所需的字段，请确认当前表格字段配置");
        return;
      }

      const view = await table.getActiveView();
      let targetRecordIds: string[] = [];
      try {
        const selected = await (view as any)?.getSelectedRecordIdList?.();
        if (Array.isArray(selected)) {
          targetRecordIds = selected.filter(
            (id): id is string => typeof id === "string" && id.length > 0
          );
        }
      } catch (e) {
        console.warn("获取选中记录失败，fallback 到全部可见记录", e);
      }

      if (targetRecordIds.length === 0) {
        const confirmed = await showConfirmDialog({
          title: "同步当前视图?",
          message: "是否同步本视图所有记录!",
          confirmText: "同步全部",
          cancelText: "取消",
        });

        if (!confirmed) {
          showToast("已取消同步", "info");
          return;
        }

        const visible = await view.getVisibleRecordIdList();
        targetRecordIds = (visible || []).filter(
          (id): id is string => typeof id === "string" && id.length > 0
        );
      }

      targetRecordIds = Array.from(new Set(targetRecordIds));
      if (targetRecordIds.length === 0) {
        showUserError("当前视图没有可同步的记录");
        return;
      }

      const fetchResults = await Promise.allSettled(
        targetRecordIds.map(async (recordId) => {
          const value = await table.getRecordById(recordId);
          return {
            recordId,
            fields: (value && (value as any).fields) || {},
          };
        })
      );

      const records: { recordId: string; fields: Record<string, unknown> }[] =
        [];
      fetchResults.forEach((res, idx) => {
        const recordId = targetRecordIds[idx] || "未知记录";
        if (res.status === "fulfilled") {
          const value = res.value as { fields?: Record<string, unknown> };
          records.push({ recordId, fields: value?.fields ?? {} });
        } else {
          logError(`读取记录 ${recordId} 失败`, (res as any).reason);
        }
      });

      if (!records.length) {
        showUserError("未查找到可同步的记录数据");
        return;
      }

      const checked = records.map((rec) => {
        const fields = rec.fields || {};
        const conditions: string[] = [];
        if (!hasMeaningfulValue(fields[taskNameId]))
          conditions.push("任务名称");
        if (!hasMeaningfulValue(fields[assigneesId]))
          conditions.push("任务执行者");
        if (!hasMeaningfulValue(fields[deadlineId]))
          conditions.push("任务截止时间");
        if (!hasMeaningfulValue(fields[statusId]))
          conditions.push("任务完成状态");
        return { rec, missing: conditions };
      });

      const eligible = checked
        .filter((item) => item.missing.length === 0)
        .map((item) => item.rec);
      const skippedCount = checked.length - eligible.length;

      if (eligible.length === 0) {
        if (skippedCount > 0) {
          showUserError("选中记录均缺少必填字段，已取消同步");
        } else {
          showUserError("没有满足同步条件的记录");
        }
        return;
      }

      const syncEntries: TaskSyncEntry[] = eligible.map((rec) => {
        const fields = rec.fields || {};
        const executors = extractUsers(fields[assigneesId]);
        const followers = followersId ? extractUsers(fields[followersId]) : [];
        const payload: Record<string, unknown> = {
          任务表行: rec.recordId,
          操作: "同步任务",
          任务名称: cellToPlainText(fields[taskNameId]),
          任务截止时间: formatDeadlineValue(fields[deadlineId]),
          任务完成状态: cellToPlainText(fields[statusId]),
          执行者: executors,
          执行者名称: usersToDisplay(executors),
        };
        if (remarkId) payload["任务备注"] = cellToPlainText(fields[remarkId]);
        if (commentId) payload["任务评论"] = cellToPlainText(fields[commentId]);
        if (followersId) {
          payload["任务关注者"] = followers;
          payload["任务关注者名称"] = usersToDisplay(followers);
        }
        return { recordId: rec.recordId, payload };
      });

      const triggerResponse = await triggerTaskSyncBatch(syncEntries);
      let finalResponse = triggerResponse;

      if (triggerResponse.jobId) {
        showToast(
          `已提交 ${syncEntries.length} 条任务，集成流执行中...`,
          "info"
        );
        const attempts = Math.max(12, Math.ceil(syncEntries.length * 1.5));
        finalResponse = await pollTaskSyncJob(triggerResponse.jobId, {
          attempts,
          intervalMs: 5000,
        });
      }

      let results = finalResponse.results || [];
      if (results.length === 0 && finalResponse.status === "success") {
        results = syncEntries.map((entry) => ({
          recordId: entry.recordId,
          status: "success",
        }));
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const acceptedResults = results.filter((r) => r.status === "accepted");
      const acceptedCount = acceptedResults.length;
      const failedResults = results.filter((r) => r.status === "error");
      const failureCount = failedResults.length;
      const totalSubmitted = syncEntries.length;
      const pendingCount = Math.max(
        0,
        totalSubmitted - (successCount + acceptedCount + failureCount)
      );

      if (failureCount === 0 && acceptedCount === 0) {
        const skippedMsg = skippedCount > 0 ? `，跳过 ${skippedCount} 条` : "";
        showToast(`成功同步 ${successCount} 条任务${skippedMsg}`, "success");
      } else if (failureCount === 0) {
        const acceptedMsg =
          acceptedCount > 0 ? `，${acceptedCount} 条任务仍在集成流中执行` : "";
        const pendingMsg =
          pendingCount > 0 ? `，${pendingCount} 条任务状态待确认` : "";
        const skippedMsg = skippedCount > 0 ? `，跳过 ${skippedCount} 条` : "";
        showToast(
          `已提交 ${totalSubmitted} 条任务${acceptedMsg}${pendingMsg}${skippedMsg}，请稍后在任务助手查看结果`,
          "warning"
        );
      } else {
        const failureSummary = summarizeFailure(failedResults);
        const acceptedMsg =
          acceptedCount > 0 ? `，另有 ${acceptedCount} 条待确认` : "";
        const skippedMsg =
          skippedCount > 0 ? `，另外跳过 ${skippedCount} 条` : "";
        showUserError(
          `同步完成：成功 ${successCount} 条，失败 ${failureCount} 条${acceptedMsg}${skippedMsg}。失败详情：${failureSummary}`
        );
      }
    } catch (err) {
      logError("批量同步任务失败", err);
      const reason = err instanceof Error ? err.message : "未知错误";
      showUserError(`批量同步任务时发生异常：${reason}`);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  $("#sendRecord").on("click", async function () {
    // 获取复选框 #thisWeekCheckbox 的选中状态，返回 true 或 false，表示用户是否选择了“本周”选项
    const isThisWeekChecked = $("#thisWeekCheckbox").prop("checked"); //	•	prop() 是 jQuery 提供的方法，用于操作 DOM 元素的属性。与 .attr() 方法不同，.prop() 是用来处理 布尔属性（如 checked, disabled, selected 等）的。
    const includeMe = $("#includeMeCheckbox").prop("checked");
    const includeCompleted = $("#includeCompletedCheckbox").prop("checked");
    const picked = String($("#dateSelect").val() || "").trim(); //// 获取 #dateSelect 输入框的值，如果没有值则默认为空字符串，并去除前后空格
    if (!picked) {
      showUserError("请先选择日期");
      return;
    }

    // 将用户输入的日期字符串解析为 Date 对象，方便进行本周范围推算等逻辑处理
    const pickedDate = parseYmd(picked);
    // 将标准化后的日期对象格式化为 "YYYY/MM/DD" 字符串，用于与表格字段一致性匹配，确保日期格式统一
    const pickedNorm = fmtYmd(pickedDate);

    // 为了推算“本周起始日”，基于 pickedDate 创建一个新的日期对象副本
    // 避免直接修改 pickedDate 本身，确保后续逻辑仍可使用原始日期
    const weekStartDate = new Date(pickedDate);
    weekStartDate.setDate(weekStartDate.getDate() - pickedDate.getDay() + 1);
    // 将日期调整到本周周一：getDay() 返回当前是星期几（0 = 周日，1 = 周一，...，6 = 周六）
    // 注意：当为周日（getDay() === 0）时，结果会偏移到“下周一”而非本周，若要更严谨处理需额外判断
    const weekEndDate = new Date(weekStartDate); //建立一个拷贝
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekStart = fmtYmd(weekStartDate);
    const weekEnd = fmtYmd(weekEndDate);

    let table: any;
    let fieldMetas: any[];
    let recordList: any[];
    try {
      table = await bitable.base.getActiveTable();
      //    getFieldMetaList = [
      //     {
      //         "id": "fldxpJqJ9a",
      //         "type": 1,
      //         "name": "任务名称",
      //         "property": null,
      //         "isPrimary": true,
      //         "description": {
      //             "disableSyncToFormDesc": false,
      //             "content": null
      //         },
      //         "exInfo": {
      //             "formData": {},
      //             "isDebug": false
      //         }
      //     },

      //     {
      //         "id": "fldVQ716cd",
      //         "type": 1002,
      //         "name": "更新时间",
      //         "property": {
      //             "dateFormat": "yyyy-MM-dd HH:mm",
      //             "displayTimeZone": false
      //         },
      //         "isPrimary": false,
      //         "description": {
      //             "disableSyncToFormDesc": false,
      //             "content": null
      //         },
      //         "exInfo": {
      //             "formData": {},
      //             "isDebug": false
      //         }
      //     },
      //     {
      //         "id": "fldyxejBMH",
      //         "type": 3,
      //         "name": "项目名称",
      //         "property": {
      //             "options": [
      //                 {
      //                     "name": "DTC Marker",
      //                     "color": 0,
      //                     "id": "opt3Q4yE1Q"
      //                 },
      //                 {
      //                     "color": 1,
      //                     "id": "optKNq7eAM",
      //                     "name": "Xmas 2026"
      //                 }
      //             ],
      //             "optionsType": 0
      //         },
      //         "isPrimary": false,
      //         "description": {
      //             "disableSyncToFormDesc": false,
      //             "content": null
      //         },
      //         "exInfo": {
      //             "formData": {},
      //             "isDebug": false
      //         }
      //     },
      //     {
      //         "id": "fld9Jqk1Vg",
      //         "type": 0,
      //         "name": "同步任务",
      //         "property": null,
      //         "isPrimary": false,
      //         "description": {
      //             "disableSyncToFormDesc": false,
      //             "content": null
      //         },
      //         "exInfo": {
      //             "formData": {},
      //             "isDebug": false
      //         }
      //     },
      // ]
      //    getRecordList = [
      //     {
      //         "recordId": "recuTtKk7U5qfc",
      //         "fields": {
      //             "fld2hzbGCG": 1755006720000,
      //             "fldVQ716cd": 1755004259000,
      //             "fld9Jqk1Vg": null,
      //             "fldMCnyvsn": null,
      //             "fld9wVhveK": null,
      //             "fldyxejBMH": {
      //                 "id": "optKNq7eAM",
      //                 "text": "Xmas 2026"
      //             },
      //             "fldbrG3Hmv": {
      //                 "id": "optGJ2VFMi",
      //                 "text": "未完成"
      //             },
      //             "fldxpJqJ9a": [
      //                 {
      //                     "type": "text",
      //                     "text": "Test 3"
      //                 }
      //             ],
      //             "fldFWfoOTA": [
      //                 {
      //                     "id": "ou_e4fe1d467290b5a3fa165e0b899f6d6a",
      //                     "name": "王玲",
      //                     "enName": "Willa Wang",
      //                     "en_name": "Willa Wang"
      //                 }
      //             ],
      //             "fldV9X8gqb": [
      //                 {
      //                     "id": "ou_cb3a7f8f4133a895db91931f121b0cc1",
      //                     "name": "邓有书",
      //                     "enName": "Susan Deng",
      //                     "en_name": "Susan Deng"
      //                 }
      //             ]
      //         }
      //     }
      // ]
      // 读取字段元数据与记录列表
      fieldMetas = await table.getFieldMetaList();
      // 从表格中获取记录列表，返回表格中的所有记录（即表格的行数据）
      recordList = await fetchAllRecords(table);
    } catch (err) {
      logError("获取表格字段和记录失败", err);
      showUserError("无法读取表格字段或记录，请检查权限或网络连接");
      return;
    }

    const assigneesId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.assignees.name,
      FIELD_KEYS.assignees.type
    );
    const projectId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.project.name,
      FIELD_KEYS.project.type
    );
    const taskNameId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.taskName.name,
      FIELD_KEYS.taskName.type
    );
    const statusId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.status.name,
      FIELD_KEYS.status.type
    );
    const deadlineId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.deadline.name,
      FIELD_KEYS.deadline.type
    );

    if (!assigneesId || !projectId || !taskNameId || !statusId || !deadlineId) {
      showUserError(
        "部分字段未配置，请确认执行人、项目、任务名称、状态、截止是否存在(你可能没有在任务管理器表格中)"
      );
      return;
    }

    /**
     * 使用三元运算符根据 `isThisWeekChecked` 的值判断是否设置本周日期范围：
     * - 如果 `isThisWeekChecked` 为 `true`，返回一个包含 `start` 和 `end` 的对象，表示本周的起始和结束日期。
     * - 如果 `isThisWeekChecked` 为 `false`，则返回 `undefined`，表示没有日期范围。
     *
     */
    // console.log(recordList, deadlineId, pickedNorm);
    const { matched, weekMatched } = filterTasksByDate(
      /**
       * `recordList` 是 `bitable` 返回的类数组对象，类似数组，但不是标准的 JavaScript 数组。
       * 它具有 `length` 属性和通过索引访问元素的功能，因此可以使用 `for` 循环、`forEach()` 等方式遍历元素。
       * 尽管它不是数组，但它提供了类似数组的方法，可以像处理数组一样处理 `recordList`。
       */
      recordList,
      deadlineId,
      assigneesId,
      taskNameId,
      statusId,
      pickedNorm,

      // 为什么 undefined 可以作为参数传递：
      // 1.	可选参数（Optional Parameter）：
      // •	在 TypeScript 中，当你为函数定义一个可选参数时，该参数默认会被赋值为 undefined，如果调用该函数时没有传递对应的值。
      // •	你可以显式地传递 undefined，并且它会被视为一个有效的值。
      // 2.	默认值为 undefined：
      // •	如果函数参数是 可选的，并且没有传递该参数，那么该参数的默认值就是 undefined。
      // •	你也可以显式传递 undefined，这会覆盖默认值，保持 undefined。
      isThisWeekChecked ? { start: weekStart, end: weekEnd } : undefined,
      true,
      includeCompleted
    );

    // 应用“我(me)”过滤：未勾选则排除我的任务
    try {
      const myUserId = await (bitable as any)?.bridge?.getUserId?.();
      if (myUserId && includeMe === false) {
        const notMe = (rec: any) => {
          if (typeof assigneesId !== "string") return true;
          const arr = rec?.record?.fields?.[assigneesId as string];
          if (!Array.isArray(arr)) return true;
          return !arr.some(
            (p: any) => String(p?.id || "") === String(myUserId)
          );
        };
        for (let i = matched.length - 1; i >= 0; i--)
          if (!notMe(matched[i])) matched.splice(i, 1);
        for (let i = weekMatched.length - 1; i >= 0; i--)
          if (!notMe(weekMatched[i])) weekMatched.splice(i, 1);
      }
    } catch (e) {
      console.warn("无法获取当前用户 ID，跳过‘我(me)’过滤:", e);
    }

    const generatedSummaryText = buildTaskSummary(matched, weekMatched, {
      assigneesId,
      projectId,
      taskNameId,
      statusId,
      pickedDateStr: pickedNorm,
      isThisWeek: isThisWeekChecked,
    });

    console.log(generatedSummaryText);

    // console.log(generatedSummaryText);

    // 读取 PD / OPS 勾选状态
    const pdChecked = $("#pdCheckbox").prop("checked");
    const opsChecked = $("#opsCheckbox").prop("checked");

    // 未配置后端时，给出明确提示并跳过网络发送
    if (!TASK_SEND_API || TASK_SEND_API.trim() === "") {
      showUserError("未配置后端地址，已跳过发送（上线审核运行安全策略）");
      return;
    }

    // 发送到后端的内容（也会在 request.ts 内再次打印）
    const ok = await sendSummaryToServer({
      summaryText: generatedSummaryText,
      pd: !!pdChecked,
      ops: !!opsChecked,
    });
    if (ok) {
      showUserError("信息已成功发送到后端进行处理");
    } else {
      showUserError("发送信息到后端失败，请检查控制台日志");
    }
  });

  // 插入任务按钮：根据文本框与日期单选插入一条记录
  $("#insertButton").on("click", async function () {
    const rawInput = String($("#insertText").val() || "");
    const tasks = rawInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (tasks.length === 0) {
      showUserError("请输入至少一条任务名称（每行一条）");
      return;
    }
    if (tasks.length > MAX_BULK_INSERT) {
      showUserError(`一次最多插入 ${MAX_BULK_INSERT} 条任务，请分批处理`);
      return;
    }

    const btn = this as HTMLButtonElement;
    const originalLabel = btn.textContent || "插入";
    btn.disabled = true;
    btn.textContent = "插入中...";

    try {
      let deadlineTimestamp: number | undefined;

      if ($customDeadline.length) {
        const customValue = String($customDeadline.val() ?? "").trim();
        if (customValue) {
          const parts = customValue
            .split(/[\-\/]/)
            .map((part) => Number(part));
          if (parts.length === 3) {
            const [year, month, day] = parts;
            if (
              Number.isFinite(year) &&
              Number.isFinite(month) &&
              Number.isFinite(day)
            ) {
              const customDate = new Date(year, month - 1, day);
              customDate.setHours(0, 0, 0, 0);
              if (!Number.isNaN(customDate.getTime())) {
                deadlineTimestamp = customDate.getTime();
              }
            }
          }
        }
      }

      const somedaySelected = $("#somedayRadio").prop("checked");

      if (somedaySelected) {
        deadlineTimestamp = undefined;
      } else if (typeof deadlineTimestamp !== "number") {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        let offsetDays = 0;
        if ($("#tomorrowRadio").prop("checked")) offsetDays = 1;
        else if ($("#afterTomorrowRadio").prop("checked")) offsetDays = 2;
        deadlineTimestamp = base.getTime() + offsetDays * 24 * 60 * 60 * 1000;
      }

      const table = await bitable.base.getActiveTable();
      const fieldMetas = await table.getFieldMetaList();
      const taskNameId = getFieldIdByName(
        fieldMetas as any[],
        FIELD_KEYS.taskName.name,
        FIELD_KEYS.taskName.type
      );
      if (!taskNameId) {
        showUserError("未找到任务名称字段，可能不在任务管理器表格中");
        return;
      }

      const existingNames = new Set<string>();
      try {
        const recordIdList = await table.getRecordIdList();
        const textField: any = await table.getField(taskNameId);
        for (const rid of recordIdList) {
          try {
            const val = await textField.getValue(rid);
            const plain = cellToPlainText(val).trim();
            if (plain) existingNames.add(plain);
          } catch (err) {
            console.warn("读取任务名称失败，将忽略该记录", err);
          }
        }
      } catch (err) {
        console.warn("获取现有任务列表失败，继续尝试插入", err);
      }

      let meId: string | undefined;
      try {
        meId = await (bitable as any)?.bridge?.getUserId?.();
      } catch (e) {
        console.warn("获取当前用户失败，将不写入执行者/关注者:", e);
      }

      const successes: { task: string; recordId: string; duplicated: boolean }[] = [];
      const duplicates: string[] = [];
      const failures: { task: string; reason: string }[] = [];

      for (const taskName of tasks) {
        const alreadyExists = existingNames.has(taskName);
        if (alreadyExists) {
          duplicates.push(taskName);
        }

        const payload: any = {
          taskName,
          project: "日常任务",
          status: "未完成",
          deadline: deadlineTimestamp,
        };
        if (meId) {
          payload.assignees = [{ id: String(meId) }];
          payload.followers = [{ id: String(meId) }];
        }

        try {
          const recordId = await insertOneTask(payload);
          successes.push({ task: taskName, recordId, duplicated: alreadyExists });
          existingNames.add(taskName);
        } catch (err) {
          logError(`插入记录 ${taskName} 失败`, err);
          const reason = err instanceof Error ? err.message : "未知错误";
          failures.push({ task: taskName, reason });
        }
      }

      const summaryParts: string[] = [];
      if (successes.length > 0)
        summaryParts.push(`成功 ${successes.length} 条`);
      if (duplicates.length > 0)
        summaryParts.push(`重复 ${duplicates.length} 条（已重新创建）`);
      if (failures.length > 0) summaryParts.push(`失败 ${failures.length} 条`);

      const formatListPreview = (items: string[]): string => {
        const preview = items.slice(0, 3).join("、");
        return items.length > 3 ? `${preview}…` : preview;
      };

      if (failures.length === 0 && duplicates.length === 0) {
        showToast(summaryParts.join("，"), "success");
        $("#insertText").val("");
      } else {
        const detailParts: string[] = [];
        if (duplicates.length > 0) {
          detailParts.push(`重复（已重新创建）: ${formatListPreview(duplicates)}`);
        }
        if (failures.length > 0) {
          const failurePreview = failures
            .slice(0, 3)
            .map((item) => `${item.task}:${item.reason}`)
            .join("；");
          detailParts.push(
            `失败: ${failurePreview}${failures.length > 3 ? "…" : ""}`
          );
        }
        const message = `${summaryParts.join("，")}。${detailParts.join("；")}`;
        showToast(message, "warning");
        const remaining = failures.map((item) => item.task);
        $("#insertText").val(remaining.join("\n"));
      }
    } catch (err) {
      logError("插入记录失败", err);
      const reason = err instanceof Error ? err.message : "未知错误";
      showUserError(`插入记录失败：${reason}`);
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });

  $("#insertText").on("keydown", handleInsertShortcut);
  $deadlineRadios.on("keydown", handleInsertShortcut);
  $customDeadline.on("keydown", handleInsertShortcut);
}

$("#generateLabel").on("click", async function () {
  try {
    // 读取起始位置与输出模式
    const posRaw = String($("#labelPosition").val() || "").trim();
    const parsedPos = parseInt(posRaw || "1", 10); // parseInt 功能: 将字符串解析为整数；语法: parseInt(string, radix) -> number/NaN，radix 取 2–36，建议显式传 10；若posRaw为则空默认用 "1", 10代表十进制的数字. 如果输入的是字母, 那么返回Nan

    // 说明：
    // - 定义与赋值：使用 const 声明常量 startPos，右侧表达式求值后赋给它。
    // - 立即执行函数（IIFE）：(() => { ... })() 先声明箭头函数再立刻调用，返回值用定义完就立刻调用的函数。于初始化 startPos。IIFE 的“立即执行”就是靠后面的 () 完成的。IIFE 简介 定义: 立即执行函数表达式（Immediately Invoked Function Expression），
    // - 箭头函数语法：() => { ... } 表示无参数函数，函数体内需显式 return。
    // - 三元运算符：Number.isFinite(parsedPos) ? parsedPos : 1
    //   若 parsedPos 是有限数则取其值，否则取 1。
    // - 内置校验：Number.isFinite(x) 用于判定 x 是否为有限数，排除 NaN/Infinity。
    // - 数值裁剪：Math.min(30, Math.max(1, n)) 将 n 限制在 [1, 30] 区间内。
    // - 执行顺序：IIFE 执行时先计算 n，再返回裁剪后的值赋给 startPos。
    const startPos = (() => {
      const n = Number.isFinite(parsedPos) ? parsedPos : 1; //这一段的目的是排除NaN, 意思就是如果文本框里面选择的是字母, 那么在const parsedPos = parseInt(posRaw || "1", 10)中就会返回Nan, 那么这里的目的就是当parsePos为Nan, 用1来兜底.
      return Math.min(30, Math.max(1, n)); //这里的目的是为了上下裁剪, 万一数字小于1应该改成1, 万一数字大于30则要改成30, 就是为了安全, 仅此而已.
    })();
    const exportMode = String($("#exportMode").val() || "word");
    const includeMe = $("#includeMeCheckbox").prop("checked");
    const includeCompleted = $("#includeCompletedCheckbox").prop("checked");

    // 读取并规范日期（改为读取 print label 专用日期框）
    const pickedRaw = String($("#labelDateSelect").val() || "").trim();
    if (!pickedRaw) {
      showUserError("请先选择日期");
      return;
    }
    const pickedDate = parseYmd(pickedRaw);
    const pickedNorm = fmtYmd(pickedDate);
    // 用于标签第一行的英文长日期，例如 "Friday, Aug 1, 2025"
    // Intl.DateTimeFormat 属于标准的 ECMAScript Internationalization API（内置在浏览器和 Node.js 的全局 Intl 命名空间里）。
    // 更准确地说：Intl.DateTimeFormat 是构造器（可带或不带 new 调用），返回一个“日期时间格式化器实例”。该实例对象上有方法：format(...)、formatToParts(...)、resolvedOptions() 等。
    // 对。format 接受一个 Date 实例或一个时间戳（毫秒数）。例如：
    // fmt.format(new Date(2025, 7, 1))
    // fmt.format(Date.now())
    // 传入无效日期（如 new Date(NaN)) 会得到 “Invalid Date”。建议始终传入合法 Date。
    const pickedLong = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(pickedDate);

    // 获取任务记录并筛选出所选日期的任务（直接复用已有工具函数，而非依赖缓存）
    let table, fieldMetas, recordList;
    try {
      table = await bitable.base.getActiveTable();
      fieldMetas = await table.getFieldMetaList();
      let viewId: string | undefined;
      try {
        const view = await table.getActiveView();
        if (view) {
          if (typeof (view as any)?.id === "string") {
            viewId = (view as any).id;
          } else if (typeof (view as any)?.getId === "function") {
            viewId = await (view as any).getId();
          }
        }
      } catch (viewErr) {
        console.warn("获取当前视图失败，将使用整个数据表", viewErr);
      }
      recordList = await fetchAllRecords(table, { viewId });
    } catch (err) {
      logError("获取表格字段和记录失败", err);
      showUserError("无法读取表格字段或记录，请检查权限或网络连接");
      return;
    }

    const assigneesId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.assignees.name,
      FIELD_KEYS.assignees.type
    );
    const projectId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.project.name,
      FIELD_KEYS.project.type
    );
    const taskNameId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.taskName.name,
      FIELD_KEYS.taskName.type
    );
    const statusId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.status.name,
      FIELD_KEYS.status.type
    );
    const deadlineId = getFieldIdByName(
      fieldMetas,
      FIELD_KEYS.deadline.name,
      FIELD_KEYS.deadline.type
    );

    if (!taskNameId) {
      showUserError("有部分记录没有填写任务名称(你可能没有在任务管理器表格中)");
      return;
    }

    const { matched } = filterTasksByDate(
      recordList,
      deadlineId as string,
      assigneesId as string,
      taskNameId,
      statusId as string,
      pickedNorm,
      undefined,
      false,
      includeCompleted
    );

    if ((import.meta.env as any)?.MODE !== "production") {
      console.groupCollapsed(
        "Label generator input",
        `picked=${pickedNorm}`,
        `includeCompleted=${includeCompleted}`
      );
      const debugRecords = Array.from(recordList).map((rec: any) => ({
        id: rec?.record?.recordId,
        deadline: rec?.record?.fields?.[deadlineId as string],
        status: rec?.record?.fields?.[statusId as string]?.text ?? rec?.record?.fields?.[statusId as string],
        task: getFieldText(rec, taskNameId),
      }));
      console.table(debugRecords);
      console.log(
        "matched",
        matched.length,
        matched.map((rec) => ({
          id: rec?.record?.recordId,
          task: getFieldText(rec, taskNameId),
        }))
      );
      console.groupEnd();
    }


    // 根据“我 (me)”选择框过滤包含/排除“我的任务”
    try {
      const myUserId = await (bitable as any)?.bridge?.getUserId?.();
      if (myUserId && includeMe === false) {
        const notMe = (rec: any) => {
          if (typeof assigneesId !== "string") return true;
          const arr = rec?.record?.fields?.[assigneesId as string];
          if (!Array.isArray(arr)) return true; // 无执行人，则不视为“我”，保留
          return !arr.some(
            (p: any) => String(p?.id || "") === String(myUserId)
          );
        };
        // 直接覆盖 matched（后续用于发送与生成标签）
        for (let i = matched.length - 1; i >= 0; i--) {
          if (!notMe(matched[i])) matched.splice(i, 1);
        }
      }
    } catch (e) {
      console.warn("无法获取当前用户 ID，跳过‘我(me)’过滤:", e);
    }

    const taskLines: string[] = matched
      .map((rec) => getFieldText(rec, taskNameId))
      .map((s) => String(s || "").trim())
      .filter((s) => s.length > 0);

    // 若没有可用任务，则提示并终止导出
    if (taskLines.length === 0) {
      showUserError("没有任务可以转换成 Label");
      return;
    }

    // 将任务按“行数预算”分组：每 label 任务最多占 4 行（日期占 1 行）
    const labelPayloads: string[] = [];
    const labelPayloadsHtml: string[] = [];
    let iTask = 0;
    while (iTask < taskLines.length) {
      const chosen: string[] = [];
      let remaining = 4;
      while (iTask < taskLines.length) {
        const t = taskLines[iTask];
        const need = estimateTaskLines(t);
        if (need <= remaining) {
          chosen.push(t);
          remaining -= need;
          iTask++;
        } else {
          break;
        }
      }
      if (chosen.length === 0) {
        // 单条任务就超出 4 行，强制放入当前 label，避免死循环
        chosen.push(taskLines[iTask]);
        iTask++;
      }
      // 额外保守：若 DOM 估算仍超 1in，则去掉最后一条
      if (!labelMeasure.fits(pickedLong, chosen) && chosen.length > 1) {
        chosen.pop();
        iTask--;
      }
      labelPayloads.push(
        `${pickedLong}\n${chosen.map((t) => `• ${t}`).join("\n")}`
      );
      const html = [
        `<div class=\"date\">${pickedLong}</div>`,
        ...chosen.map((t) => `<div class=\"task\">• ${t}</div>`),
      ].join("");
      labelPayloadsHtml.push(html);
    }

    // 将标签内容按起始位置填入 3x10 的网格中，剩余位置留空
    // 类型注解：labels: string[] 表示这是“字符串数组”。new Array(30) 生成一个长度为 30 的数组（初始是稀疏数组）.fill("") 把 30 个位置都用空字符串填满，便于后续按索引写入与遍历。
    const labels: string[] = new Array(30).fill("");
    const labelsHtml: string[] = new Array(30).fill("");
    for (let i = 0; i < labelPayloads.length && startPos - 1 + i < 30; i++) {
      labels[startPos - 1 + i] = labelPayloads[i];
      labelsHtml[startPos - 1 + i] = labelPayloadsHtml[i];
    }

    // 生成浏览器打印用的 Grid 布局 HTML（保持原有逻辑）
    const browserHtml = (() => {
      // 为 Word/打印准备的最小化 CSS（偏向稳定与速度）
      const css = `
        /* 极简强制：建议浏览器使用 Letter 纸张与页边距 */
        @page { size: Letter; margin: 0.5in 0.1875in; }
        html, body { padding: 0; margin: 0; }
        .sheet {
          width: 100%;
          display: grid;
          grid-template-columns: 2.625in 2.625in 2.625in;
          grid-auto-flow: row;
          column-gap: 0.125in; /* 列间距约 3.175mm */
          row-gap: 0; /* Avery 5160 行距几乎为 0 */
        }
        .label {
          box-sizing: border-box;
          height: 1in;           /* Avery 5160 高度约 25.4mm */
          padding: 0.08in 0.12in;      /* 内容留白，避免裁切 */ /* 先给上下/左右一个基线 */
          padding-top: 0.04in;         /* 恢复初始上边距 */
          padding-left: 0.18in;        /* 向右偏约 3mm（总左距约 0.18in） */
                           
          border: 0;             /* 打印时无需边框 */
          display: flex;
          flex-direction: column; /* 让子元素逐行排列，便于只调整日期样式 */
          align-items: flex-start;  /* 顶部对齐 */
          justify-content: flex-start; /* 左侧对齐 */
          text-align: left;
          font-family: '凌慧体-简', 'Microsoft YaHei', Arial, Helvetica, sans-serif;
          font-size: 9.5pt;             /* 再增大一点点，提升可读性 */
          font-weight: 700;
          line-height: 1.25;
          white-space: normal;   /* 由块元素分行 */
          word-break: break-word;
          overflow: hidden;
        }
        .label .date { display:block; width:100%; text-align:center; font-size: 11pt; line-height: 1.2; margin-bottom: 0.02in; }
        .label .task { line-height: 1.25; }
        /* 占位空标签，保持网格位置 */
        .label.placeholder { color: transparent; }
      `;

      const cells = labelsHtml
        .map((text) => {
          const content = text ? text : " ";
          const isPlaceholder = text ? "" : " placeholder";
          return `<div class="label${isPlaceholder}">${content}</div>`;
        })
        .join("");

      return `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Avery 5160 Labels</title>
            <style>${css}</style>
          </head>
          <body>
            <div class="sheet">${cells}</div>
          </body>
        </html>`;
    })();

    if (exportMode === "word") {
      // 使用 HTML as .doc 导出（恢复“老方法”）。
      const wordHtml = buildAvery5160WordHtml(labels);
      const blob = new Blob([wordHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const tsStr = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(ts.getDate()).padStart(2, "0")}-${String(
        ts.getHours()
      ).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(
        ts.getSeconds()
      ).padStart(2, "0")}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `Avery-5160-Labels-${tsStr}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`已导出: ${a.download}`, "success");
    } else {
      // 直接打印：新窗口载入并触发打印
      const printWin = window.open("", "_blank");
      if (!printWin) {
        showUserError("无法打开打印窗口，请检查浏览器拦截设置");
        return;
      }
      printWin.document.open();
      printWin.document.write(browserHtml);
      printWin.document.close();
      // 等待渲染完成后打印，避免空白页
      printWin.onload = () => {
        printWin.focus();
        printWin.print();
      };
    }
  } catch (err) {
    logError("生成 Avery 标签失败", err);
    showUserError("生成 Avery 标签失败，请查看控制台日志");
  }
});
