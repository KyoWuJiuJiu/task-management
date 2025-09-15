// Imported: displayPeople, getFieldText
import { displayPeople, getFieldText } from "../utils/fieldTools";
import { displayHeadLabelString } from "../utils/date";

export function buildTaskSummary(
  matched: any[],
  weekMatched: any[],
  options: {
    assigneesId: string;
    projectId: string;
    taskNameId: string;
    statusId: string;
    pickedDateStr: string;
    isThisWeek: boolean;
  }
): string {
  const {
    assigneesId,
    projectId,
    taskNameId,
    statusId,
    pickedDateStr,
    isThisWeek,
  } = options; //解构赋值的方法,意思就是从option(option是这个函数传入的参数)里面提取里面的元素

  const headerLabel = `${displayHeadLabelString(pickedDateStr)}`;

  const lines: string[] = []; //这行代码的意思是声明了一个名为 lines 的变量，并将其类型指定为 string[]，即一个字符串数组。
  lines.push(`${headerLabel}任务:`); //push() 会把指定的元素添加到 数组的末尾，并返回新数组的长度。

  const uniqueTaskKeys = new Set<string>(); //表示创建一个 字符串类型的 Set 集合，其中只能存储 字符串 类型的元素。唯一建立空的集合的方法

  function taskKey(rec: any): string {
    const assignees = displayPeople(rec, assigneesId);
    const project = getFieldText(rec, projectId);
    const taskName = getFieldText(rec, taskNameId);
    const status = getFieldText(rec, statusId);
    return `${assignees}__${project}__${taskName}__${status}`;
  }

  for (const rec of matched) {
    const f = (id: string) => rec.record?.fields?.[id];
    const assignees = displayPeople(rec, assigneesId);
    const project = getFieldText(rec, projectId);
    const taskName = getFieldText(rec, taskNameId);
    const status = getFieldText(rec, statusId);
    const key = taskKey(rec);
    if (!uniqueTaskKeys.has(key)) {
      lines.push(`${assignees}, ${project}, ${taskName}, ${status}`);
      uniqueTaskKeys.add(key);
    }
  }

  if (isThisWeek && weekMatched.length > 0) {
    lines.push(`\n本周任务:`);
    for (const rec of weekMatched) {
      const f = (id: string) => rec.record?.fields?.[id];
      const assignees = displayPeople(rec, assigneesId);
      const project = getFieldText(rec, projectId);
      const taskName = getFieldText(rec, taskNameId);
      const status = getFieldText(rec, statusId);
      const key = taskKey(rec);
      if (!uniqueTaskKeys.has(key)) {
        lines.push(`${assignees}, ${project}, ${taskName}, ${status}`);
        uniqueTaskKeys.add(key);
      }
    }
  }

  return lines.join("\n");
}
