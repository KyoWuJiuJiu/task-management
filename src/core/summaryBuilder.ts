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

  function formatAssignees(rec: any): {
    mentionText: string;
    key: string;
  } {
    const raw = rec?.record?.fields?.[assigneesId];
    if (!Array.isArray(raw)) {
      const fallback = displayPeople(rec, assigneesId);
      return {
        mentionText: fallback,
        key: fallback,
      };
    }
    const mentions: string[] = [];
    const keyParts: string[] = [];
    for (const person of raw) {
      const id = String(person?.id ?? "").trim();
      const name =
        String(person?.name ?? person?.enName ?? person?.en_name ?? "").trim();
      if (id) {
        mentions.push(`@${id}`);
        keyParts.push(id);
      } else if (name) {
        // 无有效 id 时，仅作为文本展示
        mentions.push(`@${name}`);
        keyParts.push(name);
      }
    }
    const mentionText = mentions.join(", ");
    const key = keyParts.join("|") || displayPeople(rec, assigneesId);
    return {
      mentionText: mentionText || displayPeople(rec, assigneesId),
      key,
    };
  }

  function taskKey(rec: any): string {
    const { key } = formatAssignees(rec);
    const project = getFieldText(rec, projectId);
    const taskName = getFieldText(rec, taskNameId);
    const status = getFieldText(rec, statusId);
    return `${key}__${project}__${taskName}__${status}`;
  }

  for (const rec of matched) {
    const { mentionText } = formatAssignees(rec);
    const project = getFieldText(rec, projectId);
    const taskName = getFieldText(rec, taskNameId);
    const status = getFieldText(rec, statusId);
    const key = taskKey(rec);
    if (!uniqueTaskKeys.has(key)) {
      const assigneeSegment =
        mentionText && mentionText.trim().length > 0
          ? mentionText
          : displayPeople(rec, assigneesId);
      lines.push(`${assigneeSegment}, ${project}, ${taskName}, ${status}`);
      uniqueTaskKeys.add(key);
    }
  }

  if (isThisWeek && weekMatched.length > 0) {
    lines.push(`\n本周任务:`);
    for (const rec of weekMatched) {
      const { mentionText } = formatAssignees(rec);
      const project = getFieldText(rec, projectId);
      const taskName = getFieldText(rec, taskNameId);
      const status = getFieldText(rec, statusId);
      const key = taskKey(rec);
      if (!uniqueTaskKeys.has(key)) {
        const assigneeSegment =
          mentionText && mentionText.trim().length > 0
            ? mentionText
            : displayPeople(rec, assigneesId);
        lines.push(`${assigneeSegment}, ${project}, ${taskName}, ${status}`);
        uniqueTaskKeys.add(key);
      }
    }
  }

  return lines.join("\n");
}
