/**
 * 生成适配 Mac Word 的 Avery 5160（3x10）标签 HTML（表格布局）。
 * - 强制页面为 Letter，边距 0.5" / 0.1875"。
 * - 使用 <table> 固定列宽/行高（pt 单位 + MSO 属性）。
 * - 字体：'凌慧体-简' 8pt 粗体，在 td/p/span 三层加固。
 */
export function buildAvery5160WordHtml(labels: string[]): string {
  // 填充到 30 个单元
  const arr = new Array(30).fill("");
  for (let i = 0; i < Math.min(labels.length, 30); i++)
    arr[i] = String(labels[i] || "");

  const esc = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const tableStyle = [
    "border-collapse:collapse",
    "table-layout:fixed",
    "mso-table-layout-alt:fixed",
    "mso-table-lspace:0pt",
    "mso-table-rspace:0pt",
    "mso-cellspacing:0in",
    "mso-padding-alt:0in 0in 0in 0in",
    "width:585pt",
    "margin:0",
    "padding:0",
  ].join(";");

  const tdLabelStyle = [
    "height:72pt",
    "vertical-align:top",
    "width:189pt",
    "padding-left:8.6pt", // ~0.12in，左移约 2mm
    "padding-top:1pt",
    "padding-right:9pt",
    "padding-bottom:0pt",
    "font-family:'凌慧体-简','Microsoft YaHei',Arial,Helvetica,sans-serif",
    "mso-fareast-font-family:'凌慧体-简'",
    "font-size:8pt",
    "font-weight:700",
    "line-height:.1",
    "white-space:pre-wrap",
    "word-break:break-word",
    "overflow:hidden",
    "border:0",
  ].join(";");

  const tdSpacerStyle = [
    "height:72pt",
    "width:9pt",
    "border:0",
    "padding:0",
  ].join(";");

  const colDefs = `
    <col style="width:189pt" />
    <col style="width:9pt" />
    <col style="width:189pt" />
    <col style="width:9pt" />
    <col style="width:189pt" />
  `;

  const renderCell = (text: string) => {
    const t = String(text || "").trim();
    if (!t) return "&nbsp;";
    const run = [
      "font-family:'凌慧体-简','Microsoft YaHei',Arial,Helvetica,sans-serif",
      "mso-fareast-font-family:'凌慧体-简'",
      "mso-ascii-font-family:'凌慧体-简'",
      "mso-hansi-font-family:'凌慧体-简'",
      "mso-bidi-font-family:'凌慧体-简'",
      "font-size:8pt",
      "font-weight:700",
    ].join(";");
    const lines = t.split(/\n+/);
    const parts: string[] = [];
    lines.forEach((line, idx) => {
      if (idx === 0) {
        // 日期行：居中，略小字号以整体更紧凑
        parts.push(
          `<p style="margin:0;text-align:center"><span lang="zh-CN" style="${run};font-size:8.6pt">${esc(
            line
          )}</span></p>`
        );
      } else {
        // 任务行：缩小字号 + 紧凑行距
        parts.push(
          `<p style="margin:0;line-height:1.1"><span lang="zh-CN" style="${run};font-size:7.6pt">${esc(
            line
          )}</span></p>`
        );
      }
    });
    return parts.join("");
  };

  const rows: string[] = [];
  for (let r = 0; r < 10; r++) {
    const i0 = r * 3;
    const c1 = renderCell(arr[i0]);
    const c2 = renderCell(arr[i0 + 1]);
    const c3 = renderCell(arr[i0 + 2]);
    rows.push(
      `<tr style="height:72pt;mso-height-source:exactly;mso-height-rule:exactly">` +
        `<td style="${tdLabelStyle}">${c1}</td>` +
        `<td style="${tdSpacerStyle}"><span style="font-size:0;line-height:0">&nbsp;</span></td>` +
        `<td style="${tdLabelStyle}">${c2}</td>` +
        `<td style="${tdSpacerStyle}"><span style="font-size:0;line-height:0">&nbsp;</span></td>` +
        `<td style="${tdLabelStyle}">${c3}</td>` +
        `</tr>`
    );
  }

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta http-equiv="Content-Language" content="zh-cn" />
      <title>Avery 5160 Labels (Word)</title>
      <style>
        @page Section1 {
          size:8.5in 11.0in;
          margin:0.5in 0.1875in 0.5in 0.1875in;
          mso-header-margin:0in;
          mso-footer-margin:0in;
          mso-paper-source:0;
        }
        div.Section1 { page:Section1; }
        html, body { margin: 0; padding: 0; }
        table.avery td, table.avery td p { margin: 0; }
        table.avery td p { line-height: 1; }
        table.avery td, table.avery td p {
          font-family: '凌慧体-简','Microsoft YaHei',Arial,Helvetica,sans-serif;
          mso-fareast-font-family: '凌慧体-简';
          mso-ascii-font-family: '凌慧体-简';
          mso-hansi-font-family: '凌慧体-简';
          mso-bidi-font-family: '凌慧体-简';
          font-size: 8pt;
          font-weight: 700;
        }
      </style>
    </head>
    <body lang="zh-CN">
      <div class="Section1">
        <table class="avery" style="${tableStyle}" cellspacing="0" cellpadding="0">
          <colgroup>${colDefs}</colgroup>
          ${rows.join("")}
        </table>
      </div>
    </body>
  </html>`;
}
