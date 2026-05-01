<p align="center">
    <a href="https://linux.do" alt="LINUX DO">
        <img
            src="https://img.shields.io/badge/LINUX-DO-FFB003.svg?logo=data:image/svg%2bxml;base64,DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik00Ni44Mi0uMDU1aDYuMjVxMjMuOTY5IDIuMDYyIDM4IDIxLjQyNmM1LjI1OCA3LjY3NiA4LjIxNSAxNi4xNTYgOC44NzUgMjUuNDV2Ni4yNXEtMi4wNjQgMjMuOTY4LTIxLjQzIDM4LTExLjUxMiA3Ljg4NS0yNS40NDUgOC44NzRoLTYuMjVxLTIzLjk3LTIuMDY0LTM4LjAwNC0yMS40M1EuOTcxIDY3LjA1Ni0uMDU0IDUzLjE4di02LjQ3M0MxLjM2MiAzMC43ODEgOC41MDMgMTguMTQ4IDIxLjM3IDguODE3IDI5LjA0NyAzLjU2MiAzNy41MjcuNjA0IDQ2LjgyMS0uMDU2IiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5vZGQ7ZmlsbDojZWNlY2VjO2ZpbGwtb3BhY2l0eToxIi8+PHBhdGggZD0iTTQ3LjI2NiAyLjk1N3EyMi41My0uNjUgMzcuNzc3IDE1LjczOGE0OS43IDQ5LjcgMCAwIDEgNi44NjcgMTAuMTU3cS00MS45NjQuMjIyLTgzLjkzIDAgOS43NS0xOC42MTYgMzAuMDI0LTI0LjM4N2E2MSA2MSAwIDAgMSA5LjI2Mi0xLjUwOCIgc3R5bGU9InN0cm9rZTpub25lO2ZpbGwtcnVsZTpldmVub2RkO2ZpbGw6IzE5MTkxOTtmaWxsLW9wYWNpdHk6MSIvPjxwYXRoIGQ9Ik03Ljk4IDcwLjkyNmMyNy45NzctLjAzNSA1NS45NTQgMCA4My45My4xMTNRODMuNDI2IDg3LjQ3MyA2Ni4xMyA5NC4wODZxLTE4LjgxIDYuNTQ0LTM2LjgzMi0xLjg5OC0xNC4yMDMtNy4wOS0yMS4zMTctMjEuMjYyIiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5kZDtmaWxsOiNmOWFmMDA7ZmlsbC1vcGFjaXR5OjEiLz48L3N2Zz4=" /></a>
</p>

# 命语

八字命理 · 紫微斗数 · 六爻卜卦 · 梅花易数 · 奇门遁甲 · 大六壬 · 塔罗牌 · 灵签 —— AI 提示词生成工具。

输入出生信息或占卜问题，生成专业排盘数据与结构化提示词，可一键复制或分享至其他 AI 平台。

## 核心功能

### 命理排盘

- **八字排盘**：四柱八字、十神、藏干、神煞、大运流年
- **紫微斗数排盘**：基于 iztro 库的完整紫微盘，支持单盘/合盘分析

### 占卜术数

- **六爻卜卦**：京房八宫法完整排盘，含纳甲、六亲、六神、世应、动变、空亡
- **梅花易数**：时间起卦 / 数字起卦 / 随机起卦 / 外应起卦，含体用生克与四时旺衰
- **奇门遁甲**：时家奇门转盘法排盘，含天地人神四盘、值符值使、格局标签、宫位洞察
- **大六壬**：天盘/四课/三传/月将/贵人/旬空完整排盘，含格局标签与断课模板
- **塔罗牌**：78 张完整塔罗（大阿卡纳 + 四组小阿卡纳），9 种牌阵，洗牌抽牌逻辑
- **三山国王灵签**：100 签灵签，含签题、签诗、典故故事及十二分类详细解签

### AI 提示词

- 结构化提示词生成，支持婚姻、事业、财运、健康、学业等场景
- 八字/紫微/占卜三种模式，各自适配提示词模板
- 问题灵感库：感情/事业/财富/人际/成长五大分类快速选填

## 八字分析引擎

| 模块 | 文件 | 说明 |
|------|------|------|
| 旺衰得分 | `baziStrengthAnalyzer.ts` | 五维评分体系（月令+会局+根气+帮扶+克制） |
| 格局判定 | `baziPatternStrategy.ts` | 透干优先取格、建禄/阳刃/专旺/从格等 |
| 用神推导 | `baziUsefulGodStrategy.ts` | 扶抑→调候→病药→通关四层决策链 |
| 喜忌规则 | `baziUsefulGodRules.ts` | 规则引擎驱动的喜忌五行/十神匹配 |
| 穷通宝鉴 | `baziTherapeuticRules.ts` | 十日干×十二月令 × 700+ 条精细规则 |
| 病药/通关 | `baziEnhancement.ts` | 病药法、通关法、寒热燥湿分析 |
| 经典格局 | `baziEnhancement.ts` | 渊海子平格局：阳刃格、建禄格、曲直格等 + 化气格 |
| 神煞互参 | `baziShenSha.ts` | 40+ 神煞 + 十神互参（桃花+七杀、羊刃驾杀等） |
| 规则匹配 | `baziRuleMatcher.ts` | 通用规则引擎（天干/地支/五行/十神/柱位多维匹配） |
| 提示词拼装 | `baziPromptEnhancement.ts` | 场景化维度开关 + 结构化输出 |

