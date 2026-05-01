-- =============================================================================
-- supabase/seed.sql — local-only seed data for development.
-- Runs after migrations during `supabase db reset`. Do NOT put production data here.
-- =============================================================================

-- Storage bucket for PDF reports (private; signed URLs only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  10485760,                                -- 10MB cap per PDF
  array['application/pdf']
)
on conflict (id) do nothing;

-- RLS on storage.objects: users can read their own PDFs only via signed URLs;
-- writes happen via service_role from report-generate Edge Function.
drop policy if exists "users read own report pdfs" on storage.objects;
create policy "users read own report pdfs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Seed prompt versions (PDF chapters). These are templates the report-generate
-- Edge Function will load at runtime. Real prompt copy is iterated separately;
-- below are placeholders so local development can exercise the loading code.
-- =============================================================================
insert into public.prompt_versions (id, scene, category, template, active, notes)
values
  ('bazi-pdf-overview-v1',     'overview',     'bazi-pdf',
   '基于上述命盘，撰写第 1 章「命理总论」（800 字）：包含五行格局判断、用神喜忌总结、一生格调与基本走向。语气专业但不晦涩，避免宿命论。',
   true, 'placeholder; revise via prompt evaluation'),
  ('bazi-pdf-wuxing-v1',       'wuxing',       'bazi-pdf',
   '基于上述命盘，撰写第 2 章「五行喜忌详解」（1000 字）：各五行旺衰、用神/忌神原理、调候/病药/通关。',
   true, 'placeholder'),
  ('bazi-pdf-personality-v1',  'personality',  'bazi-pdf',
   '基于上述命盘，撰写第 3 章「性格与人生走向」（1000 字）：十神性格、优势/劣势、适合行业方向 3-5 类倾向。',
   true, 'placeholder'),
  ('bazi-pdf-family-v1',       'family',       'bazi-pdf',
   '基于上述命盘，撰写第 4 章「六亲缘分」（1200 字）：父母/兄弟姐妹、配偶宫、子女。禁用克夫/克妻/克子等情感伤害词。',
   true, 'placeholder; redline-guarded'),
  ('bazi-pdf-dayun-v1',        'dayun',        'bazi-pdf',
   '基于上述命盘，撰写第 5 章「大运流年走势」（1500 字）：当前大运、未来 10 年大运预览（每柱 200 字）、流年要点（仅未来 3 年）。',
   true, 'placeholder'),
  ('bazi-pdf-fortune-v1',      'fortune',      'bazi-pdf',
   '基于上述命盘，撰写第 6 章「财运 健康 学业」（1200 字）：财星结构、五行健康提示（不做疾病预测）、印星结构与学习宜忌。',
   true, 'placeholder'),
  ('bazi-pdf-advice-v1',       'advice',       'bazi-pdf',
   '基于上述命盘，撰写第 7 章「实用建议」（800 字）：五行调和（颜色/方位/行业）、大运转折期注意、命主自我修养建议。',
   true, 'placeholder')
on conflict (id) do update set
  template = excluded.template,
  notes    = excluded.notes;
