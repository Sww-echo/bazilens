# Migrations & RLS Guidelines

> Source: TECH_SPEC §2 (DDL), §3 (quota RPC), §16.1 (privacy schema).

---

## Migration File Naming

```
supabase/migrations/
├── 0001_init.sql                  # profiles + charts + readings + usage_quotas + subscriptions + reports + prompt_versions + RLS + handle_new_user trigger
├── 0002_quota_rpc.sql              # consume_reading_quota + rollback_reading_quota
├── 0003_pdf_extensions.sql         # reports add columns（progress, sections, model_used, refund_*, etc.）
├── 0004_support_tickets.sql        # tickets table + SLA view
├── 0005_privacy_compliance.sql     # profiles status / consent / scheduled_delete_at + incidents table
├── ...
```

**约定**：
- 4 位数字前缀，全局递增（不按日期）
- 每个 migration **必须可重入**（`create table if not exists`，`alter table ... if not exists`）
- **绝不在 migration 内删用户数据**

---

## Required Tables (Sprint 1 完整清单)

| 表 | 用途 | RLS 策略 |
|----|------|---------|
| `profiles` | 用户业务字段（auth.users 1:1） | own profile（自己读写） |
| `charts` | 命盘记录 | own charts |
| `readings` | AI 解读会话 | read-only by user，写入仅 service_role |
| `usage_quotas` | 配额计数 | read-only by user |
| `subscriptions` | 订阅状态 | read-only by user |
| `reports` | PDF 详批 | read-only by user |
| `prompt_versions` | 提示词版本 | 任何人可读 active=true 的，写入仅 service_role |
| `support_tickets` | 客服工单 | own tickets，admin 全读 |
| `incidents` | 安全事件 | 仅 service_role |

---

## RLS Default Pattern

```sql
-- 启用 RLS
alter table {表名} enable row level security;

-- 用户对自己数据的 CRUD（默认）
create policy "own {表名}" on {表名}
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 只读 + service_role 写入（readings / reports）
create policy "read own {表名}" on {表名}
  for select using (auth.uid() = user_id);
-- 不写 insert/update policy → service_role 才能写
```

---

## Trigger 约定

新用户注册时自动建 profile + usage_quotas + subscriptions（free 档）：

```sql
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, display_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), 'zh-CN');
  insert into usage_quotas (user_id, period_start) values (new.id, date_trunc('month', now()));
  insert into subscriptions (user_id, tier) values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## Quota RPC（原子扣减）

详见 TECH_SPEC §3。关键点：

- 用 `for update` 行锁防并发竞争
- 跨月自动重置（`period_start` 检查）
- 返回结构：`{ allowed: bool, remaining: int, reason: text }`
- 失败原因 enum：`'quota_exceeded'`

回滚版本（fallback 用）：

```sql
create function rollback_reading_quota(p_user_id uuid) returns void as $$
begin
  update usage_quotas
    set readings_used = greatest(0, readings_used - 1),
        updated_at = now()
    where user_id = p_user_id;
end;
$$ language plpgsql security definer;
```

---

## Index 策略

每个用户数据表至少：

```sql
create index {表名}_user_created on {表名} (user_id, created_at desc);
```

PDF reports 额外加：

```sql
create index reports_status on reports (status) where status in ('paid','generating','failed');
create index reports_stripe_session on reports (stripe_checkout_session_id);
```

注销 cron 索引：

```sql
create index profiles_scheduled_delete on profiles (scheduled_delete_at)
  where status = 'pending_deletion';
```

---

## Forbidden Patterns

- ❌ 表上不开 RLS（即使是只读 service_role 写入的表，也要开 RLS + 显式 policy）
- ❌ 用 `auth.users.email` 作为关联键（用 `auth.users.id` UUID）
- ❌ 在 trigger 里调用 LLM / 外部 HTTP（trigger 必须快、可重试）
- ❌ migration 用 `drop table` / `truncate`（数据丢失风险）
- ❌ 不写索引就 `where status = ...`（命中全表扫）
