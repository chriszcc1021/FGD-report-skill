---
name: fgd-report-synthesizer
description: Create, restructure, merge, localize, or polish FGD/interview research reports from transcripts, DOCX/PDF/Markdown notes, surveys, scoring sheets, or bilingual materials. Use when Codex needs to analyze focus group discussions or player interviews and produce a polished Chinese Markdown/HTML report with player segmentation, evidence-backed feedback tables, Next Step/PIC fields, scoring appendix, and localizable report formatting.
---

# FGD Report Synthesizer

## Purpose

Turn raw FGD transcripts, notes, surveys, and scoring files into a clean research report. Write like a product/research analyst: concise, evidence-backed, and easy to scan.

Default to `references/report-format.md` for Markdown structure. When producing HTML, use `references/html-report-format.md`. Do not preserve old templates mechanically when the user has changed the report structure or columns.

## Workflow

1. Read and preserve source materials.
   - Preserve original transcripts and source files.
   - Extract DOCX/PDF text into working files when useful.
   - Treat noisy ASR or partial notes conservatively: use repeated signals, not isolated quotes.
2. Identify the report objective and grouping.
   - Capture market/region, session count, player type, game/version, research objective, and discussion scope.
   - Merge source groups into user-facing player segments when needed, then use that segmentation consistently across the whole report.
   - Let the research objective determine module order. Do not force a previous report's business conclusions onto a new report.
3. Build the report using the current user-approved structure.
   - Default sections: 项目背景, 核心结论, 玩家分层/新老玩家对比, 具体反馈建议, Appendix.
   - Do not add `关键发现` by default. If the user asks to remove a section, keep it removed in later revisions.
   - Keep product actions inside the final feedback table unless the user asks for a separate strategy/recommendation section.
4. Create the final feedback table.
   - Default columns: `反馈模块 | 提及频度 / 玩家提及比例 | 反馈点 | Next Step | 玩家原话 | 研发 PIC | 运营 PIC`.
   - Do not add `涉及地区` or `地区差异说明` by default. Put regional nuance in the narrative or notes only when useful.
   - Fill Next Step only from user-provided todo lists, meeting conclusions, or explicit direction. Do not invent actions.
   - If no clear Next Step exists, use `pending`.
   - Add tendency labels to concrete Next Step items only when useful, using the current report's player segmentation. Do not add tendency labels to `pending`.
   - Include R&D PIC and Ops PIC columns; leave cells blank unless the user provides owners or a valid source.
5. Add evidence.
   - Put player evidence in the final table, not scattered through the main narrative.
   - Include translated meaning, original quote or cleaned original note, and source reference.
   - Use representative quotes sparingly while covering all major feedback modules.
6. Add scoring appendix when scoring data exists.
   - Put scoring tables in Appendix, not the main body.
   - Include an overall score column and player-segment columns.
   - Use heatmap coloring in HTML.
   - Respect the user's inclusion/exclusion rules for markets, files, or surveys.
7. Generate HTML when requested.
   - Use the report-style HTML, not a marketing landing page.
   - Keep tables readable, responsive, and screenshot/PDF friendly.
   - Add language switching and localizable layout when the user asks for multilingual output.
8. Validate before finalizing.
   - Check section structure, table columns, player segmentation, evidence format, Next Step provenance, PIC fields, scoring appendix, terminology consistency, and HTML readability.

## Reusable Rules

- Use attitude labels when comparing player groups or summarizing player stance: `积极 / 中性偏积极 / 中性 / 中性偏消极 / 消极`.
- Put attitude labels at the start of the relevant cell or sentence, not in a separate column unless the user asks.
- In HTML, render attitude labels with color-coded pills.
- Use tendency labels in Next Step only for real actions. The label vocabulary must come from the report's current player segmentation, for example `倾向：新玩家`, `倾向：老玩家`, `倾向：兼顾新老玩家`, or a project-specific equivalent.
- If the user specifies terminology, apply it consistently across Markdown, HTML, Appendix, and translated/localized variants.
- Keep wording plain. Replace jargon with readable product language.
- Keep frequency and priority separate: frequency is mention density; priority follows the research objective.
- Use approximate player coverage only when strict per-person coding is unavailable, and keep the denominator and grouping口径 consistent.

## References

- Read `references/report-format.md` for the Markdown report structure, feedback table schema, labels, Appendix rules, and writing checklist.
- Read `references/html-report-format.md` for HTML layout, table styling, language switcher, localization, and visual QA rules.
- Use `scripts/render-html-report.cjs` to convert a ready Markdown report into the standard single-file HTML format when appropriate.
