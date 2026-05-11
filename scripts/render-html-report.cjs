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
const finalTitle = "5. 具体反馈建议";
const [mainMarkdown, feedbackMarkdown = ""] = bodyMarkdown.split(`\n## ${finalTitle}\n`);

marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text) {
  const known = {
    "1. 项目背景": "background",
    "2. 核心结论": "conclusion",
    "3. 关键发现": "findings",
    "4. 新玩家与老玩家对比": "comparison",
  };
  return known[text] || text
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, "")
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseMarkdownTable(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .slice(1)
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([module, frequency, point, recommendation, quote]) => ({
      module,
      frequency,
      point,
      recommendation,
      quote,
    }));
}

function decorateMain(html) {
  return html
    .replace(/<h2>([^<]+)<\/h2>/g, (_, text) => {
      const id = slugify(text);
      const number = text.match(/^(\d+)\./)?.[1] || "";
      const label = text.replace(/^\d+\.\s*/, "");
      return `<h2 id="${id}"><span>${number}</span>${label}</h2>`;
    })
    .replace(/<h3>([^<]+)<\/h3>/g, (_, text) => `<h3 id="${slugify(text)}">${text}</h3>`)
    .replace(/<table>/g, '<div class="table-frame"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

function frequencyClass(frequency) {
  if (frequency === "高") return "high";
  if (frequency === "中") return "mid";
  return "low";
}

function renderQuote(quote) {
  return quote
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      let cls = "quote-line";
      if (part.startsWith("中文翻译：")) cls += " cn";
      if (part.startsWith("越南语原文：")) cls += " vi";
      if (part.startsWith("来源：")) cls += " src";
      return `<p class="${cls}">${escapeHtml(part)}</p>`;
    })
    .join("");
}

