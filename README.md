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

## 📡 与后端接口

- 接口地址：`POST http://localhost:8000/api/endpoint`
- 请求体（JSON）：
  ```json
  {
    "summaryText": "xxx"
  }
  ```

⚠️ 注意：端口号必须与后端 Flask 启动时设置的端口保持一致（当前为 8000）。如果后端端口修改，这里的接口地址也需要同步修改。

## ⚙️ 注意事项

- 需先运行本地 Flask 后端（项目目录：`feishu_flask_bot/`）
- 飞书 API Token 和 Chat ID 请配置于后端 `config.py`

## 📚 依赖技术

- TypeScript
- Feishu JS SDK
- jQuery + Flatpickr
- Flask (Python 后端)
