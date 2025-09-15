/**
 * `flatpickr` 是一个函数，它用来初始化日期选择器并返回一个实例对象。
 * 通过调用 `flatpickr(selector, options)`，可以将日期选择器绑定到指定的 DOM 元素，并配置日期选择器的行为。
 * 在初始化后，可以通过返回的实例对象访问和操作日期选择器的属性和方法。
 */
import flatpickr from "flatpickr";
/**
 * 这行代码使用 TypeScript 的 `import type` 语法从 `flatpickr` 的类型定义文件中导入 `Instance` 类型。
 * `Instance` 类型代表 `flatpickr` 日期选择器的实例，它包含了所有与 `flatpickr` 交互的方法和属性。
 * 使用 `as FlatpickrInstance` 将 `Instance` 重命名为 `FlatpickrInstance`，以便更清晰地表示该类型。
 * 这样可以在代码中为 `flatpickr` 实例提供类型提示，确保 `instance` 变量具备正确的类型和方法提示。
 */
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";

/**
 * 初始化日期选择器，并为其添加“今天”，“昨天”，“明天”快速选择按钮。
 *
 * 1. 该函数使用 flatpickr 库来初始化日期选择器，默认选择器是 "#dateSelect"。
 * 2. `dateFormat` 设置日期格式为 "Y/m/d"（年/月/日）。
 * 3. `allowInput` 允许用户直接输入日期。
 * 4. `onReady` 回调函数在日期选择器准备就绪后执行。
 *    - 在回调中，我们动态创建了三个按钮：“今天”，“昨天”，“明天”。
 *    - 每个按钮点击后，会根据点击的按钮设置日期并关闭日期选择器。
 * 5. 这些按钮被插入到日期选择器的容器中，为用户提供快捷的日期选择方式。
 */

// 1.	selector：这是传入函数 initDatePicker 的一个参数。它表示日期选择器（flatpickr）应该绑定到哪个 HTML 元素的 选择器字符串。
// 2.	string：表示 selector 必须是一个字符串类型。
// 3.	= "#dateSelect"：这部分表示 默认值，即如果调用 initDatePicker 时没有传入具体的 selector，它会自动使用 "#dateSelect" 作为默认值。
export function initDatePicker(selector: string = "#dateSelect") {
  // console.log("Initializing date picker for:", selector);
  /**
   * 配置对象（Configuration Object）通常用于初始化某个功能或模块，包含一组预定义的属性，用来控制函数、类或模块的行为。
   * 在这里，flatpickr 的配置对象包含了日期格式、回调函数等，用来配置日期选择器的行为。
   *
   * 与普通对象不同，配置对象通常结构化并且与特定功能的选项或设置相关。
   * 普通对象则是常规的 JavaScript 对象，通常用于存储数据或方法，不一定用于配置某个功能。
   *
   * 例如，flatpickr 配置对象：
   * {
   *   dateFormat: "Y/m/d",
   *   allowInput: true,
   *   onReady: [function]  // 初始化后的回调
   * }
   */
  flatpickr(selector, {
    dateFormat: "Y/m/d",
    allowInput: true,
    /**
     * `onReady` 回调函数会在日期选择器初始化完成后自动执行，允许执行自定义的操作。
     * 在当前的回调函数中：
     * - `selectedDates` 表示用户选择的日期数组。
     * - `dateStr` 表示日期的字符串表示。
     * - `instance` 是 `flatpickr` 返回的实例对象，代表已初始化的日期选择器。
     *
     * 在该回调函数内，我们使用 `instance` 来动态创建和插入自定义按钮：“今天”，“昨天”，“明天”。
     * `calendarContainer` 是 `instance` 的属性，表示日期选择器的 `div` 元素，包含日期选择器的整个界面。
     *
     * **回调函数的概念：**
     * - 回调函数是作为参数传递给另一个函数的函数，它会在特定时机被调用。
     * - 在 `flatpickr` 中，`onReady` 就是一个回调函数，它会在日期选择器初始化完成后自动触发。
     * - 你无需手动调用回调函数，它会根据 `flatpickr` 的初始化过程自动执行。
     */
    onReady: [
      function (
        selectedDates: Date[],
        dateStr: string,
        instance: FlatpickrInstance
      ) {
        /**
         * `instance` 是 `flatpickr` 函数返回的实例对象，它代表了已经初始化的日期选择器。
         * 它是一个对象，包含了与日期选择器交互的所有方法和属性。
         *
         * `instance` 提供了操作日期选择器的功能，如设置日期（setDate）、打开日期选择器（open）和关闭日期选择器（close）。
         * 通过 `instance`，我们可以访问日期选择器的界面元素，如 `calendarContainer`。
         *
         * `selectedDates` 和 `dateStr` 是 flatpickr 提供的参数，分别表示用户选择的日期数组和日期的字符串表示。
         * 但在当前的回调函数中，这两个参数并没有被使用。
         * - `selectedDates` 是一个 `Date[]` 数组，包含用户选择的所有日期。
         * - `dateStr` 是一个字符串，表示日期的字符串格式（与 `dateFormat` 配置相关）。
         * 如果不需要使用这两个参数，可以将它们移除，或者根据需求将它们用于其他地方（如显示选中的日期）。
         */
        const container = instance.calendarContainer; //calendarContainer是instance的属性, 他代表了一个div对象
        if (!container) return;
        const bar = document.createElement("div");
        /*
         * 虽然 `initDatePicker.ts` 中没有直接导入 `index.scss`，但样式是通过 `index.ts` 间接引入的。
         * 在 `index.ts` 中，`import "./index.scss";` 导入了样式文件，并且这些样式会在整个项目中生效。
         * 由于样式是全局应用的，`initDatePicker.ts` 中的元素（如日期选择器）会自动应用 `index.scss` 中定义的样式。
         * 这使得 `initDatePicker.ts` 中的日期选择器组件能够使用 `index.scss` 中的样式（例如 `d-flex`, `gap-2`, `p-2` 等）。
         */
        bar.className = "flatpickr-quick d-flex gap-2 p-2 ms-5";

        function makeBtn(label: string, offset: number): HTMLButtonElement {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn-sm btn-outline-secondary";
          btn.textContent = label;
          btn.addEventListener("click", () => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            instance.setDate(d, true);
            instance.close();
          });
          return btn;
        }

        bar.append(makeBtn("今天", 0), makeBtn("昨天", -1), makeBtn("明天", 1));
        container.insertBefore(bar, container.firstChild);
      },
    ],
  });
}

//  `onReady` 回调函数和 `initDatePicker` 函数都没有返回值，原因如下：
//  1. 回调函数（onReady）**：该回调函数的目的是在日期选择器初始化完成后执行自定义操作（如动态创建和插入按钮），不需要返回任何内容。
//  2. `initDatePicker`**：这个函数的作用是初始化 `flatpickr` 日期选择器并进行配置，执行副作用操作（如绑定事件和设置选项），而不是返回一个值。
//  这种设计符合初始化和配置函数的常见模式，通常通过副作用（例如修改 DOM、注册事件）来影响程序的状态，而不需要返回任何值。

// 回调函数和 `initDatePicker` 函数都没有返回值，原因如下：
// 1. **回调函数（onReady）**：该回调函数的目的是在日期选择器初始化完成后执行自定义操作，不需要返回任何内容。
// 2. **`initDatePicker`**：这个函数的作用是初始化 `flatpickr` 日期选择器并进行配置，执行副作用操作，通常不返回值。
// 这种设计符合初始化和配置函数的常见模式，通常通过副作用（例如修改 DOM、注册事件）来影响程序的状态，而不需要返回任何值。