## 占卜引擎

| 模块 | 文件 | 说明 |
|------|------|------|
| 占卜调度 | `lib/divination/engine.ts` | 统一调度六大算法，生成占卜会话与提示词 |
| 占卜配置 | `lib/divination/config.ts` | 六种占卜类型、牌阵、起卦方式、断课模板 |
| 六爻排盘 | `lib/divination/algorithms/liuyao.ts` | 京房八宫法，纳甲/六亲/六神/世应/动变/空亡 |
| 梅花排盘 | `lib/divination/algorithms/meihua.ts` | 四类起卦 + 体用生克 + 四时旺衰 |
| 奇门排盘 | `lib/divination/algorithms/qimen.ts` | 时家奇门转盘法，天地人神四盘 + 格局标签 |
| 大六壬排盘 | `lib/divination/algorithms/liuren.ts` | 四课三传 + 月将贵人 + 格局标签 |
| 灵签求签 | `lib/divination/algorithms/ssgw.ts` | 三山国王 100 签，模拟真实求签 |
| 塔罗牌 | `utils/tarot.ts` | 78 张牌 + 9 种牌阵 + 洗牌抽牌 |
| 六十四卦 | `utils/hexagram-data.ts` | 八宫卦序 + 爻辞 + 卦象数据 |
| 奇门引导 | `utils/qimen-guidance.ts` | 按问题类型推荐参考宫位与优先级 |
| 占卜辅助 | `utils/divination-helpers.ts` | 六爻格式化/验证/解读 + 梅花体用分析 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5.9 |
| 构建 | Vite 7 |
| 路由 | React Router 7 |
| 历法计算 | tyme4ts / iztro |
| 测试 | Node.js 原生测试运行器 |

## 项目结构

```
src/
├── components/              # 通用 UI 组件
│   ├── DivinationPanel.tsx        # 占卜面板（选择方式/填写问题/展示结果）
│   ├── BaziFortuneTools.tsx       # 八字运势选择器
│   └── QuestionInspirationModal.tsx # 问题灵感弹窗
├── composables/             # 组合式函数（hooks）
├── config/                  # 应用配置
│   ├── divination-data.ts         # 天干地支/纳甲/八宫/节气等术数基础数据
│   └── meihua-omens.ts            # 梅花外应方位/人物/动物映射
├── constants/               # 常量定义
├── data/                    # 静态数据
│   └── chinaBirthPlaceTree.json   # 出生地省市数据
├── lib/                     # 核心库
│   ├── divination/                # 占卜引擎
│   │   ├── engine.ts              # 占卜调度核心
│   │   ├── config.ts              # 占卜配置
│   │   ├── inspiration.ts         # 问题灵感库
│   │   └── algorithms/            # 六大算法
│   │       ├── liuyao.ts          # 六爻
│   │       ├── meihua.ts          # 梅花易数
│   │       ├── qimen.ts           # 奇门遁甲
│   │       ├── liuren.ts          # 大六壬
│   │       └── ssgw.ts           # 灵签
│   ├── ziwei-prompt-copy.ts       # 紫微提示词角色
│   ├── ziwei-prompts.ts          # 紫微提示词构建
│   └── full-chart-engine.ts       # 全盘引擎（八字+紫微+合盘）
├── pages/                   # 页面
│   ├── InputPage.tsx              # 信息输入 / 占卜入口
│   ├── ResultPage.tsx             # 结果展示（八字/紫微/占卜）
│   ├── RecordsPage.tsx           # 历史记录
│   ├── BirthTimeReversePage.tsx   # 时辰反推
│   └── TutorialPage.tsx          # 引导页
├── services/                # 服务层
│   └── prompts/shared/question-analyzer.ts  # 问题类型分析
├── types/                   # 类型定义
│   └── divination.ts             # 占卜完整类型系统
├── utils/                   # 工具函数
│   ├── bazi/                     # 八字核心引擎（31 个文件）
│   ├── tarot.ts                  # 塔罗牌数据与逻辑
│   ├── hexagram-data.ts          # 六十四卦数据
│   ├── ssgw-data.ts              # 灵签数据
│   ├── divination-helpers.ts     # 占卜通用辅助
│   ├── qimen-guidance.ts         # 奇门宫位引导
│   └── timeManager.ts            # 占卜时间管理
└── workers/                 # Web Worker
```

## 启动

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 测试

```bash
npm test
```