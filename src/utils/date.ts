// @param 是 jsdoc 的标准注释写法，d 是函数的一个参数，类型是 Date，用于格式化日期
// @returns 也是 jsdoc 的标准写法，表示函数的返回值说明
/**
 * 将 Date 对象格式化为字符串，格式为 "YYYY/MM/DD"
 * @param d 要格式化的日期对象
 * @returns 格式化后的日期字符串
 */
export function fmtYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0"); // padStart JavaScript 字符串的内置方法，用于在字符串前补齐到指定长度，这里将不足两位的月份补0
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/**
 * 将 "YYYY/MM/DD" 格式的字符串解析为 Date 对象
 * @param str 格式为 "YYYY/MM/DD" 的日期字符串
 * @returns 转换后的日期对象
 */
export function parseYmd(str: string): Date {
  const [y, m, d] = str.split("/").map((s) => parseInt(s, 10));
  // 将日期字符串按 "/" 拆分为 [年, 月, 日]，再用 map 和 parseInt 将每个部分转为整数
  // 使用的是数组解构赋值语法：const [y, m, d] = ...
  // 其中 split() 是字符串的内置方法，用于按分隔符拆分成数组
  // map() 是数组的内置方法，用于对数组每一项进行转换，返回新数组
  // parseInt 的第二个参数 10 表示按十进制解析，避免八进制或其他误解析
  // parseInt(string, radix) 是 JavaScript 的内置函数，用于将字符串解析为整数；传入 radix = 10 是最佳实践，确保以十进制处理。
  // 其中 string 是表示数字的字符串，radix 表示使用的进制（如 10 表示十进制，2 表示二进制，16 表示十六进制）。
  return new Date(y, m - 1, d); //这里m-1是因为 Date函数的月份参数是从0开始的, 既0代表1月份.
}

/**
 * 计算两个日期之间的相差天数（不包含时间部分，仅按日历天数）
 * @param a 日期 A
 * @param b 日期 B
 * @returns 相差的天数（a - b）
 */
export function dayDiff(a: Date, b: Date): number {
  // 重新构造日期对象，仅保留年月日，清除原始时间（时、分、秒）部分
  // 这样可以确保只比较日期差异，不受时间影响
  const datea = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dateb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((datea.getTime() - dateb.getTime()) / 86400000);
  // getTime() 返回日期的时间戳（从 1970 年以来的毫秒数），用于计算两个日期的毫秒差
  // 除以 86400000 是将毫秒差转换为天数（因为 1 天 = 86,400,000 毫秒）
}

export function displayHeadLabelString(date: string): string {
  function isToday(date: string): boolean {
    const today = new Date();
    const dateDate = parseYmd(date);
    return (
      today.getFullYear() === dateDate.getFullYear() &&
      today.getMonth() === dateDate.getMonth() &&
      today.getDate() === dateDate.getDate()
    );
  }
  function isTomorrow(date: string): boolean {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const dateDate = parseYmd(date);
    return (
      today.getFullYear() === dateDate.getFullYear() &&
      today.getMonth() === dateDate.getMonth() &&
      today.getDate() === dateDate.getDate()
    );
  }
  function isYesterday(date: string): boolean {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const dateDate = parseYmd(date);
    return (
      today.getFullYear() === dateDate.getFullYear() &&
      today.getMonth() === dateDate.getMonth() &&
      today.getDate() === dateDate.getDate()
    );
  }

  if (isToday(date)) {
    return "今日";
  } else if (isTomorrow(date)) {
    return "明日";
  } else if (isYesterday(date)) {
    return "昨日";
  } else {
    return date;
  }
}
