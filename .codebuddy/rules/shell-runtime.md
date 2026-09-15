---
description: 命令执行环境规则（Shell 识别、故障即停、禁止绕过沙箱）
alwaysApply: true
---

# Shell / Runtime Rules

## 1. 先识别环境

执行任何命令前，先确认：

- 当前 Shell 类型（bash / PowerShell / cmd）
- 包管理器是否可用（本项目为 `pnpm`）
- 运行环境是项目问题还是环境问题

不要假设命令一定可用。

## 2. 不得擅自修改 PATH

- 不得为了"让命令跑起来"注入、改写、追加 PATH
- 不得修改用户 shell 配置（`.bashrc` / `.zshrc` / profile）
- 不得写入全局环境变量

## 3. 引导失败即停

如果 shell 引导阶段就报错，例如：

```text
dirname: command not found
cd: null directory
command not found: pnpm
```

处理顺序：

1. 停止后续所有依赖该 shell 的命令
2. 不要连续重试同一条失败命令
3. 不要换一种写法绕过
4. 明确报告为环境故障

## 4. 沙箱拦截不得绕过

遇到安全拦截（例如 Security Center 拦截 `wsl.exe`）：

- 不得尝试绕过、替换调用方式、换壳执行
- 不得改用等价命令规避黑名单
- 直接报告被拦截的命令与拦截层

## 5. 区分两类错误

| 类型 | 判定 | 处理 |
| --- | --- | --- |
| 项目错误 | 命令能跑，输出是编译/类型/lint 错误 | 正常修复 |
| 环境错误 | 命令根本没跑起来 / shell 引导失败 | 停止并报告 BLOCKED |

不要把环境错误伪装成项目错误去"修代码"。

## 6. 结果纪律

- 不得声称某命令成功，除非真实执行并得到成功输出
- 不得声称已生成某文件，除非文件真实存在
- 生成类操作（如 `supabase gen types`）失败时，报告 BLOCKED，不手写替代产物
- exit code 0 但输出为空/异常时，同样视为可疑，需要复核
