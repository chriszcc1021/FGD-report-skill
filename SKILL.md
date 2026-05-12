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
   - Capture market/region, session count, player type, game/version, and discussion scope.
   - For multi-region materials, list each region's sample separately in 项目背景, including session count, participant profile, and source file/session scope.
   - For two-group player FGD, treat groups such as 新玩家 vs 老玩家 as the main comparison lens.
   - Capture the research objective. If the FGD is mainly for 3C/combat validation, prioritize camera, controls, dodge/movement, targeting, block/parry, combat UI, and role combat positioning over supplemental topics such as PvE, art, social, or broad willingness to play.
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
   - Do not merge 格挡/招架 with 闪避/位移. 格挡/招架 means weapon/shield/staff defensive actions and parry feedback. 闪避/位移 means class-wide small movement such as dash/dodge/roll, distance, cooldown, and approach/escape value.
7. Validate coverage before finalizing.
   - Every major claim in 关键发现 should appear in 具体反馈建议 or be intentionally omitted as low priority.
   - Check especially UI/战斗信息 items such as 血条、敌我识别、低血提示、小地图、脚步声.

## Multi-Region Rules

Use these rules when the source materials cover more than one country, market, language, or region:

- 项目背景 must explicitly list regions and samples by region.
- 核心结论 should distinguish cross-region consensus from region-specific signals, but product judgment should assume the core gameplay is globally unified.
- Do not recommend region-specific gameplay configurations unless the user explicitly asks. Instead, describe whether a feedback point is a global priority, a region-specific risk, or a signal that needs broader validation.
- 关键发现 should mention region signals inside the finding when useful, for example: “该问题为跨地区共识；墨西哥玩家更强调自动瞄准带来的失控感，越南玩家更强调团战敌我识别。”
- Do not add a standalone 地区对比 section by default.
- Keep section 4 as 新玩家与老玩家对比. For multi-region reports, add a final `地区备注` column to that comparison table to indicate whether the dimension has region differences.
- In the final table, use this column order for multi-region reports: `反馈模块 | 提及频度 | 反馈点 | 建议 | 涉及地区 | 地区差异说明 | 玩家原话`.
- Frequency labels remain `高 / 中 / 低`. Do not change them to “跨地区高频” or “地区高频”; put that context in `地区差异说明`.

## Writing Rules

- Use Chinese headings.
- Lead with findings, not methodology.
- Do not include a methodology section unless the user requests it.
- Do not include a strategy/implication section unless the user requests it.
- Keep the report concise; avoid academic coding language.
- Use direct, business-friendly wording.
- Separate player attitude from problem density: positive players can still raise many issues.
- Distinguish new-player needs from old-player/core-player needs.
- Distinguish research priority from mention frequency. If 3C/combat is the research goal, put 3C/combat modules before supplemental PvE even when PvE has repeated comments.
- Keep source references inside the final evidence table, not scattered through the main narrative.
- Do not over-quote in the main body. Save quotes for the evidence table.

## Frequency Labels

Use `高 / 中 / 低` in the final table:

- `高`: repeated across multiple players, both groups, or a core experience blocker.
- `中`: mentioned by one or several players and product-relevant, but more scoped.
- `低`: isolated detail, polish issue, or future validation item.

When uncertain, choose the lower frequency and let the recommendation wording be conservative.

Frequency is not the same as product priority. Preserve the frequency label as a mention-density signal, but order the final table by the research objective first when the user states one.

## Evidence Style

In the final `玩家原话` cell, use this format:

```text
中文翻译：……
原文：“……”
来源：Session X, line/page/location …
```

If combining multiple quotes into one row, separate them with `/` and keep sources visible.

## Reference

Read `references/report-format.md` for the exact section template, table schema, consolidation rules, and wording checklist.

Read `references/html-report-format.md` when producing an HTML report from the final Markdown report.

Use `scripts/render-html-report.cjs` when a ready Markdown report should be converted into the standard single-file HTML report format.
