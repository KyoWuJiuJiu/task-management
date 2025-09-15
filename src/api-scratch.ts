import { bitable, TableNameRepeatedError } from "@lark-base-open/js-sdk";
import { insertOneTask } from "./core/recordInsert";

export async function runApiSmoke() {
  // 使用 getRecordList + getCellByField + getValue 组合方式，是新版前端 SDK 的标准用法
  const table = await bitable.base.getActiveTable();
  const recordList = await table.getRecordList();
  console.log("[api-scratch] recordList length:", recordList.length);

  // 可选：通过 query 参数触发插入测试（避免误操作）
  const params = new URLSearchParams(location.search);
  if (params.get("insert") === "1") {
    try {
      const myUserId = await (bitable as any)?.bridge?.getUserId?.();
      const ts = Date.now();
      const rid = await insertOneTask({
        taskName: `Demo 插入 ${new Date(ts).toLocaleString()}`,
        project: "Demo",
        status: "未完成",
        assignees: myUserId ? [{ id: String(myUserId) }] : undefined,
        deadline: ts,
      });
      console.log("[api-scratch] 新增记录 recordId:", rid);
    } catch (e) {
      console.error("[api-scratch] 插入记录失败:", e);
    }
  }
}
