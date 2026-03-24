# Xin AI Consultant

齐齐哈尔大学软件工程专业智能问答系统（本地模型优先版）。

本仓库目标非常明确：

- 让学生提问能得到自然、可执行、不过度模板化的回答
- 让知识库可以在后台直接上传并立即生效
- 让学校/团队可以低成本长期维护（默认本地模型，不依赖云端 Key）

---

## 你应该先读哪份文档

为避免文档过多，`docs/` 只保留 2 份核心文档：

1. [`docs/DEPLOYMENT_AND_USAGE_GUIDE.md`](./docs/DEPLOYMENT_AND_USAGE_GUIDE.md)  
   零基础部署与日常使用手册（从安装到排错，按步骤照做即可）
2. [`docs/BUILD_SIMILAR_SYSTEM_FROM_ZERO.md`](./docs/BUILD_SIMILAR_SYSTEM_FROM_ZERO.md)  
   教你从零做一个同类系统（从需求到上线）

如果你只是想先跑起来，请先看第 1 份。

---

## 系统能力概览

- 本地模型优先：默认通过 `Ollama + OpenAI Compatible API`
- 检索增强回答：TF-IDF + 关键词混合检索，命中资料优先依据资料
- 通用问题可答：未命中知识库时可给通用建议
- 管理后台完备：模型配置、连接测试、知识库上传、知识预览
- 文件上传即生效：支持 `.xlsx/.json/.csv`
- 缓存本地化：模型/依赖缓存统一写入项目目录，便于迁移和清理

---

## 技术架构

- 前端：Next.js 15 + TypeScript + TailwindCSS
- 后端：FastAPI + Uvicorn
- 检索：scikit-learn TF-IDF + jieba
- 模型：Ollama（本地）
- 数据文件：`backend/data/qa_knowledge.json`

---

## 目录结构（当前）

```text
Xin-AI-Consultant/
├─ frontend/                                # 前端项目
├─ backend/                                 # 后端项目
│  ├─ main.py                               # API 入口
│  ├─ llm.py                                # 模型调用与提示词
│  ├─ knowledge.py                          # 知识检索与导入
│  ├─ config.py                             # 运行时配置
│  ├─ preprocess.py                         # 原始数据预处理脚本
│  └─ data/
│     ├─ qa_knowledge.json                  # 当前知识库
│     └─ runtime_config.json                # 后台动态配置（运行中生成）
├─ scripts/                                 # 启动与运维脚本
│  ├─ start-local-ollama.ps1
│  ├─ pull-local-model.ps1
│  ├─ switch-to-local-model.ps1
│  ├─ run-backend-local.ps1
│  └─ run-frontend-local.ps1
├─ docs/
│  ├─ DEPLOYMENT_AND_USAGE_GUIDE.md         # 小白部署与使用手册
│  └─ BUILD_SIMILAR_SYSTEM_FROM_ZERO.md     # 从零搭建同类系统教程
├─ data-source/
│  └─ 需要准备的数据-吴迪260313.xlsx            # 原始数据素材
├─ .env.example
└─ README.md
```

---

## 快速开始（Windows，推荐）

## 1) 安装依赖软件

- Git
- Python 3.11+
- Node.js 20+
- Ollama（Windows 版）

## 2) 拉取项目并安装依赖

```powershell
git clone https://github.com/ChiTing111/Xin-AI-Consultant.git
cd Xin-AI-Consultant

py -m pip install -r backend/requirements.txt
cd frontend
npm install
cd ..
```

## 3) 初始化环境变量

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，至少确认：

- `ADMIN_PASSWORD` 已设置
- `LOCAL_LLM_BASE_URL=http://127.0.0.1:11435/v1`
- `LOCAL_LLM_MODEL=qwen2.5:3b`

## 4) 启动本地模型与服务

### 窗口 A：启动 Ollama

```powershell
.\scripts\start-local-ollama.ps1 -OllamaHost "127.0.0.1:11435"
```

### 窗口 B：首次拉取模型

```powershell
.\scripts\pull-local-model.ps1 -Model "qwen2.5:3b" -OllamaHost "127.0.0.1:11435"
```

### 窗口 C：启动后端

```powershell
.\scripts\run-backend-local.ps1
```

### 窗口 D：启动前端

```powershell
.\scripts\run-frontend-local.ps1
```

访问地址：

- 首页：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 健康检查：`http://127.0.0.1:8000/api/health`

---

## 管理后台功能说明

默认后台密码来自 `.env` 的 `ADMIN_PASSWORD`。

### 连接配置

- Base URL 默认：`http://127.0.0.1:11435/v1`
- 模型建议：`qwen2.5:3b`（速度优先）
- 点击“测试本地模型连接”验证可用性

### 知识库管理

- 支持上传：`.xlsx`、`.json`、`.csv`
- 上传后自动重建索引并立即生效
- 提供知识内容预览与关键词筛选

---

## API 一览（核心）

- `POST /api/chat`：非流式问答
- `POST /api/chat/stream`：SSE 流式问答
- `GET /api/health`：健康检查
- `POST /api/admin/login`：管理员登录
- `GET /api/admin/config`：读取配置
- `POST /api/admin/config`：保存配置
- `POST /api/admin/test-connection`：测试模型连接
- `POST /api/admin/upload-knowledge`：上传知识库
- `GET /api/admin/knowledge/preview`：知识预览

---

## 知识库格式建议

- JSON：数组，每条包含 `question`、`answer`
- CSV：建议表头 `question,answer`
- Excel：建议两列“问题”“答案”

系统会自动过滤无效数据（空值、无意义答案等）。

---

## 常见问题（高频）

### 1) 一直转圈或很慢

- 首次调用可能冷启动偏慢
- 先确认模型使用 `qwen2.5:3b`
- 检查后台“测试本地模型连接”是否成功
- 必要时重启顺序：Ollama -> 后端 -> 前端

### 2) 上传知识库后无效果

- 看后台返回条目数是否 > 0
- 在知识预览中搜索新问题
- 问题表述尽量接近知识库内容
- 按需下调检索阈值

### 3) 后台无法登录

- 检查 `.env` 的 `ADMIN_PASSWORD`
- 确认后端已重启（修改 `.env` 后建议重启服务）

---

## 学校部署建议（生产）

推荐部署拓扑：

- 前端（Next.js）：内网 `3000`
- 后端（FastAPI）：内网 `8000`
- 模型（Ollama）：内网 `11435`
- 反向代理（Nginx/Caddy）：对外 `80/443` + HTTPS

安全建议：

- 不直接暴露 8000/11435 到公网
- 后台密码必须强口令
- 启用定期备份（知识库和配置）

---

## 运维最小清单

每天：

- 检查首页是否可访问
- 检查后台模型连接测试
- 抽样提问 2-3 个

每周：

- 备份 `backend/data/qa_knowledge.json`
- 备份 `.env` 和 `runtime_config.json`
- 做一次恢复演练

---

## 推荐阅读路径

- 新手运维：先读 [`docs/DEPLOYMENT_AND_USAGE_GUIDE.md`](./docs/DEPLOYMENT_AND_USAGE_GUIDE.md)
- 开发扩展：再读 [`docs/BUILD_SIMILAR_SYSTEM_FROM_ZERO.md`](./docs/BUILD_SIMILAR_SYSTEM_FROM_ZERO.md)

---

如果你要把系统交给其他人维护，建议让接手人先完整跑一遍“启动 + 上传 + 验证 + 排错”，再进入服务器部署。
