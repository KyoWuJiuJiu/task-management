import $ from "jquery";
import "./index.scss";
import flatpickr from "flatpickr";
import { displayPeople } from "./utils/fieldTools";
import { initDatePicker } from "./ui/initDatePicker";
import { bindUIEvents } from "./ui/bindEvents";
// import './locales/i18n'; // 开启国际化，详情请看README.md

// 已移除测试模式与 api-scratch 加载逻辑

$(function () {
  bindUIEvents();
  initDatePicker();
});
