export function logError(context: string, err: unknown) {
  /**
   * `instanceof` 是类型检查的操作符，用来检查对象是否是某个类或构造函数的实例。
   * 在这里，`err instanceof Error` 判断 `err` 是否是 `Error` 类型的实例。
   * - 只有当 `err` 是 `Error` 对象时，才会执行后续代码。
   * `if` 是条件语句，用来判断 `instanceof` 的结果是否为 `true`。
   * - `if` 本身不进行类型检查，而是根据类型检查的结果决定执行哪些代码。
   */
  console.error(`[错误 - ${context}]`, err);
}

/**
 * `alert` 用于向最终用户显示错误提示，弹出对话框会打断用户的操作，强制用户关注错误信息。
 * - 适用于生产环境中需要向用户反馈错误或操作失败时的情况（如表单提交失败、登录错误等）。
 * - 通过 `alert` 可以确保用户看到错误信息并采取相应的措施。
 *
 * `console.log` 和 `console.error` 则主要用于开发调试和日志记录，输出到开发者工具的控制台。
 * - 这些不会影响用户的操作，仅供开发者查看程序运行情况。
 * - 在生产环境中使用 `console.log` / `console.error` 可以记录错误信息而不打扰用户体验。
 */
// 轻量 Toast 实现（无第三方 JS，纯 DOM/CSS）
function ensureToastInfra() {
  const styleId = "__app_toast_style__";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .app-toast-container{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none}
      .app-toast{pointer-events:auto;min-width:240px;max-width:440px;background:#222;color:#fff;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.25);padding:10px 12px;opacity:0;transform:translateY(6px);transition:opacity .2s ease,transform .2s ease;white-space:pre-wrap;word-break:break-word;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
      .app-toast.show{opacity:1;transform:translateY(0)}
      .app-toast.info{background:#1e88e5}
      .app-toast.success{background:#2e7d32}
      .app-toast.warning{background:#f9a825;color:#111}
      .app-toast.danger{background:#d32f2f}
    `;
    document.head.appendChild(style);
  }
  let cont = document.querySelector<HTMLDivElement>(".app-toast-container");
  if (!cont) {
    cont = document.createElement("div");
    cont.className = "app-toast-container";
    document.body.appendChild(cont);
  }
  return cont;
}

export type ToastVariant = "info" | "success" | "warning" | "danger";

export function showToast(message: string, variant: ToastVariant = "info", ms = 2800) {
  try {
    const container = ensureToastInfra();
    const el = document.createElement("div");
    el.className = `app-toast ${variant}`;
    el.textContent = String(message ?? "");
    container.appendChild(el);
    // 强制回流以触发过渡
    void el.offsetHeight;
    el.classList.add("show");
    const timer = window.setTimeout(() => {
      el.classList.remove("show");
      window.setTimeout(() => {
        el.remove();
      }, 220);
    }, Math.max(1200, ms));
    // 点击立即关闭
    el.addEventListener("click", () => {
      window.clearTimeout(timer);
      el.classList.remove("show");
      window.setTimeout(() => el.remove(), 150);
    });
  } catch (e) {
    // 兜底：若 DOM 不可用则回退到 console
    console.log("[Toast]", message);
  }
}

export function showUserError(message: string) {
  showToast(message, "danger");
}
