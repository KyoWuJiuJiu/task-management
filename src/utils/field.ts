/**
 * @file field.ts
 *
 * 本文件定义了字段相关的工具函数。
 *
 * ✅ `getFieldIdByName` 是一个用于从字段元数据中查找字段 ID 的函数。
 *
 * 我们之前讨论过：
 * - 参数 `fieldMetas` 的类型虽然是 `any[]`，但它至少明确告诉我们这是一个数组，这比完全不写类型更好。
 * - 然而，为了更强的类型安全和更好的开发体验，推荐写成结构化的类型，比如：
 *     ```ts
 *     type FieldMeta = { id: string; name: string; type: number };
 *     ```
 * - TypeScript 的 `strict` 模式已启用，它会要求参数类型显式声明，防止隐式 any 的使用。
 * - 显式声明为 `any[]` 虽然合法，也能通过 strict 检查，但本质上等于放弃了类型检查，不推荐大量使用。
 * - 我们后续建议将 `fieldMetas` 的类型从 `any[]` 优化为结构化的 `FieldMeta[]`。
 */
/**
 * @returns 字符串或 undefined；因为可能找不到匹配字段
 * 注意：此处返回的是基本类型（string | undefined），
 * 所以不能使用 interface 来定义返回结构。
 * 如果需要给它命名，应该使用 type，例如：
 * type FieldId = string | undefined;
 */
export function getFieldIdByName(
  fieldMetas: any[],
  name: string,
  expectType?: number
): string | undefined {
  // 查找第一个字段，其名称匹配参数 name，且类型（type）匹配 expectType（如果提供的话）。
  // 具体逻辑如下：
  // - x?.name === name：使用可选链安全访问字段名称，避免空对象报错
  // - expectType == null：允许不传入 expectType，此时跳过类型校验
  // - x?.type === expectType：当 expectType 被指定时，要求字段类型一致
  // ⚠️ 注意：整个表达式的判断顺序非常关键，确保在数据缺失时不会抛出异常。
  // 使用可选链操作符（?.）安全地访问属性：
  // 如果 x 为 null 或 undefined，x?.name 会返回 undefined 而不会抛错。这样可以避免在数据不完整或未初始化时出现运行时错误。
  // 如果有expectType的传入, 那么name和expectType都要符合, 如果没有expectType的传入, 那么只要name符合条件就可以.
  //	•	使用 Array.prototype.find() 方法，在 fieldMetas 数组中寻找第一个符合条件的元素。
  //  •	如果找到了这个元素（即某个 x 符合条件），就把这个 x 赋值给变量 f
  //  •	如果没有找到任何符合条件的元素，那么 find() 返回的是 undefined，也就是说：
  let f = fieldMetas.find(
    (x) => x?.name === name && (expectType == null || x?.type === expectType)
  );
  //   !f：
  // 	•	表示 f 是 falsy 值（也就是 undefined, null, false 等）
  // 	•	在当前上下文中，它表示：
  // ✅ 「前面 find() 查找没有找到匹配的字段」

  // ⸻

  // expectType != null：
  // 	•	判断 expectType 是否有传入
  // 	•	注意这里使用的是 非严格等于 null：
  // 	•	它会同时判断 null 和 undefined
  // 	•	所以如果 expectType 被传入（不为 null/undefined），结果为 true

  // 当 name 查找失败（即 f === undefined），并且传入了 expectType，就通过 类型 再查一次。
  // ✅ 表示如果通过字段名称没有找到匹配项（f 是 undefined），但传入了字段类型 expectType：
  //    - 比如 expectType === 5，表示查找“日期类型”字段
  //    - 就从字段元数据中查找：字段类型是 5，且字段名包含关键词“截止”或“日期”的字段
  //    - 使用 includes 判断字符串是否包含关键词
  //    - 关键词匹配使用 ||，只要名称中包含其中一个即可
  //    - 这是一个兜底策略：当字段命名不标准但关键词明显时，仍然尝试识别出目标字段
  // 这里的 ‘String(x?.name || "")’表示至少返回一个空字符串来兜底, 避免后面的includes报错.
  if (!f && expectType != null) {
    if (expectType === 5) {
      f = fieldMetas.find(
        (x) =>
          x?.type === 5 &&
          (String(x?.name || "").includes("截止") ||
            String(x?.name || "").includes("日期"))
      );
    }
  }
  // 显式 return：如果找到字段并包含 id，就返回 f.id，否则返回 undefined
  if (f && f.id) {
    return f.id;
  } else {
    return undefined;
  }
}

/**
 * ------------------------------------------
 * 💡 TypeScript 中 type 和 interface 的区别
 * ------------------------------------------
 *
 * ✅ interface：
 * - 用于描述“对象结构”最为合适
 * - 只能用于 `{}` 包裹的对象类型
 * - 支持继承（extends）、声明合并
 * - 适合函数参数、类、组件 props、API 对象等结构定义
 *
 * ✅ type：
 * - 用于定义任意类型（不仅限于对象）
 * - 可以定义基本类型别名，如 `type ID = string`
 * - 可以表示联合类型、交叉类型，例如 `string | number`
 * - 更适合描述复杂类型组合、联合、工具类型等
 *
 * 📌 总结选择建议：
 * - 如果是纯对象结构，优先用 interface（如 FieldMeta）
 * - 如果是字符串、联合类型、或非对象结构，用 type（如 string | undefined）
 */