function renderFeedback(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.frequency] = (acc[item.frequency] || 0) + 1;
    return acc;
  }, {});

  if (!items.length) return "";

  return `
    <section class="evidence" id="recommendations">
      <div class="section-title">
        <p class="section-kicker">Evidence-backed product actions</p>
        <h2><span>5</span>具体反馈建议</h2>
        <div class="evidence-meta" aria-label="反馈频度统计">
          <span><b>${counts["高"] || 0}</b> 高频</span>
          <span><b>${counts["中"] || 0}</b> 中频</span>
          <span><b>${counts["低"] || 0}</b> 低频</span>
        </div>
      </div>
      <div class="feedback-table-frame">
        <table class="feedback-table">
          <thead><tr><th>反馈模块</th><th>提及频度</th><th>反馈点</th><th>建议</th><th>玩家原话</th></tr></thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td><span class="module">${escapeHtml(item.module)}</span></td>
                <td><span class="freq ${frequencyClass(item.frequency)}">${escapeHtml(item.frequency)}</span></td>
                <td class="point">${escapeHtml(item.point)}</td>
                <td class="action">${escapeHtml(item.recommendation)}</td>
                <td class="quote-cell">${renderQuote(item.quote)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

const mainHtml = decorateMain(marked.parse(mainMarkdown));
const feedbackHtml = renderFeedback(parseMarkdownTable(feedbackMarkdown));

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
      --brand-light: #BFBFBF;
      --brand-bg: #E9D7D3;
      --brand-bg-alt: #F5F0EE;
      --brand-white: #FFFFFF;
      --brand-black: #333333;
      --page: #F5F0EE;
      --paper: #FFFFFF;
      --ink: #333333;
      --body: #4D4D4D;
      --muted: #7F7F7F;
      --line: #d8cac7;
      --teal: #C0504D;
      --teal-weak: rgba(192, 80, 77, .10);
      --amber: #997E5A;
      --amber-weak: rgba(153, 126, 90, .12);
      --red: #C0504D;
      --red-weak: rgba(192, 80, 77, .12);
      --blue: #7F7F7F;
      --blue-weak: rgba(127, 127, 127, .12);
      --radius: 8px;
      --shadow: 0 10px 28px rgba(77, 77, 77, .10);
      --font-display: 'EB Garamond', 'Noto Serif SC', 'Garamond', 'Georgia', serif;
      --font-body: 'EB Garamond', 'Noto Serif SC', 'Garamond', 'Georgia', serif;
    }
    @page { size: A4; margin: 14mm 13mm; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; letter-spacing: 0; }
    body {
      margin: 0;
      color: var(--body);
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.68;
      background: var(--page);
    }
    a { color: inherit; text-decoration: none; }
    .top-rule {
      height: 6px;
      background: var(--brand-primary);
      border-right: 28vw solid var(--brand-secondary);
    }
    .shell { width: min(1160px, calc(100% - 44px)); margin: 0 auto; }
    .cover { padding: 34px 0 22px; border-bottom: 1px solid var(--line); }
    .eyebrow { margin: 0 0 12px; color: var(--brand-primary); font-size: 13px; font-weight: 800; }
    h1 {
      max-width: 850px;
      margin: 0;
      color: var(--ink);
      font-family: var(--font-display);
      font-size: 42px;
      line-height: 1.18;
      letter-spacing: 0;
    }
    .lead { max-width: 880px; margin: 16px 0 0; color: var(--brand-dark); font-size: 18px; line-height: 1.75; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    .meta-row span {
      padding: 7px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--paper);
      color: var(--brand-dark);
      font-size: 13px;
      font-weight: 700;
    }
    .nav-wrap {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(245, 240, 238, .94);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(12px);
    }
    .nav { width: min(1160px, calc(100% - 44px)); margin: 0 auto; display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; }
    .nav a { flex: 0 0 auto; padding: 8px 10px; color: var(--brand-dark); border-radius: 6px; font-size: 14px; font-weight: 700; }
    .nav a:hover, .nav a:focus { color: var(--brand-primary); background: var(--teal-weak); outline: none; }
    .freq { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 13px; font-weight: 900; }
    .freq.high { color: var(--red); background: var(--red-weak); }
    .freq.mid { color: var(--amber); background: var(--amber-weak); }
    .freq.low { color: var(--blue); background: var(--blue-weak); }
    .content { padding: 28px 0 56px; }
    .report-body, .evidence {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
    .report-body { padding: 30px 34px; }
    .report-body h2, .evidence h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 34px 0 16px;
      color: var(--ink);
      font-family: var(--font-display);
      font-size: 26px;
      line-height: 1.35;
      letter-spacing: 0;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .report-body h2:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
    .report-body h2 span, .evidence h2 span {
      display: inline-grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      border: 1px solid rgba(192, 80, 77, .36);
      border-radius: 50%;
      color: var(--brand-primary);
      background: var(--teal-weak);
      font-family: "Consolas", "Cascadia Mono", monospace;
      font-size: 14px;
      font-weight: 900;
    }
    .report-body h3 { margin: 24px 0 8px; color: var(--brand-black); font-family: var(--font-display); font-size: 19px; line-height: 1.45; letter-spacing: 0; }
    .report-body p, .report-body li { color: var(--brand-dark); }
    .report-body p { margin: 10px 0 0; }
    .report-body ul { margin: 10px 0 0; padding-left: 20px; }
    .report-body li { margin: 6px 0; }
    strong { color: var(--ink); font-weight: 900; }
    .table-frame, .feedback-table-frame {
      margin: 18px 0 6px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: #fff;
    }
    table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 14px; line-height: 1.55; background: #fff; }
    th, td {
      padding: 13px 14px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      word-break: break-word;
    }
    th:last-child, td:last-child { border-right: 0; }
    tbody tr:last-child td { border-bottom: 0; }
    th { color: var(--brand-black); background: var(--brand-bg-alt); font-weight: 900; }
    tbody td:first-child { color: var(--brand-primary); font-weight: 900; }
    .evidence { margin-top: 22px; padding: 28px 30px 30px; }
    .section-title {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px 20px;
      align-items: end;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .section-kicker { grid-column: 1 / -1; margin: 0; color: var(--brand-primary); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .evidence h2 { margin: 0; padding: 0; border: 0; }
    .evidence-meta { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .evidence-meta span { padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--brand-dark); background: #fff; font-size: 13px; font-weight: 800; }
    .feedback-table { min-width: 1180px; table-layout: fixed; font-size: 13px; line-height: 1.58; }
    .feedback-table th { position: sticky; top: 0; z-index: 2; color: var(--brand-black); background: var(--brand-bg-alt); }
    .feedback-table th:nth-child(1), .feedback-table td:nth-child(1) { width: 112px; }
    .feedback-table th:nth-child(2), .feedback-table td:nth-child(2) { width: 84px; text-align: center; }
    .feedback-table th:nth-child(3), .feedback-table td:nth-child(3) { width: 235px; }
    .feedback-table th:nth-child(4), .feedback-table td:nth-child(4) { width: 285px; }
    .feedback-table th:nth-child(5), .feedback-table td:nth-child(5) { width: 464px; }
    .feedback-table tbody tr:nth-child(even) td { background: #fbf8f7; }
    .feedback-table tbody tr:hover td { background: rgba(233, 215, 211, .32); }
    .module { color: var(--brand-primary); font-size: 14px; font-weight: 900; }
    .freq { min-width: 38px; padding: 5px 9px; text-align: center; }
    .point { color: var(--ink); font-size: 14px; font-weight: 900; }
    .action { border-left: 3px solid var(--brand-secondary); background: #fffaf0; color: var(--brand-dark); }
    .quote-cell { background: #fbf8f7; }
    .quote-line { margin: 0; color: var(--brand-dark); font-size: 12.5px; line-height: 1.65; }
    .quote-line + .quote-line { margin-top: 5px; }
    .quote-line.cn { color: var(--brand-black); font-weight: 700; }
    .quote-line.src { color: var(--muted); font-size: 13px; }
    .page-footer { margin: 20px 0 44px; color: var(--muted); font-size: 13px; text-align: right; }
    @media (max-width: 900px) {
      .shell, .nav { width: min(100% - 28px, 1160px); }
      h1 { font-size: 32px; }
      .lead { font-size: 16px; }
      .report-body, .evidence { padding: 22px 18px; }
      .section-title { grid-template-columns: 1fr; }
      .evidence-meta { justify-content: flex-start; }
    }
    @media (max-width: 560px) {
      body { font-size: 15px; }
      .top-rule { height: 6px; }
      .cover { padding-top: 26px; }
      h1 { font-size: 28px; }
      .report-body h2, .evidence h2 { font-size: 22px; }
    }
    @media print {
      body { background: #fff; font-size: 10pt; }
      .top-rule, .nav-wrap { display: none; }
      .shell, .nav { width: auto; margin: 0; }
      .cover { padding-top: 0; }
      .report-body, .evidence { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="top-rule"></div>
  <header class="cover shell">
    <p class="eyebrow">Player FGD / Research Report</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="lead">基于玩家 FGD 逐字稿整理，主要聚焦 3C 相关战斗体验：镜头、操作、闪避/位移、锁敌、格挡/招架、职业战斗定位和 UI 战斗信息。PvE、美术、社交等作为补充观察。</p>
    <div class="meta-row">
      <span>FGD 研究报告</span>
      <span>中文报告版</span>
      <span>含原话证据</span>
    </div>
  </header>
  <div class="nav-wrap">
    <nav class="nav" aria-label="报告导航">
      <a href="#background">项目背景</a>
      <a href="#conclusion">核心结论</a>
      <a href="#findings">关键发现</a>
      <a href="#comparison">新老玩家对比</a>
      <a href="#recommendations">具体反馈建议</a>
    </nav>
  </div>
  <main class="shell content">
    <article class="report-body">${mainHtml}</article>
    ${feedbackHtml}
    <footer class="page-footer">Generated from ${escapeHtml(path.basename(inputPath))}</footer>
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(outputPath);
