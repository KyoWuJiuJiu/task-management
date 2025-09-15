import { fmtYmd } from "../utils/date";
import { showUserError } from "../utils/logger";

/**
 * 任务筛选函数(“filterTasksByDate”)的返回结构定义
 *
 * TypeScript 与 Python 不同，需要显式定义返回结构以获得类型提示与错误检查。
 * 使用接口可以让编辑器更智能地提示字段名，提升开发体验与可维护性。
 */
export interface TaskFilterResult {
  matched: any[];
  weekMatched: any[];
}

/**
 * 从记录中筛选出匹配指定日期或日期范围的任务记录
 *
 * @param records 要筛选的任务数据列表
 * @param deadlineFieldId 用于从每条记录中提取截止日期的字段 ID
 * @param pickedDateStr 当前选中的日期字符串，格式为 "YYYY/MM/DD"
 * @param weekRange （可选）一个包含 start 和 end 的对象，表示本周起止日期范围，格式同样为 "YYYY/MM/DD"
 *                   参数名后的 ? 表示该参数是可选的，调用函数时可以省略此参数
 */
export function filterTasksByDate(
  records: Iterable<any>,
  deadlineFieldId: string,
  assigneesId: string,
  taskNameId: string,
  statusFieldId: string | undefined,
  pickedDateStr: string,
  weekRange?: { start: string; end: string },
  enforceAssignee: boolean = true,
  includeCompleted: boolean = false
): TaskFilterResult {
  const matched: any[] = [];
  const weekMatched: any[] = [];

  function checkNonEmpty(fieldVal: any, label: string) {
    if (!fieldVal) {
      showUserError(`${label} 不能为空, 请补充数据后再试!`);
      throw new Error(`${label} 不能为空`);
    }
  }

  for (const rec of records) {
    // console.log(rec.record.fields);

    const rawVal = rec?.record?.fields?.[deadlineFieldId];
    // 如果该记录没有对应的日期字段（为 null 或 undefined），跳过该条记录
    // 使用 continue 是为了跳过当前循环，直接进入下一条记录
    if (rawVal == null) continue;

    let valStr: string;
    if (typeof rawVal === "number") {
      valStr = fmtYmd(new Date(rawVal)); //这里的rawVal是多维表格日期里面填写的毫秒的数字(既时间戳)
    } else if (rawVal instanceof Date) {
      valStr = fmtYmd(rawVal);
    } else {
      // 兜底处理：将日期字符串标准化为 "YYYY/MM/DD" 格式
      // 实际上飞书的日期字段通常返回的是毫秒级时间戳（number），上方判断已处理
      // 这里是为了兼容极端情况（如自定义字段或测试时传入字符串）
      // 1. String(rawVal): 将值强制转为字符串
      // 2. trim(): 移除首尾空格
      // 3. split(" ")[0]: 去掉时间部分，只保留日期
      // 4. replace(/[-.]/g, "/"): 将 - 或 . 替换为 /
      valStr = String(rawVal).trim().split(" ")[0].replace(/[-.]/g, "/"); //不是的，[] 在正则表达式中 不是表示“或”，但它的行为看起来有点像“多选之一”，// /g就是相当于Excel当中的, “全部替换”对不对?
    }

    // 若提供了状态字段且（未勾选“已完成”开关）并且状态为“已完成”，则跳过
    if (statusFieldId && !includeCompleted) {
      const statusVal = rec?.record?.fields?.[statusFieldId];
      const isCompleted = Array.isArray(statusVal)
        ? statusVal.some((v: any) => String(v?.text ?? "").trim() === "已完成")
        : String(statusVal?.text ?? statusVal ?? "").trim() === "已完成";
      if (isCompleted) continue;
    }

    if (valStr === pickedDateStr) {
      const assignees = rec?.record?.fields?.[assigneesId];
      const taskName = rec?.record?.fields?.[taskNameId];
      if (enforceAssignee) {
        checkNonEmpty(assignees, "任务执行者");
      }
      checkNonEmpty(taskName, "任务名称");

      matched.push(rec);
    } // push向数组末尾添一个元素
    // 如果传入了 weekRange（包含一周的起始日期），则检查当前记录日期是否在范围内
    // valStr、start、end 都是 "YYYY/MM/DD" 格式的字符串
    // 这种格式在按字符串比较时是安全的：因为年份在前 → 月份 → 日期，符合字典序
    // 所以可以直接使用 >= 和 <= 进行比较，判断日期是否在区间内
    // 如果符合，则将该记录添加到 weekMatched 数组中
    // 这里比较的前提是传入了weekRange也就是WeekRange不为空
    if (weekRange && valStr >= weekRange.start && valStr <= weekRange.end) {
      const assignees = rec?.record?.fields?.[assigneesId];
      const taskName = rec?.record?.fields?.[taskNameId];
      if (enforceAssignee) {
        checkNonEmpty(assignees, "任务执行者");
      }
      checkNonEmpty(taskName, "任务名称");
      if (!matched.includes(rec)) {
        weekMatched.push(rec);
      }
    }
  }

  return { matched, weekMatched };
}
