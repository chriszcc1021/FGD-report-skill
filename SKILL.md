---
name: fgd-report-synthesizer
description: Create, restructure, merge, or rewrite FGD/interview transcript reports into a concise Chinese research report with clear findings, new-vs-existing-player comparison, and a final evidence-backed feedback recommendation table. Use when Codex needs to analyze focus group discussions, player interviews, transcripts, DOCX/PDF/Markdown research notes, or bilingual FGD materials and produce a polished report following the user's established FGD report style.
---

# FGD Report Synthesizer

## Purpose

Use this skill to turn raw FGD transcripts or notes into a clean Chinese research report. Write like a product/research analyst: concise, evidence-backed, and easy to scan.

Default to the established report style in `references/report-format.md`.

When the user asks for a polished HTML version, use the visual system in
`references/html-report-format.md`.

## Workflow

1. Extract or read the source materials.
   - Preserve original transcripts or source files.
   - If the input is DOCX/PDF, extract text into a working file when useful.
   - If ASR quality is noisy, rely on repeated signals rather than one isolated sentence.
2. Identify groups and context.
   - Capture market, session count, player type, game/version, and discussion scope.
   - For two-group player FGD, treat groups such as 新玩家 vs 老玩家 as the main comparison lens.
3. Build the report in Chinese using the established structure.
   - 项目背景
   - 核心结论
   - 关键发现
   - 新玩家与老玩家对比
   - 具体反馈建议
4. Keep recommendations inside the final feedback table.
   - Do not create a separate 产品建议 or 策略启示 section unless the user explicitly asks.
   - Each recommendation must connect to a feedback point and player evidence.
5. Add player evidence in the final table.
   - Include Chinese translation and original-language quote.
   - Include source reference: session/file and line/page/location when available.
   - Use representative quotes sparingly but cover all major findings.
6. Deduplicate and consolidate.
   - Merge near-duplicate feedback points.
   - Keep separate rows only when they imply different product actions.
7. Validate coverage before finalizing.
   - Every major claim in 关键发现 should appear in 具体反馈建议 or be intentionally omitted as low priority.
   - Check especially UI/战斗信息 items such as 血条、敌我识别、低血提示、小地图、脚步声.

## Writing Rules

- Use Chinese headings.
- Lead with findings, not methodology.
- Do not include a methodology section unless the user requests it.
- Do not include a strategy/implication section unless the user requests it.
- Keep the report concise; avoid academic coding language.
- Use direct, business-friendly wording.
- Separate player attitude from problem density: positive players can still raise many issues.
- Distinguish new-player needs from old-player/core-player needs.
- Keep source references inside the final evidence table, not scattered through the main narrative.
- Do not over-quote in the main body. Save quotes for the evidence table.

## Frequency Labels

Use `高 / 中 / 低` in the final table:

- `高`: repeated across multiple players, both groups, or a core experience blocker.
- `中`: mentioned by one or several players and product-relevant, but more scoped.
- `低`: isolated detail, polish issue, or future validation item.

When uncertain, choose the lower frequency and let the recommendation wording be conservative.

## Evidence Style

In the final `玩家原话` cell, use this format:

```text
中文翻译：……
越南语原文：“……”
来源：Session X, line/page/location …
```

If combining multiple quotes into one row, separate them with `/` and keep sources visible.

## Reference

Read `references/report-format.md` for the exact section template, table schema, consolidation rules, and wording checklist.

Read `references/html-report-format.md` when producing an HTML report from the final Markdown report.

Use `scripts/render-html-report.cjs` when a ready Markdown report should be converted into the standard single-file HTML report format.
