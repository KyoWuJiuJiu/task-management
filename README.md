# 飞书任务汇总前端项目

本项目是一个使用 Feishu 飞书 SDK + Bitable + Flask 后端实现的任务群发工具。

## 📁 项目结构

```
src/
├── core/                  # 核心业务逻辑（如摘要构建、记录过滤）
│   ├── summaryBuilder.ts
│   └── recordFilter.ts
├── config/                # 字段等配置项
│   └── fields.ts
├── ui/                    # UI 初始化与事件逻辑
│   ├── bindEvents.ts
│   └── initDatePicker.ts
├── utils/                 # 工具函数、日期处理、请求、日志
│   ├── date.ts
│   ├── field.ts
│   ├── fieldTools.ts
│   ├── logger.ts
│   └── request.ts
├── index.ts               # 项目入口（仅负责初始化）
```

## 🚀 启动方式

```bash
npm install
npm run dev
```

## 📡 与后端接口（可选）

- 默认禁用：出于上架审核的数据安全要求，前端默认不向外部发送多维表格数据。
- 如确有业务需要，请在 `src/config/config.ts` 设置受信任的 HTTPS 地址（并在飞书后台加入白名单）。
- 示例接口：`POST https://your.domain.com/api/endpoint`
- 请求体（JSON）：
  ```json
  {
    "summaryText": "...",
    "pd": true,
    "ops": false
  }
  ```
⚠️ 若未配置 `BACKEND_URL`，点击“发送”只会提示失败，不会发起网络请求。

## ⚙️ 注意事项

- 需先运行本地 Flask 后端（项目目录：`feishu_flask_bot/`）
- 飞书 API Token 和 Chat ID 请配置于后端 `config.py`

## 📚 依赖技术

- TypeScript
- Feishu JS SDK
- jQuery + Flatpickr
- Flask (Python 后端)

---

## 📦 上架与部署指引（多维表格插件）

1) 本地打包
- `package.json` 中已设置 `"output": "dist"`，规范上传目录
- `vite.config.js` 已设置 `base: './'`，资源引用为相对路径
- `.gitignore` 已允许提交 `dist/`
- 执行 `npm run build`，将生成的 `dist/` 直接上传，无需二次构建

2) 路由规范
- 禁止 history 路由；本项目未引入路由，默认符合要求（无需改动）
- 如后续需要多页，请使用 hash 路由方案

3) 初始化配置（建议）
- 遍历表/字段/记录，根据字段类型与记录量选择“最佳表”；无记录则取首个表
- 若无法自动识别，应给出明确提示，引导用户操作

4) 实时监听（建议）
- 监听 base/table/view/field/record/cell 及选中状态变化，及时刷新界面

5) 性能
- 批量操作优先使用批量接口（如 `addRecords`/`setRecords`/`getRecords`）
- 项目已提供 `addRecords` 以用于批量插入

6) 数据安全
- 前端默认不对外发送数据（`BACKEND_URL` 为空）
- 如启用后端通信，请使用受信任 HTTPS 域名并配置白名单
