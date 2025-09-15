import $ from "jquery";
import "./index.scss";
import flatpickr from "flatpickr";
import { displayPeople } from "./utils/fieldTools";
import { showToast } from "./utils/logger";
import { initDatePicker } from "./ui/initDatePicker";
import { bindUIEvents } from "./ui/bindEvents";
// import './locales/i18n'; // 开启国际化，详情请看README.md

(async () => {
  try {
    const params = new URLSearchParams(location.search);
    const isTest =
      params.has("test") ||
      params.get("mode") === "test" ||
      params.get("t") === "1";
    console.log(
      "[boot] location.search =",
      location.search,
      "isTest =",
      isTest
    );
    if (isTest) {
      showToast(
        "Test mode ON: 将运行 api-scratch.ts\n打开控制台(Console)查看详细日志",
        "info",
        3500
      );
      const mod = await import("./api-scratch");
      if (mod && typeof (mod as any).runApiSmoke === "function") {
        await (mod as any).runApiSmoke();
      } else {
        console.warn(
          "api-scratch 加载成功，但未导出 runApiSmoke() 方法。导出示例: export async function runApiSmoke() { ... }"
        );
        showToast("已加载 api-scratch, 但未找到 runApiSmoke() 导出", "warning");
      }
    }
  } catch (e) {
    console.error("Test mode 启动失败:", e);
    showToast(
      "Test mode 启动失败，请检查 api-scratch.ts 是否存在且导出 runApiSmoke()",
      "danger",
      4000
    );
  }
})();

$(function () {
  bindUIEvents();
  initDatePicker();
});
