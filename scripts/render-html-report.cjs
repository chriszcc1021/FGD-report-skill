#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

let marked;
try {
  marked = require("marked").marked;
} catch (error) {
  console.error("Missing dependency: marked. Install it or run in the Codex workspace runtime where marked is bundled.");
  process.exit(1);
}

const inputPath = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(inputPath)) {
  console.error("Usage: node scripts/render-html-report.cjs <report.md> [output.html]");
  process.exit(1);
}

const outputPath = path.resolve(process.argv[3] || inputPath.replace(/\.md$/i, ".html"));
const source = fs.readFileSync(inputPath, "utf8");
const title = source.match(/^#\s+(.+)$/m)?.[1]?.trim() || "FGD 研究报告";
const bodyMarkdown = source.replace(/^#\s+.+\r?\n+/, "");

marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text) {
  const known = {
    "1. 项目背景": "background",
    "2. 核心结论": "conclusion",
    "3. 新玩家与老玩家对比": "comparison",
    "3. 玩家分层对比": "comparison",
    "4. 具体反馈建议": "recommendations",
    "Appendix：打分数据汇总": "appendix",
    "Appendix: 打分数据汇总": "appendix",
  };
  return known[text] || text
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, "")
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitReport(markdown) {
  const feedbackMatch = markdown.match(/\n##\s+([^\n]*具体反馈建议[^\n]*)\n/);
  if (!feedbackMatch) {
    return { mainMarkdown: markdown, feedbackTitle: "", feedbackMarkdown: "", appendixMarkdown: "" };
  }
  const feedbackStart = feedbackMatch.index;
  const feedbackContentStart = feedbackStart + feedbackMatch[0].length;
  const afterFeedback = markdown.slice(feedbackContentStart);
  const nextSection = afterFeedback.match(/\n##\s+/);
  const feedbackMarkdown = nextSection ? afterFeedback.slice(0, nextSection.index) : afterFeedback;
  const appendixMarkdown = nextSection ? afterFeedback.slice(nextSection.index + 1) : "";
  return {
    mainMarkdown: markdown.slice(0, feedbackStart),
    feedbackTitle: feedbackMatch[1].trim(),
    feedbackMarkdown,
    appendixMarkdown,
  };
}

function splitTableLine(line) {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function headerIndex(headers, patterns) {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function parseMarkdownTable(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  const headerLine = lines.find((line) => !/^\|\s*:?-/.test(line));
  if (!headerLine) return [];
  const headers = splitTableLine(headerLine);
  const rows = lines
    .slice(lines.indexOf(headerLine) + 1)
    .filter((line) => !/^\|\s*:?-/.test(line))
    .map(splitTableLine);

  const idx = {
    module: headerIndex(headers, [/反馈模块/, /模块/]),
    frequency: headerIndex(headers, [/提及频度/, /频度/]),
    point: headerIndex(headers, [/反馈点/]),
    nextStep: headerIndex(headers, [/Next Step/i, /建议/]),
    quote: headerIndex(headers, [/玩家原话/, /原话/, /证据/]),
    rdPic: headerIndex(headers, [/研发\s*PIC/i, /研发/]),
    opsPic: headerIndex(headers, [/运营\s*PIC/i, /运营/]),
  };

  return rows
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      module: cells[idx.module] || cells[0] || "",
      frequency: cells[idx.frequency] || cells[1] || "",
      point: cells[idx.point] || cells[2] || "",
      nextStep: cells[idx.nextStep] || cells[3] || "",
      quote: cells[idx.quote] || cells[4] || "",
      rdPic: idx.rdPic >= 0 ? cells[idx.rdPic] || "" : "",
      opsPic: idx.opsPic >= 0 ? cells[idx.opsPic] || "" : "",
    }))
    .filter((item) => item.module || item.point);
}

function decorateAttitudes(html) {
  const classes = {
    "积极": "attitude-positive",
    "中性偏积极": "attitude-neutral-positive",
    "中性": "attitude-neutral",
    "中性偏消极": "attitude-neutral-negative",
    "消极": "attitude-negative",
  };
  return html.replace(/(积极|中性偏积极|中性偏消极|中性|消极)(?=[:：\s])/g, (label) => {
    return `<span class="attitude ${classes[label]}">${label}</span>`;
  });
}

function decorateMain(html) {
  return decorateAttitudes(html)
    .replace(/<h2>([^<]+)<\/h2>/g, (_, text) => {
      const id = slugify(text);
      const number = text.match(/^(\d+)\./)?.[1] || (text.startsWith("Appendix") ? "A" : "");
      const label = text.replace(/^\d+\.\s*/, "");
      return `<h2 id="${id}"><span>${number}</span>${label}</h2>`;
    })
    .replace(/<h3>([^<]+)<\/h3>/g, (_, text) => `<h3 id="${slugify(text)}">${text}</h3>`)
    .replace(/<table>/g, '<div class="table-frame"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

function frequencyClass(frequency) {
  const first = String(frequency).replace(/<br\s*\/?>.*/i, "").trim();
  if (first.includes("高")) return "high";
  if (first.includes("中")) return "mid";
  return "low";
}

function renderFrequency(frequency) {
  const parts = String(frequency || "")
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const label = parts[0] || "";
  const coverage = parts.slice(1);
  return [
    `<span class="freq ${frequencyClass(label)}">${escapeHtml(label)}</span>`,
    coverage.length ? `<span class="coverage">${coverage.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</span>` : "",
  ].join("");
}

function renderAction(action) {
  const text = String(action || "").trim();
  if (!text) return "";
  if (/^pending$/i.test(text)) return "pending";
  return escapeHtml(text).replace(/^【倾向：([^】]+)】/, '<span class="next-tag">倾向：$1</span>');
}

function renderQuote(quote) {
  return String(quote || "")
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      let cls = "quote-line";
      if (part.startsWith("中文翻译：")) cls += " cn";
      if (/原文：|整理原文：/.test(part)) cls += " original";
      if (part.startsWith("来源：")) cls += " src";
      return `<p class="${cls}">${escapeHtml(part)}</p>`;
    })
    .join("");
}

function renderFeedback(items, feedbackTitle) {
  if (!items.length) return "";
  const counts = items.reduce((acc, item) => {
    const key = String(item.frequency || "").replace(/<br\s*\/?>.*/i, "").trim();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const number = feedbackTitle.match(/^(\d+)/)?.[1] || "4";
  const label = feedbackTitle.replace(/^\d+\.\s*/, "") || "具体反馈建议";
  return `
    <section class="evidence" id="recommendations">
      <div class="section-title">
        <p class="section-kicker">Evidence-backed product actions</p>
        <h2><span>${escapeHtml(number)}</span>${escapeHtml(label)}</h2>
        <div class="evidence-meta" aria-label="反馈频度统计">
          <span><b>${counts["高"] || 0}</b> 高频</span>
          <span><b>${counts["中"] || 0}</b> 中频</span>
          <span><b>${counts["低"] || 0}</b> 低频</span>
        </div>
      </div>
      <div class="feedback-table-frame">
        <table class="feedback-table">
          <thead><tr><th>反馈模块</th><th>提及频度<br>玩家提及比例</th><th>反馈点</th><th>Next Step</th><th>玩家原话</th><th>研发 PIC</th><th>运营<br>PIC</th></tr></thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td><span class="module">${escapeHtml(item.module)}</span></td>
                <td>${renderFrequency(item.frequency)}</td>
                <td class="point">${escapeHtml(item.point)}</td>
                <td class="action">${renderAction(item.nextStep)}</td>
                <td class="quote-cell">${renderQuote(item.quote)}</td>
                <td class="pic">${escapeHtml(item.rdPic)}</td>
                <td class="pic">${escapeHtml(item.opsPic)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

const { mainMarkdown, feedbackTitle, feedbackMarkdown, appendixMarkdown } = splitReport(bodyMarkdown);
const mainHtml = decorateMain(marked.parse(mainMarkdown));
const feedbackHtml = renderFeedback(parseMarkdownTable(feedbackMarkdown), feedbackTitle);
const appendixHtml = appendixMarkdown.trim()
  ? `<article class="report-body appendix-body">${decorateMain(marked.parse(appendixMarkdown))}</article>`
  : "";

const navLinks = [
  ["#background", "项目背景"],
  ["#conclusion", "核心结论"],
  ["#comparison", "玩家分层对比"],
  ["#recommendations", "具体反馈建议"],
  ["#appendix", "Appendix"],
];

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
    :root {
      --brand-primary: #C0504D;
      --brand-secondary: #997E5A;
      --brand-dark: #4D4D4D;
      --brand-medium: #7F7F7F;
      --brand-bg: #E9D7D3;
      --brand-bg-alt: #F5F0EE;
      --paper: #FFFFFF;
      --page: #F5F0EE;
      --ink: #333333;
      --body: #4D4D4D;
      --muted: #7F7F7F;
      --line: #d8cac7;
      --radius: 8px;
      --shadow: 0 10px 28px rgba(77,77,77,.10);
      --font-display: 'EB Garamond','Noto Serif SC','Garamond','Georgia',serif;
      --font-body: 'EB Garamond','Noto Serif SC','Garamond','Georgia',serif;
    }
    @page { size: A4; margin: 14mm 13mm; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; letter-spacing: 0; }
    body { margin: 0; color: var(--body); font-family: var(--font-body); font-size: 16px; line-height: 1.68; background: var(--page); }
    .top-rule { height: 6px; background: var(--brand-primary); border-right: 28vw solid var(--brand-secondary); }
    .shell { width: min(1160px, calc(100% - 44px)); margin: 0 auto; }
    .cover { padding: 34px 0 22px; border-bottom: 1px solid var(--line); }
    .eyebrow { margin: 0 0 12px; color: var(--brand-primary); font-size: 13px; font-weight: 800; }
    h1 { max-width: 920px; margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 42px; line-height: 1.18; letter-spacing: 0; }
    .lead { max-width: 920px; margin: 16px 0 0; color: var(--brand-dark); font-size: 18px; line-height: 1.75; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    .meta-row span { padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); color: var(--brand-dark); font-size: 13px; font-weight: 700; }
    .nav-wrap { position: sticky; top: 0; z-index: 10; background: rgba(245,240,238,.94); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
    .nav { width: min(1160px, calc(100% - 44px)); margin: 0 auto; display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; }
    .nav a { flex: 0 0 auto; padding: 8px 10px; color: var(--brand-dark); border-radius: 6px; font-size: 14px; font-weight: 700; text-decoration: none; }
    .nav a:hover, .nav a:focus { color: var(--brand-primary); background: rgba(192,80,77,.10); outline: none; }
    .content { padding: 28px 0 56px; }
    .report-body, .evidence { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
    .report-body { padding: 30px 34px; margin-bottom: 22px; }
    .report-body h2, .evidence h2 { display: flex; align-items: center; gap: 12px; margin: 34px 0 16px; color: var(--ink); font-family: var(--font-display); font-size: 26px; line-height: 1.35; letter-spacing: 0; padding-top: 20px; border-top: 1px solid var(--line); }
    .report-body h2:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
    .report-body h2 span, .evidence h2 span { display: inline-grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border: 1px solid rgba(192,80,77,.36); border-radius: 50%; color: var(--brand-primary); background: rgba(192,80,77,.10); font-family: Consolas,'Cascadia Mono',monospace; font-size: 14px; font-weight: 900; }
    .report-body h3 { margin: 24px 0 8px; color: var(--ink); font-family: var(--font-display); font-size: 19px; line-height: 1.45; letter-spacing: 0; }
    .report-body p, .report-body li { color: var(--brand-dark); }
    .report-body p { margin: 10px 0 0; }
    .report-body ul { margin: 10px 0 0; padding-left: 20px; }
    .report-body li { margin: 6px 0; }
    strong { color: var(--ink); font-weight: 900; }
    .table-frame, .feedback-table-frame { margin: 18px 0 6px; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
    table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 14px; line-height: 1.55; background: #fff; }
    th, td { padding: 13px 14px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; word-break: break-word; }
    th:last-child, td:last-child { border-right: 0; }
    tbody tr:last-child td { border-bottom: 0; }
    th { color: var(--ink); background: var(--brand-bg-alt); font-weight: 900; }
    tbody td:first-child { color: var(--brand-primary); font-weight: 900; }
    .attitude { display: inline-flex; margin-right: 6px; padding: 2px 8px; border-radius: 999px; font-size: 12px; line-height: 1.35; font-weight: 900; white-space: nowrap; }
    .attitude-positive { color: #2f6d3a; background: rgba(79,143,88,.14); border: 1px solid rgba(79,143,88,.30); }
    .attitude-neutral-positive { color: #5d7443; background: rgba(125,151,86,.16); border: 1px solid rgba(125,151,86,.32); }
    .attitude-neutral { color: #666; background: rgba(127,127,127,.14); border: 1px solid rgba(127,127,127,.28); }
    .attitude-neutral-negative { color: #8a6236; background: rgba(153,126,90,.16); border: 1px solid rgba(153,126,90,.34); }
    .attitude-negative { color: #a53a37; background: rgba(192,80,77,.14); border: 1px solid rgba(192,80,77,.34); }
    .evidence { margin-top: 22px; padding: 28px 30px 30px; }
    .section-title { display: grid; grid-template-columns: 1fr auto; gap: 10px 20px; align-items: end; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
    .section-kicker { grid-column: 1 / -1; margin: 0; color: var(--brand-primary); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .evidence h2 { margin: 0; padding: 0; border: 0; }
    .evidence-meta { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .evidence-meta span { padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--brand-dark); background: #fff; font-size: 13px; font-weight: 800; }
    .feedback-table { width: 100%; min-width: 0; table-layout: fixed; font-size: 12px; line-height: 1.48; }
    .feedback-table th, .feedback-table td { padding: 10px 9px; }
    .feedback-table th:nth-child(1), .feedback-table td:nth-child(1) { width: 8%; }
    .feedback-table th:nth-child(2), .feedback-table td:nth-child(2) { width: 12%; text-align: left; }
    .feedback-table th:nth-child(3), .feedback-table td:nth-child(3) { width: 20%; }
    .feedback-table th:nth-child(4), .feedback-table td:nth-child(4) { width: 16%; }
    .feedback-table th:nth-child(5), .feedback-table td:nth-child(5) { width: 32%; }
    .feedback-table th:nth-child(6), .feedback-table td:nth-child(6),
    .feedback-table th:nth-child(7), .feedback-table td:nth-child(7) { width: 6%; }
    .feedback-table thead th:nth-child(4) { background: #f4ead7 !important; }
    .feedback-table tbody td.action,
    .feedback-table tbody tr:nth-child(odd) td.action,
    .feedback-table tbody tr:nth-child(even) td.action { background: #fff6e4 !important; }
    .feedback-table tbody tr:nth-child(even) td { background: #fbf8f7; }
    .module { color: var(--brand-primary); font-size: 13px; font-weight: 900; }
    .freq { display: inline-flex; min-width: 30px; justify-content: center; padding: 3px 7px; border-radius: 999px; font-size: 11px; font-weight: 900; }
    .freq.high { color: #C0504D; background: rgba(192,80,77,.12); }
    .freq.mid { color: #997E5A; background: rgba(153,126,90,.12); }
    .freq.low { color: #6F7782; background: rgba(127,127,127,.12); }
    .coverage { display: block; margin-top: 6px; font-size: 10.5px; line-height: 1.45; color: var(--body); font-weight: 700; }
    .coverage span { display: block; }
    .point, .action { font-size: 12px; line-height: 1.5; }
    .point { color: var(--ink); font-weight: 900; }
    .action { color: #2f2924; font-weight: 760; box-shadow: inset 3px 0 0 #9b7b48; }
    .next-tag { display: inline-block; margin: 0 4px 4px 0; padding: 2px 7px; border-radius: 999px; background: #f1e2bf; color: #6f4d1f; font-size: 10px; line-height: 1.3; font-weight: 900; white-space: nowrap; }
    .quote-cell { background: #fbf8f7; }
    .quote-line { margin: 0; color: var(--brand-dark); font-size: 10px; line-height: 1.45; }
    .quote-line + .quote-line { margin-top: 2px; }
    .quote-line.cn { color: var(--ink); font-weight: 800; }
    .quote-line.src { color: var(--muted); font-size: 9.8px; }
    .pic { text-align: center; font-weight: 800; color: var(--brand-dark); }
    .score-cell { font-weight: 900; vertical-align: middle; }
    .score-cell b { display: block; font-size: 18px; line-height: 1.1; }
    .score-low { background: #f6d4cf; color: #9b2c28; }
    .score-watch { background: #f7e2bf; color: #805312; }
    .score-ok { background: #e4edd7; color: #536a2f; }
    .score-strong { background: #cfe5d7; color: #285b38; }
    .score-na { background: #f5f0ee; color: var(--muted); }
    .page-footer { margin: 20px 0 44px; color: var(--muted); font-size: 13px; text-align: right; }
    @media (max-width: 900px) { .shell, .nav { width: min(100% - 28px, 1160px); } h1 { font-size: 32px; } .lead { font-size: 16px; } .report-body, .evidence { padding: 22px 18px; } .section-title { grid-template-columns: 1fr; } .evidence-meta { justify-content: flex-start; } }
    @media (max-width: 560px) { body { font-size: 15px; } h1 { font-size: 28px; } .report-body h2, .evidence h2 { font-size: 22px; } }
    @media print { body { background: #fff; font-size: 10pt; } .top-rule, .nav-wrap { display: none; } .shell { width: auto; margin: 0; } .cover { padding-top: 0; } .report-body, .evidence { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="top-rule"></div>
  <header class="cover shell">
    <p class="eyebrow">Player FGD / Research Report</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="lead">基于玩家 FGD 材料整理，聚焦本次研究目标下的核心体验、玩家分层差异、具体反馈行动和可追溯证据。</p>
    <div class="meta-row">
      <span>FGD 研究报告</span>
      <span>中文报告版</span>
      <span>含玩家原话证据</span>
    </div>
  </header>
  <div class="nav-wrap">
    <nav class="nav" aria-label="报告导航">
      ${navLinks.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
    </nav>
  </div>
  <main class="shell content">
    <article class="report-body">${mainHtml}</article>
    ${feedbackHtml}
    ${appendixHtml}
    <footer class="page-footer">Generated from ${escapeHtml(path.basename(inputPath))}</footer>
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(outputPath);
