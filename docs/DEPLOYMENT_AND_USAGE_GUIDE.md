# Xin AI Consultant 部署与使用手册（零基础超详细版）

> 适用对象：没有开发经验、没有部署经验、第一次接手本系统的同学/老师。  
> 阅读目标：你读完并照做后，必须能独立完成「安装 -> 启动 -> 使用 -> 更新知识库 -> 排错 -> 交接」。

---

## 0. 先看这 3 个最终目标

你只要完成下面三件事，就算接手成功：

- 能打开首页并对话：`http://localhost:3000`
- 能登录后台并上传知识库：`http://localhost:3000/admin`
- 知道系统出问题时先看哪里、怎么恢复

---

## 1. 系统是什么（1 分钟理解）

这个项目是一个“校园专业问答系统”，由 4 个部分组成：

1. 前端页面（`frontend/`）  
   学生和管理员看到的界面都在这里。
2. 后端接口（`backend/`）  
   负责检索知识库、调用本地大模型、返回答案。
3. 本地模型服务（Ollama）  
   负责真正生成语言回答。
4. 知识库数据（`backend/data/qa_knowledge.json`）  
   你的问答素材，后台上传后会更新这里。

---

## 2. 你需要准备什么

### 2.1 电脑与权限要求

- Windows 10 / 11
- 有管理员权限（可安装软件）
- D 盘有至少 20GB 空闲（模型和缓存会占空间）
- 网络可访问 GitHub 与 Ollama 官网

### 2.2 必装软件清单

- Git
- Python 3.11+
- Node.js 20+
- Ollama（本地模型运行器）

---

## 3. 软件安装（完全新手照抄）

### 3.1 安装 Git

