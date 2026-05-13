-- Reading prompts v2 — align user-prompt templates with the strict system
-- prompt added in supabase/functions/_shared/prompts.ts:SYSTEM_PROMPT_FORTUNE_SCHOLAR.
--
-- Background: with v1 templates, the user-prompt commanded "结合大运流年取用",
-- which overrode the system prompt's "don't make up missing data" rule, so
-- DeepSeek hallucinated dayun cycles + liunian干支 even when chart_data
-- omitted them. v2 keeps the analysis framework but uses conditional phrasing
-- ("如 input 包含大运信息，则结合应期") and explicitly tells the model to fall
-- back to "未提供，仅作方向性提示" when fields are absent.

update public.prompt_versions
set template = $$判断命局更适合守成、开拓、技术、管理还是经营，再说明当前阶段的赚钱方式、职业方向和风险点。

【分析路径】先判断日主旺衰与月令喜忌；再看官杀印比食伤十神格局；如 input 提供了大运/流年字段则结合应期，否则仅给方向性提示。

【输出结构】
1. 核心判断：用1-2句给出适合的工作模式与主线方向。
2. 关键支撑（2-4 条）：每条围绕一个十神或宫位展开，说明为什么。
3. 当前阶段：若 input 提供大运/流年，分析未来 3-5 年的赚钱节奏与机会窗口；**若未提供，请明确指出「input 未提供大运/流年信息」，再用条件式（"当遇到水木旺相的运势"）给出方向性建议**，禁止报具体年份与干支。
4. 风险与建议：指出最容易翻车的1-2点，给出可执行的应对。

【用户问题】{{question}}

如未提供问题，请直接按上面四个部分输出整体事业解读。$$,
    notes = 'real-prompt-v2 (anti-hallucination)'
where id = 'bazi-career-v1';

update public.prompt_versions
set template = $$判断财运应期，说明财更容易在哪些阶段、年份或环境里起来，再指出机会点和破财情形。

【分析路径】先看正财偏财在原局的旺衰与位置；再判断财库、食伤生财、官星护财等结构；如 input 提供大运/流年再结合应期，否则仅作五行属性层面的方向性建议。

【输出结构】
1. 财运基调：判断聚财还是流水财、求财方式、命局承财量。
2. 应期分析（2-4 条）：**若 input 未提供大运/流年，请明确说「input 未提供具体应期」并改用条件式表达**（例如"当遇到食伤生财的旺地"、"在土金气盛的阶段"），禁止编造具体干支或年份。
3. 破财风险：哪些组合最容易耗财（劫财、伤官见官等），如何规避。
4. 实操建议：与命局匹配的财源类型、合作模式。

【用户问题】{{question}}

如未提供问题，请直接给出整体财运结构。$$,
    notes = 'real-prompt-v2 (anti-hallucination)'
where id = 'bazi-wealth-v1';

update public.prompt_versions
set template = $$围绕配偶星、夫妻宫和相处模式，判断感情优势、隐患与关系节奏，再说明适合的对象、容易推进的阶段和经营建议。

【分析路径】配偶星位置、是否被合冲刑害；日支夫妻宫五行喜忌；桃花/红艳/天乙等神煞（仅当 input 提供）；如 input 提供大运/流年，结合关系应期。

【输出结构】
1. 关系基调：判断感情节奏（早婚/晚婚/聚少离多）与匹配类型。
2. 配偶画像（2-3 点）：性格倾向、家庭背景、相处特质。
3. 应期：**若 input 未提供大运/流年，请说「input 未提供具体应期」并改用条件式**（例如"逢配偶星出现的运势"），禁止报具体年份。
4. 经营建议：基于命局相处模式给出具体可执行的建议。

【用户问题】{{question}}

注意：避免使用「克夫」「克妻」等绝对断言。如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v2 (anti-hallucination)'
where id = 'bazi-marriage-v1';

update public.prompt_versions
set template = $$判断最需要注意的身体倾向与生活习惯问题，说明风险主要落在哪些系统或体质失衡上，再给出饮食、作息、运动建议。

【分析路径】五行旺衰判断脏腑偏向；强弱过度的五行 → 对应系统的潜在压力；调候用神缺失 → 寒热燥湿失衡；如 input 提供大运/流年，结合可能的高压时段。

【输出结构】
1. 体质基调：判断五行偏旺/偏弱主体倾向。
2. 关注方向（2-3 个）：每个对应身体系统，说明常见表现。
3. 时间窗口：**若 input 未提供大运/流年，请明确说「input 未提供具体岁运」，再用条件式**（例如"在金气旺相的阶段"），禁止报具体年份。
4. 调养建议：饮食、作息、运动、情绪管理的具体方向。

【用户问题】{{question}}

重要：不预测疾病、寿数；任何身体提示均建议「咨询专业医师」。如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v2 (anti-hallucination)'
where id = 'bazi-health-v1';

update public.prompt_versions
set template = $$围绕印星、学堂、文昌、官杀格局判断学业潜力与适合方向，结合命局给出可操作的提升建议。

【分析路径】印星旺衰（学习耐力）；食伤（表达与创造）；官星（规则与考试）；文昌/学堂神煞（仅当 input 提供）；如 input 提供大运/流年，结合学业关键期。

【输出结构】
1. 学业基调：判断学习模式（理论型/应用型/创造型）与天赋方向。
2. 优势学科（2-3 项）：基于十神组合给出建议方向。
3. 关键阶段：**若 input 未提供大运/流年，请明确说「input 未提供具体岁运」并改用条件式**（"当遇到印星旺相的运势"），禁止报具体年份。
4. 学习方法建议：基于命局给出具体可操作的提升路径。

【用户问题】{{question}}

如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v2 (anti-hallucination)'
where id = 'bazi-study-v1';
