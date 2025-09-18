import { bitable } from "@lark-base-open/js-sdk";
import type {
  ITextField,
  ISingleSelectField,
  IUserField,
  IDateTimeField,
  IFieldMeta,
  ICell,
} from "@lark-base-open/js-sdk";
import { getFieldIdByName } from "../utils/field";
import { FIELD_KEYS } from "../config/fields";

export type InsertTaskInput = {
  taskName: string;
  project?: string; // 单选：传选项文本或选项 id
  status?: string; // 单选：传选项文本或选项 id
  assignees?: { id: string; name?: string; enName?: string }[]; // 人员
  followers?: { id: string; name?: string; enName?: string }[]; // 人员
  deadline?: number; // 毫秒时间戳
};

async function getRequiredFields() {
  const table = await bitable.base.getActiveTable();
  const fieldMetas: IFieldMeta[] = await table.getFieldMetaList();

  const taskNameId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.taskName.name,
    FIELD_KEYS.taskName.type
  );
  const projectId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.project.name,
    FIELD_KEYS.project.type
  );
  const statusId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.status.name,
    FIELD_KEYS.status.type
  );
  const assigneesId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.assignees.name,
    FIELD_KEYS.assignees.type
  );
  const followersId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.followers.name,
    FIELD_KEYS.followers.type
  );
  const deadlineId = getFieldIdByName(
    fieldMetas as any[],
    FIELD_KEYS.deadline.name,
    FIELD_KEYS.deadline.type
  );

  if (!taskNameId)
    throw new Error("未找到任务名称字段,你可能没有在任务管理器这张表格中");

  return {
    table,
    taskNameField: await table.getField<ITextField>(taskNameId),
    projectField: projectId
      ? await table.getField<ISingleSelectField>(projectId)
      : undefined,
    statusField: statusId
      ? await table.getField<ISingleSelectField>(statusId)
      : undefined,
    assigneesField: assigneesId
      ? await table.getField<IUserField>(assigneesId)
      : undefined,
    followersField: followersId
      ? await table.getField<IUserField>(followersId)
      : undefined,
    deadlineField: deadlineId
      ? await table.getField<IDateTimeField>(deadlineId)
      : undefined,
  };
}

export async function insertOneTask(input: InsertTaskInput): Promise<string> {
  const {
    table,
    taskNameField,
    projectField,
    statusField,
    assigneesField,
    followersField,
    deadlineField,
  } = await getRequiredFields();

  const cells: ICell[] = [] as any;
  // 文本：任务名称（必填）
  cells.push(await taskNameField.createCell(input.taskName));
  // 单选：项目
  if (projectField && input.project) {
    cells.push(await projectField.createCell(input.project));
  }
  // 单选：状态
  if (statusField && input.status) {
    cells.push(await statusField.createCell(input.status));
  }
  // 人员：执行人（支持多选）
  if (assigneesField && input.assignees && input.assignees.length > 0) {
    cells.push(await assigneesField.createCell(input.assignees));
  }
  // 人员：关注者（支持多选）
  if (followersField && input.followers && input.followers.length > 0) {
    cells.push(await followersField.createCell(input.followers));
  }
  // 日期：截止时间
  if (deadlineField && typeof input.deadline === "number") {
    cells.push(await deadlineField.createCell(input.deadline));
  }

  // 使用 Cell 组合新增记录
  const recordId = await table.addRecord(cells);
  return recordId;
}

export async function insertManyTasks(
  list: InsertTaskInput[]
): Promise<string[]> {
  const {
    table,
    taskNameField,
    projectField,
    statusField,
    assigneesField,
    followersField,
    deadlineField,
  } = await getRequiredFields();

  const rows: ICell[][] = [];
  for (const input of list) {
    const cells: ICell[] = [] as any;
    cells.push(await taskNameField.createCell(input.taskName));
    if (projectField && input.project)
      cells.push(await projectField.createCell(input.project));
    if (statusField && input.status)
      cells.push(await statusField.createCell(input.status));
    if (assigneesField && input.assignees?.length)
      cells.push(await assigneesField.createCell(input.assignees));
    if (followersField && input.followers?.length)
      cells.push(await followersField.createCell(input.followers));
    if (deadlineField && typeof input.deadline === "number")
      cells.push(await deadlineField.createCell(input.deadline));
    rows.push(cells);
  }
  const recordIds = await table.addRecords(rows);
  return recordIds;
}
