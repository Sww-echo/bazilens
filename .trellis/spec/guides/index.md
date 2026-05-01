# Thinking Guides

> **Purpose**: Expand your thinking to catch things you might not have considered.

---

## Why Thinking Guides?

**Most bugs and tech debt come from "didn't think of that"**, not from lack of skill:

- Didn't think about what happens at layer boundaries → cross-layer bugs
- Didn't think about code patterns repeating → duplicated code everywhere
- Didn't think about edge cases → runtime errors
- Didn't think about future maintainers → unreadable code

These guides help you **ask the right questions before coding**.

---

## Available Guides

### Thinking guides (general)

| Guide | Purpose | When to Use |
|-------|---------|-------------|
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | Identify patterns and reduce duplication | When you notice repeated patterns |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Think through data flow across layers | Features spanning multiple layers |

### Project-specific guides (BaziLens)

| Guide | Purpose | When to Read |
|-------|---------|--------------|
| [Product Overview](./product-overview.md) | 产品定位 / 三档功能 / Sprint 砍刀清单 | **每个新任务前必读** |
| [Sprint Roadmap](./sprint-roadmap.md) | Sprint 0/1/2/3+ 范围与 DoD | 接到任务前对一下范围 |
| [Privacy & PII](./privacy-pii.md) | PII 加密 / DeepSeek 隔离 / GDPR / 注销 | 任何接触 PII 字段时 |
| [Apple Review](./apple-review.md) | 文案禁用词 / 免责声明 / 灰名单 | 写任何 UI / 邮件 / App 描述时 |
| [AI Quality Eval](./ai-quality-eval.md) | 红线检测 / golden set / 评估闭环 | 写 prompt / 改 prompt_versions 时 |
| [Customer Support](./customer-support.md) | 退款矩阵 / 工单分类 / 危机响应 | 涉及退款 / 投诉处理时 |

---

## Quick Reference: Thinking Triggers

### When to Think About Cross-Layer Issues

- [ ] Feature touches 3+ layers (API, Service, Component, Database)
- [ ] Data format changes between layers
- [ ] Multiple consumers need the same data
- [ ] You're not sure where to put some logic

→ Read [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md)

### When to Think About Code Reuse

- [ ] You're writing similar code to something that exists
- [ ] You see the same pattern repeated 3+ times
- [ ] You're adding a new field to multiple places
- [ ] **You're modifying any constant or config**
- [ ] **You're creating a new utility/helper function** ← Search first!

→ Read [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md)

---

## Pre-Modification Rule (CRITICAL)

> **Before changing ANY value, ALWAYS search first!**

```bash
# Search for the value you're about to change
grep -r "value_to_change" .
```

This single habit prevents most "forgot to update X" bugs.

---

## How to Use This Directory

1. **Before coding**: Skim the relevant thinking guide
2. **During coding**: If something feels repetitive or complex, check the guides
3. **After bugs**: Add new insights to the relevant guide (learn from mistakes)

---

## Contributing

Found a new "didn't think of that" moment? Add it to the relevant guide.

---

**Core Principle**: 30 minutes of thinking saves 3 hours of debugging.
