/**
 * 将人员数组转换为字符串（适配多维表格人员字段结构）
 *
 * @param value 人员数组，每个元素包含 name, en_name, id 字段
 * @returns 返回中文名称拼接字符串
 */

//定义Person类型, 这个是从多维表格中的记录拿出来的包含一个元素的数组, 这个元素就是个Person的这个对象. 他的获得来自于record.fields.[field_id];
type Person = {
  id: string;
  name: string;
  en_name: string;
  enName?: string;
};

export function displayPeople(rec: any, assigneesId: string): string {
  const value = rec.record?.fields?.[assigneesId];

  // 确保 value 是一个有效的数组
  if (Array.isArray(value)) {
    return value.map((p) => p.id || p.name || p.enName).join(",");
  }

  // 如果不是数组，返回空字符串或者其他默认值
  return "";
} //这里的‘p.name || p.en_name || p.id’, 表示先取name, 如果name不行, 那么就取en_name, 如果还不行, 那么就取id. 先到先得. 得到后马上返回.

/**
 * 提取字段的文本值，如果字段是数组，则将所有元素的文本值合并并返回。
 * 否则返回字段的文本值，若字段为空则返回空字符串。
 */
export function getFieldText(rec: any, id: string): string {
  const field = rec.record?.fields?.[id]; // 获取指定 ID 的字段
  return (
    field?.text ||
    (Array.isArray(field)
      ? field.map((v: any) => v.text).join("、")
      : String(field ?? "")) //	field ?? “” 会返回 field(如果 field 不为 null 或 undefined。)•	如果 field 是 null 或 undefined，它将返回 “”
  );
}
