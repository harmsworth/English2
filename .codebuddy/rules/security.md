---
description: English2 密钥与数据安全规则（禁止 service_role / 禁止泄露 secret）
alwaysApply: true
---

# Security Rules

## 前端绝对禁止

前端代码、构建产物、Git 仓库中不得出现：

- `service_role` key
- 数据库密码
- secret key
- private key
- access token
- refresh token
- 任何可用于绕过 RLS 的凭据

只允许使用：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

这两个值本身也是公开的 anon/publishable key，不代表可以放松 RLS。

## 环境变量

- 只提交 `.env.example`，不提交 `.env.local` / `.env`
- `.env.local` 已在 `.gitignore` 中，不得从 `.gitignore` 移除
- 新增环境变量必须同步更新 `.env.example`，但只写占位符，不写真值

## 输出纪律

不得在以下位置输出真实 secret：

- 日志
- 终端命令回显
- 聊天回复
- 截图
- 代码注释
- 错误信息
- 提交信息

## RLS

- 不得在前端尝试关闭或绕过 RLS
- 不得修改数据库 RLS 策略，除非用户当前任务明确授权
- 服务端 RPC 的 security 属性不得擅自改动

## 报告纪律

发现疑似密钥泄漏必须立即报告，不得自行"清理后继续"。
