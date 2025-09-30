/**
 * 两种 `logMessage` 写法的区别：
 *
 * 1. `function logMessage<T>(summaryText: string)`
 *    - 这里的 `T` 是冗余的，因为 `summaryText` 已经明确指定为 `string` 类型。
 *    - 此写法并未实际使用泛型 `T`，不适合泛型函数的需求。
 *
 * 2. `function logMessage(summaryText: T): string`
 *    - 这里的 `T` 是泛型参数，`summaryText` 的类型会根据传入值推断，可以是任何类型（如 `string`、`number`、`boolean` 等）。
 *    - 返回值类型为 `string`，表示函数最终会返回一个字符串。
 *    - 适用于需要接收多种类型并返回统一类型的场景。
 */
import { TASK_SEND_API } from "../config/config";

export interface SummaryPayload {
  summaryText: string;
  pd: boolean;
  ops: boolean;
}

/**
 * summaryText: string
 * - 表示函数参数 `summaryText` 的类型是 `string`，即该参数必须是一个字符串。
 *
 * summaryText<string>
 * - 这是错误的写法。`<string>` 是泛型语法，通常用于函数、类、接口等定义模板。
 * - 正确的泛型用法是 `function logMessage<T>(summaryText: T)`，其中 `T` 是一个类型参数，表示 `summaryText` 可以是任何类型。
 */
/**
 * `async` 函数的返回值总是一个 `Promise`，即使返回的是普通值。
 * 这意味着在异步操作完成之前，函数返回的是一个 `Promise`，而不是实际的值。
 *
 * 例如：
 * - `return 42;` 会被自动包装为 `Promise.resolve(42)`
 * - 函数调用时会返回一个 `Promise`，你可以使用 `await` 或 `.then()` 来获取最终结果。
 *
 * 异步函数通常用于处理需要等待响应的操作，如网络请求、文件操作等。
 */
export async function sendSummaryToServer(
  payload: SummaryPayload
): Promise<boolean> {
  try {
    // 安全兜底：未配置后端地址时不发送任何数据，直接返回失败
    if (!TASK_SEND_API || TASK_SEND_API.trim() === "") {
      console.warn("TASK_SEND_API 未配置，已阻止外部发送。");
      return false;
    }
    /**
     * JSON 是 JavaScript 的内置对象，用于处理 JSON 数据（JavaScript 对象表示法）。
     * 1. `JSON.stringify()` 方法将 JavaScript 对象转换为 JSON 字符串。
     * 2. `JSON.parse()` 方法将 JSON 字符串转换为 JavaScript 对象。
     *
     * 在这里，`JSON.stringify({ summaryText })` 会将 `summaryText` 转换为 JSON 格式的字符串，
     * 方便传输或存储。
     */
    // 打印发送给后端的完整内容
    console.log("Sending payload to backend:", payload);

    const response = await fetch(TASK_SEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    // 输出状态码和 ok 状态
    console.log(`Response Status: ${response.status}`); // 输出响应的状态码
    return response.ok;
  } catch (err) {
    /**
     * 虽然 response.ok 返回 true 或 false 表示请求是否成功，但它只判断 HTTP 状态码（2xx 成功，4xx/5xx 错误）。
     * 如果请求发生网络错误、超时、服务器无法响应等情况，fetch 函数本身会失败，此时 `catch` 会捕获这些错误。
     * 所以，`catch` 用来处理请求本身失败的场景（如网络错误、请求超时等），避免程序崩溃。
     */
    console.error("发送失败：", err);
    return false;
  }
}

// Promise<boolean> 这个类型的含义是：

// 表示该函数会返回一个 Promise，并且当这个 Promise 完成时，它的返回值是一个 boolean 类型的结果。

// ⸻

// ✅ 详细解释：

// 1. Promise:
// 	•	Promise 是 JavaScript 中用于处理异步操作的一种方式。它表示一个“承诺”，即：一个异步操作在未来会完成，或者失败。
// 	•	Promise 会有三种状态：
// 	•	Pending（进行中）
// 	•	Resolved（已成功）
// 	•	Rejected（已失败）

// 2. boolean:
// 	•	这里的 boolean 表示 Promise 完成后的返回值类型是一个布尔值 true 或 false。

// 3. Promise<boolean> 的应用:
// 	•	当你调用 sendSummaryToServer 函数时，它会返回一个 Promise，并且最终会有一个布尔值返回，表示操作是否成功。
// 	•	如果 fetch 请求成功并返回 2xx 状态码，response.ok 就是 true，表示请求成功。
// 	•	如果发生错误（例如网络错误或服务器错误），catch 会捕获错误并返回 false。
