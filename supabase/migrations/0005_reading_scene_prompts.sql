-- Reading scene prompt templates. One per scene mapped from the frontend
-- (PROMPT_VERSION_BY_SCENE in ReadingNewPage.tsx). Inserted as placeholders so
-- the /reading endpoint can find them. Real prompt copy will be iterated by
-- the AI quality team — see .trellis/spec/guides/ai-quality-eval.md.

insert into public.prompt_versions (id, scene, category, template, active, notes)
values
  (
    'bazi-marriage-v1',
    'marriage',
    'bazi-reading',
    '基于以下八字命盘，从婚姻情感角度给出深度解读。{{chart_facts}}\n{{question}}',
    true,
    'placeholder'
  ),
  (
    'bazi-career-v1',
    'career',
    'bazi-reading',
    '基于以下八字命盘，从事业方向角度给出深度解读。{{chart_facts}}\n{{question}}',
    true,
    'placeholder'
  ),
  (
    'bazi-wealth-v1',
    'wealth',
    'bazi-reading',
    '基于以下八字命盘，从财运结构角度给出深度解读。{{chart_facts}}\n{{question}}',
    true,
    'placeholder'
  ),
  (
    'bazi-health-v1',
    'health',
    'bazi-reading',
    '基于以下八字命盘，从健康提示角度给出建议（非医疗建议）。{{chart_facts}}\n{{question}}',
    true,
    'placeholder'
  ),
  (
    'bazi-study-v1',
    'study',
    'bazi-reading',
    '基于以下八字命盘，从学业规划角度给出建议。{{chart_facts}}\n{{question}}',
    true,
    'placeholder'
  )
on conflict (id) do nothing;
