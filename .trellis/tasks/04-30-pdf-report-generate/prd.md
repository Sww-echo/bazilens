# PDF report-generate Edge Function

## Goal

异步 PDF 详批生成管道：Stripe webhook 触发 → 7 章 chapter orchestration → react-pdf 渲染 → Supabase Storage 上传 → 签名 URL → Resend 邮件通知。前端 Realtime 订阅 `reports` 行实时进度。

> 详见 `docs/TECH_SPEC.md` §14 + `.trellis/spec/supabase/edge-functions.md` "report-generate"。

---

## Scope

### In Scope（`supabase/functions/report-generate/`）

1. **`index.ts`**（352 行）— 主调度
   - [x] 入参：`{ report_id }`（webhook 触发，CRON_SECRET 校验）
   - [x] 读 `reports` + `charts`，加载用户问题上下文（无则用模板默认）
   - [x] 7 章按序生成：每章独立 LLM 调用，写中间结果到 `reports.chapter_results` jsonb
   - [x] 每章完成 → update `reports.progress`（让前端 Realtime 看到）
   - [x] 全部章节就绪 → render PDF → upload Storage → set `status='ready'` + `storage_path` + `signed_url_expires_at`
   - [x] 任意章节失败：`status='failed'` + `error_message` + 退款流程触发（mark `refund_at`）
   - [x] 完成时调 Resend：发送下载链接邮件
   - [x] 失败邮件：通知客服 SOP

2. **`chapters.ts`** — 7 章定义（cover + 6 内容章）
   - [x] 每章：title / system_prompt / user_prompt_template / target_words
   - [x] 章节顺序固定（cover → personality → career → wealth → relationship → health → outlook）

3. **`pdf-render.tsx`** — react-pdf 模板
   - [x] 封面（用户姓名 + 命盘日期 + BaziLens logo）
   - [x] 章节正文（标题 + 段落 + 八字四柱图）
   - [x] 附录（命盘原始数据）
   - [x] 双语 disclaimer 页（中英）
   - [x] 字体子集嵌入（Source Han Serif SC）

### Out of Scope

- ❌ PDF prompt 模板内容（`prompt_versions` 表种子在 `04-30-supabase-init`）
- ❌ 字体子集 CI 脚本（`STATUS.md` 17 — Operations）
- ❌ Resend 域名验证（用户手动）

---

## DoD

- [x] `supabase/functions/report-generate/index.ts` 存在
- [x] `chapters.ts` 7 章定义完整
- [x] `pdf-render.tsx` 渲染产出可读 PDF
- [x] 进度更新正确触发前端 Realtime
- [x] 失败路径退款 mark 正确
- [x] 邮件通知文案中英双语
- [x] Edge Function bundle 在 Supabase 50MB 限制内（用户验证时再确认）

---

## Key References

- `docs/TECH_SPEC.md` §14（PDF 详批管道）
- `docs/PLAN.md` §8（PDF 商品）
- `src/api/reports.ts` + `src/hooks/useReportProgress.ts`（前端消费方）
- `src/pages/report/ReportDetailPage.tsx`（UI）

---

## Notes

- 实现完成于 commit `b451592`。
- 前端 `ReportDetailPage` 通过 Realtime channel 订阅 `reports` 行，`useReportProgress` 自动拉签名 URL。
- 7 章总目标字数 5000-8000，Claude Sonnet 4.6 prompt cache 显著降本（$0.30 / report 内）。
- bundle size 警戒：`@react-pdf/renderer` + `resend` + `stripe` 三大件，部署时关注。
