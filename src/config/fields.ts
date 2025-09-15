/**
 * FIELD_KEYS 包含了多个字段的名称和类型，用于标识和访问多维表格中的各个字段。
 *
 * 访问 FIELD_KEYS 的方式：
 * 1. 通过键名访问：例如 `FIELD_KEYS.assignees.name` 获取 "执行人" 字段的名称
 *    ```ts
 *    const assigneesName = FIELD_KEYS.assignees.name; // "执行人"
 *    const assigneesType = FIELD_KEYS.assignees.type; // 7
 *    ```
 * 2. 遍历字段：
 *    ```ts
 *    for (const key in FIELD_KEYS) {
 *      const field = FIELD_KEYS[key];
 *      console.log(`${key}: ${field.name}, type: ${field.type}`);
 *    }
 *    ```
 * 3. 动态访问：
 *    ```ts
 *    const fieldName = "status"; // 动态指定字段名
 *    const field = FIELD_KEYS[fieldName];
 *    console.log(field.name); // "状态"
 *    console.log(field.type); // 1
 *    ```
 *
 * 为什么将 `FIELD_KEYS` 放在此文件：
 * - `FIELD_KEYS` 用于集中管理和引用多维表格中的字段信息，这些信息在后续的代码中会被多次使用。
 * - 将其放在 `config` 中的好处是：易于维护和修改，任何时候需要调整字段信息时只需修改这一个文件。
 * - `fields.ts` 文件主要是提供关于字段的信息，而 `config` 文件通常用于存放配置和常量，保持模块化。
 */
export const FIELD_KEYS = {
  assignees: { name: "任务执行者", type: 11 },
  followers: { name: "任务关注者", type: 11 },
  project: { name: "项目名称", type: 3 },
  taskName: { name: "任务名称", type: 1 },
  status: { name: "任务完成状态", type: 3 },
  deadline: { name: "任务截止时间", type: 5 },
};

// 没有引号是合法的
// const FIELD_KEYS = {
//   assignees: { name: "执行人", type: 7 },
//   project: { name: "项目", type: 1 },
//   // 其他字段
// };

// 有引号也是合法的
// const FIELD_KEYS = {
//   "assignees": { name: "执行人", type: 7 },
//   "project": { name: "项目", type: 1 },
//   // 其他字段
// };

// const assignees = "assignees";  // 这里的 assignees 是一个变量

// const obj = {
//   [assignees]: { name: "执行人", type: 7 }
// };

// console.log(obj.assignees);  // 输出 { name: "执行人", type: 7 }
