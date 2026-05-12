-- Real reading scene prompts — replaces the one-line placeholders from 0005.
-- Source: src/utils/ai/aiPrompts.ts (BAZI_AI_PROMPTS.single, preserved from
-- mingyu engine). The system role + safety rules are still hardcoded in
-- supabase/functions/_shared/prompts.ts → SYSTEM_PROMPT_FORTUNE_SCHOLAR; this
-- migration only updates the user-prompt task instructions.
--
-- Architecture reminder (reading/index.ts):
--   final_user_message = cachePrefix (chart facts JSON) \n\n rendered_template
-- So templates here do NOT need to repeat chart data — focus on TASK and
-- OUTPUT STRUCTURE. {{question}} interpolation supplies the user's optional
-- follow-up question.

update public.prompt_versions
set template = $$判断命局更适合守成、开拓、技术、管理还是经营，再说明当前阶段的赚钱方式、职业方向和风险点。

【分析路径】先判断日主旺衰与月令喜忌；再看官杀印比食伤十神格局；最后结合大运与流年取用，落到具体职业类型。

【输出结构】
1. 核心判断：用1-2句给出适合的工作模式与主线方向。
2. 关键支撑（2-4 条）：每条围绕一个十神或宫位展开，说明为什么。
3. 当前阶段：基于大运判断未来 3-5 年的赚钱节奏与机会窗口。
4. 风险与建议：指出最容易翻车的1-2点，给出可执行的应对。

【用户问题】{{question}}

如未提供问题，请直接按上面四个部分输出整体事业解读。$$,
    notes = 'real-prompt-v1 (from mingyu ai-career)'
where id = 'bazi-career-v1';

update public.prompt_versions
set template = $$判断财运应期，说明财更容易在哪些阶段、年份或环境里起来，再指出机会点和破财情形。

【分析路径】先看正财偏财在原局的旺衰与位置；再判断财库、食伤生财、官星护财等结构；最后结合大运流年的应期。

【输出结构】
1. 财运基调：判断聚财还是流水财、求财方式、命局承财量。
2. 应期分析（2-4 条）：分别指出最有机会的大运/流年、季节或方位。
3. 破财风险：哪些组合最容易耗财（劫财、伤官见官等），如何规避。
4. 实操建议：与命局匹配的财源类型、合作模式。

【用户问题】{{question}}

如未提供问题，请直接给出整体财运结构。$$,
    notes = 'real-prompt-v1 (from mingyu ai-wealth-timing)'
where id = 'bazi-wealth-v1';

update public.prompt_versions
set template = $$围绕配偶星、夫妻宫和相处模式，判断感情优势、隐患与关系节奏，再说明适合的对象、容易推进的阶段和经营建议。

【分析路径】配偶星位置、是否被合冲刑害；日支夫妻宫五行喜忌；桃花/红艳/天乙等神煞；大运对配偶星的影响。

【输出结构】
1. 关系基调：判断感情节奏（早婚/晚婚/聚少离多）与匹配类型。
2. 配偶画像（2-3 点）：性格倾向、家庭背景、相处特质。
3. 应期：何时容易遇到、何时容易推进、何时容易出问题。
4. 经营建议：基于命局相处模式给出具体可执行的建议。

【用户问题】{{question}}

注意：避免使用「克夫」「克妻」等绝对断言。如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v1 (from mingyu ai-marriage)'
where id = 'bazi-marriage-v1';

update public.prompt_versions
set template = $$判断最需要注意的身体倾向与生活习惯问题，说明风险主要落在哪些系统或体质失衡上，再给出饮食、作息、运动建议。

【分析路径】五行旺衰判断脏腑偏向；强弱过度的五行 → 对应系统的潜在压力；调候用神缺失 → 寒热燥湿失衡；运势节奏 → 高压时段。

【输出结构】
1. 体质基调：判断五行偏旺/偏弱主体倾向。
2. 关注方向（2-3 个）：每个对应身体系统，说明常见表现。
3. 时间窗口：哪些大运/流年最需要警觉。
4. 调养建议：饮食、作息、运动、情绪管理的具体方向。

【用户问题】{{question}}

重要：不预测疾病、寿数；任何身体提示均建议「咨询专业医师」。如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v1 (from mingyu ai-health)'
where id = 'bazi-health-v1';

update public.prompt_versions
set template = $$围绕印星、学堂、文昌、官杀格局判断学业潜力与适合方向，结合大运给出具体阶段建议。

【分析路径】印星旺衰（学习耐力）；食伤（表达与创造）；官星（规则与考试）；文昌/学堂神煞；当前大运对学业六亲的影响。

【输出结构】
1. 学业基调：判断学习模式（理论型/应用型/创造型）与天赋方向。
2. 优势学科（2-3 项）：基于十神组合给出建议方向。
3. 关键阶段：哪些大运/流年是学业突破窗口或瓶颈期。
4. 学习方法建议：基于命局给出具体可操作的提升路径。

【用户问题】{{question}}

如未提供问题，请直接整体解读。$$,
    notes = 'real-prompt-v1 (extended from mingyu pattern)'
where id = 'bazi-study-v1';