1. 打开 [Git for Windows](https://git-scm.com/download/win)
2. 下载并安装（默认选项即可）
3. 打开 PowerShell，输入：

```powershell
git --version
```

看到版本号即成功。

### 3.2 安装 Python

1. 打开 [Python Windows 下载页](https://www.python.org/downloads/windows/)
2. 安装 3.11 或更高
3. 勾选 **Add Python to PATH**
4. 验证：

```powershell
py --version
```

### 3.3 安装 Node.js

1. 打开 [Node.js 官网](https://nodejs.org/)
2. 安装 LTS 版本（建议 20+）
3. 验证：

```powershell
node -v
npm -v
```

### 3.4 安装 Ollama

1. 打开 [Ollama Windows 下载页](https://ollama.com/download/windows)
2. 安装完成后先不用启动聊天，继续下一步

---

## 4. 下载项目代码

打开 PowerShell，执行：

```powershell
cd D:\vibecoding
git clone https://github.com/ChiTing111/Xin-AI-Consultant.git
cd Xin-AI-Consultant
```

你应该能看到目录：`backend`、`frontend`、`scripts`、`docs`。

---

## 5. 第一次安装依赖

### 5.1 安装后端依赖

在项目根目录执行：

```powershell
py -m pip install -r backend/requirements.txt
```

### 5.2 安装前端依赖

```powershell
cd frontend
npm install
cd ..
```

---

## 6. 初始化配置（.env）

### 6.1 复制模板

```powershell
Copy-Item .env.example .env
```

### 6.2 打开 `.env` 至少确认这几项

- `ADMIN_PASSWORD`：改成你自己的后台密码
- `LOCAL_LLM_BASE_URL=http://127.0.0.1:11435/v1`
- `LOCAL_LLM_MODEL=qwen2.5:3b`

> 推荐先用 `qwen2.5:3b`，速度更友好；机器性能强再切 `qwen2.5:7b`。

---

## 7. 启动系统（严格按顺序）

你需要开 4 个 PowerShell 窗口，全部先 `cd` 到项目根目录：

```powershell
cd D:\vibecoding\Xin-AI-Consultant
```

### 窗口 A：启动 Ollama 服务

```powershell
.\scripts\start-local-ollama.ps1 -OllamaHost "127.0.0.1:11435"
```

看到类似 `Listening on 127.0.0.1:11435` 就是成功。  
这个窗口不要关。

### 窗口 B：首次拉取模型（第一次必须）

```powershell
.\scripts\pull-local-model.ps1 -Model "qwen2.5:3b" -OllamaHost "127.0.0.1:11435"
```

首次可能几分钟，拉完以后平时不用每天重复拉取。

### 窗口 C：启动后端

```powershell
.\scripts\run-backend-local.ps1
```

看到 `Uvicorn running on http://0.0.0.0:8000` 就是成功。  
这个窗口不要关。

### 窗口 D：启动前端

```powershell
.\scripts\run-frontend-local.ps1
```

看到 `Local: http://localhost:3000` 或 `Ready` 就是成功。  
这个窗口不要关。

---

## 8. 启动后验收（必须做）

### 8.1 页面验收

- 打开 `http://localhost:3000`，确认首页可访问
- 打开 `http://localhost:3000/admin`，确认后台登录页可访问

### 8.2 接口验收

新开一个终端，执行：

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing
```

返回状态码 200 即后端正常。

### 8.3 对话验收

- 问一个校内知识问题（例如课程安排）
- 再问一个通用问题（例如如何做复习计划）
- 能稳定返回文字，不应一直转圈

---

## 9. 管理后台使用指南

### 9.1 登录后台

1. 访问 `http://localhost:3000/admin`
2. 输入 `.env` 里的 `ADMIN_PASSWORD`

### 9.2 连接配置

在“连接配置”页确认：

- Base URL：`http://127.0.0.1:11435/v1`
- 模型：`qwen2.5:3b`（或你实际拉取的模型）

然后点击“测试本地模型连接”，必须显示成功。

### 9.3 上传知识库（核心操作）

1. 切到“知识库”页签
2. 上传 `.xlsx` / `.json` / `.csv`
3. 点击“上传并立即生效”
4. 看到“已生效条目数”后再去首页测试

### 9.4 知识库文件建议格式

- JSON：数组，每项包含 `question` 和 `answer`
- CSV：有表头，建议 `question,answer`
- Excel：建议两列“问题”“答案”

---

## 10. 每日使用 SOP（值班版）

每天只做这 5 步：

1. 启动 Ollama：`.\scripts\start-local-ollama.ps1 -OllamaHost "127.0.0.1:11435"`
2. 启动后端：`.\scripts\run-backend-local.ps1`
3. 启动前端：`.\scripts\run-frontend-local.ps1`
4. 首页提问 1 次
5. 后台“测试本地模型连接”1 次

---

## 11. 常见故障与处理（新手必看）

### 11.1 页面打不开

现象：`localhost:3000` 打不开  
处理：

1. 看前端窗口是否仍在运行
2. 不在运行就重开：`.\scripts\run-frontend-local.ps1`
3. 若提示端口占用，结束占用进程后再启动

### 11.2 后台提示模型连接失败

处理顺序：

1. 确认窗口 A 的 Ollama 服务未关闭
2. 重新执行模型拉取检查：
   `.\scripts\pull-local-model.ps1 -Model "qwen2.5:3b" -OllamaHost "127.0.0.1:11435"`
3. 确认后台 Base URL 正确
4. 按顺序重启：Ollama -> 后端 -> 前端

### 11.3 回答很慢

常见原因是模型太大或首次冷启动。  
处理：

1. 优先用 `qwen2.5:3b`
2. 连续问 2-3 次，冷启动后会改善
3. 仍然慢就重启 Ollama

### 11.4 上传后没生效

处理：

1. 看后台提示条目数是否 > 0
2. 用后台知识预览搜索是否存在新问题
3. 问题描述尽量贴近知识库提法
4. 必要时降低检索阈值后重试

---

## 12. 备份与恢复（非常重要）

### 12.1 必须备份的文件

- `backend/data/qa_knowledge.json`
- `.env`
- `backend/data/runtime_config.json`（若存在）

### 12.2 建议策略

- 每天自动备份一次
- 至少保留最近 7 天版本
- 每周做一次恢复演练（确认备份可用）

---

## 13. 学校部署建议（实战简版）

如果要给全校访问，建议服务器结构：

- 前端：`127.0.0.1:3000`
- 后端：`127.0.0.1:8000`
- 模型：`127.0.0.1:11435`
- 反向代理：Nginx/Caddy 对外暴露 80/443

要点：

- 对外只开放 80/443，不直接暴露 8000 和 11435
- 管理员密码必须强口令
- 定期备份知识库和配置

---

## 14. 交接验收单（建议逐条打钩）

接手人必须能够独立完成：

- [ ] 启动 Ollama、后端、前端
- [ ] 登录后台并测试模型连接
- [ ] 上传一份知识库并生效
- [ ] 处理一次“连接失败”故障
- [ ] 完成一次备份和恢复验证

---

## 15. 你卡住时怎么求助

建议按这个格式发给维护人，方便快速定位：

1. 你执行的命令
2. 报错截图或完整报错文本
3. 当前在第几步（例如本手册第 7 步）
4. 前端/后端/Ollama 哪个窗口异常

这样通常能最快得到可执行修复建议。

