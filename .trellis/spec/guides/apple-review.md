# Apple App Store Review Guidelines

> 命理类 App 在 App Store 被打回率极高。源：PLAN §11。
> Sprint 1 不上 App，但**所有文案 / UI 从 Day 1 就要按 Apple 标准写**，到 Sprint 2 末再交审。

---

## 定位策略（核心）

❌ "Fortune Telling App" / "Predict your future" / "命理预测"
✅ **"Traditional Chinese Astrology Study & Reference Tool"**

把自己包装成**学习工具**，不是占卜工具。

---

## 全局禁用词清单

写任何 UI 文案 / App 描述 / 截图 / 邮件模板时**禁止**使用：

- `predict` / `will happen` / `accurate` / `100%` / `guarantee`
- `fortune telling` / `prediction` / `forecast`
- `lucky number` / `lucky day` / `lucky color`（Apple 视为博彩诱导）
- `cure` / `heal` / `disease` / `treatment`（医疗声明，触发 Guideline 1.4.1）
- `destiny` / `fate`（含蓄替代为 `tendency` / `potential`）

**安全词**：
- `traditional study` / `cultural heritage` / `classical metaphysics`
- `for entertainment and reference only`
- `exploration` / `self-reflection` / `cultural understanding`
- `tendency` / `potential` / `inclination`
- `based on traditional Chinese theory`

---

## 必备免责声明

**应用内**（onboarding 第一屏强制确认 + 每次解读结果末尾）：
```
本工具基于传统命理研究，仅供文化参考与个人探索，
不构成医疗、法律、财务、投资或心理咨询建议。
```

**英文版**：
```
This app is a traditional Chinese astrology study and reference
tool for educational and entertainment purposes only. Results do
not constitute medical, legal, financial, or psychological advice.
```

PDF 末页 + 每条 reading 自动注入。

---

## 灰名单（Sprint 1 不要做）

以下功能极易触发 Apple 审核问题，**Month 4+ 验证商业可行后再加**：
- 每日运势推送通知（5.0 Legal + 4.5.4 Push 双重风险）
- "Lucky Number / Lucky Day" 类输出
- 与彩票 / 投资相关的解读场景
- 健康 / 疾病预测
- 命理排行榜 / 兼容性匹配（社交属性触发更多审核）

---

## App Store Connect 配置（Sprint 2 上 App 时用）

| 项 | 值 |
|---|----|
| Primary Category | **Reference** |
| Secondary Category | Education |
| Age Rating | 4+ |
| 区域下架 | 沙特 / UAE / 巴基斯坦 / 伊朗（已被整体下架） |

---

## 提审 Pre-flight

详见 PLAN §11.7。关键 9 项不能漏：
1. 5 张主流程截图（无禁用词）
2. App Preview 视频（30s）
3. Demo 账号
4. Test Notes（解释"研究工具"定位）
5. 隐私政策 URL 可访问
6. 服务条款 URL 可访问
7. 排除高危国家
8. onboarding 强制免责确认
9. IAP 商品配置

---

## 被拒应对剧本

| 拒绝原因 | 应对 |
|---------|------|
| 4.0 Design / Spam | 强调差异化（深度命理 vs 占星 App）+ review video |
| 1.4.1 Safety / Physical Harm | 移除任何健康相关词；强化免责 |
| 4.3 Spam（命理 App 太多） | 提供原创算法证明（八字引擎 31 文件）+ 学术参考 |
| 5.1.1 Data Collection | 完善隐私政策；最小化采集 |
| 2.1 Information Needed | 补充 Test Notes，演示视频 |
| 5.0 Legal | 强化 reference / study 定位；删除 prediction 用词 |
