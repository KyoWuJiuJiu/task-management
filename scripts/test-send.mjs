#!/usr/bin/env node

/**
 * 简单的命令行测试脚本，用于向后端发送任务摘要请求。
 * 使用方式：
 *   node scripts/test-send.mjs                # 使用默认 URL
 *   node scripts/test-send.mjs https://...    # 指定自定义接口地址
 *
 * 如遇自签名证书，可在命令前添加：
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/test-send.mjs
 */

const DEFAULT_ENDPOINT = "https://192.168.0.96:9876/api/endpoint";

// 默认示例文本：请将 @ou_xxx 替换成实际可 @ 的 open_id
const DEFAULT_SUMMARY_TEXT = [
  "今日任务:",
  "@ou_0eacfffe67498617b56c6c3f529e9262, XX项目, 需求梳理, 进行中",
  "@ou_yyy, XX项目, 开发排期, 待跟进",
  "",
  "本周任务:",
  "@ou_zzz, XX项目, 测试覆盖, 未开始",
].join("\n");

async function main() {
  // 支持通过命令行参数覆盖接口地址
  const endpoint = process.argv[2] ?? DEFAULT_ENDPOINT;

  // 构造测试 payload，可根据需要调整字段
  const payload = {
    summaryText: DEFAULT_SUMMARY_TEXT,
    pd: true,
    ops: false,
  };

  console.log(`向 ${endpoint} 发送测试请求...`);
  console.log("请求体:", payload);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload, null, 2),
  });

  console.log("HTTP 状态:", response.status, response.statusText);

  console.log("响应头:", Object.fromEntries(response.headers.entries()));

  const bodyText = await response.text();
  console.log("响应体:", bodyText);
}

main().catch((error) => {
  console.error("请求失败:", error);
  process.exit(1);
});
