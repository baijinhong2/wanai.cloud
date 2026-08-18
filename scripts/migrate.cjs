// 建表迁移：创建 wanai_ 前缀的 6 张表（幂等，可重复执行）
const fs = require("fs");
const path = require("path");
const { getPool } = require("../lib/db.cjs");

// 加载 .env
(function loadEnv() {
  const p = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
})();

const DDL = `
-- 账号
create table if not exists wanai_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  nickname text,
  created_at timestamptz not null default now()
);

-- 会员/套餐
create table if not exists wanai_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wanai_users(id) on delete cascade,
  plan text not null default 'free',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 积分余额
create table if not exists wanai_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references wanai_users(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- 生成任务历史
create table if not exists wanai_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wanai_users(id) on delete cascade,
  external_task_id text,
  mode text not null,
  sub_mode text,
  prompt text,
  resolution text,
  duration integer,
  ratio text,
  status text not null default 'queued',
  video_url text,
  error text,
  credits_cost numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 充值记录
create table if not exists wanai_recharge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wanai_users(id) on delete cascade,
  amount numeric(10,2) not null,
  credits integer not null,
  method text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

-- 积分消耗记录
create table if not exists wanai_credit_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references wanai_users(id) on delete cascade,
  credits_used numeric not null,
  type text not null default 'generate',
  related_task_id uuid references wanai_generation_tasks(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

-- 索引
create index if not exists idx_wanai_memberships_user on wanai_memberships(user_id);
create index if not exists idx_wanai_recharge_user on wanai_recharge_records(user_id, created_at desc);
create index if not exists idx_wanai_credit_user on wanai_credit_records(user_id, created_at desc);
create index if not exists idx_wanai_tasks_user on wanai_generation_tasks(user_id, created_at desc);
`;

(async () => {
  const pool = getPool();
  try {
    await pool.query(DDL);
    const r = await pool.query(
      "select table_name from information_schema.tables where table_schema='public' and table_name like 'wanai_%' order by table_name"
    );
    console.log("迁移完成，现有 wanai_ 表：", r.rows.map((x) => x.table_name).join(", "));
  } catch (e) {
    console.error("迁移失败：", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
