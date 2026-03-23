# Xin AI Consultant

齐齐哈尔大学软件工程专业智能问答系统（本地模型版）。

本项目聚焦三件事：
- 学生提问时得到自然、可用、不过度模板化的回答
- 知识库可在管理后台直接上传并即时生效
- 全链路支持本地部署（默认 Ollama），减少云端 API 成本

---

## 功能亮点

- 本地模型优先：默认走 `Ollama + OpenAI 兼容接口`，不依赖远程 API Key
- 检索 + 生成：TF-IDF + 关键词混合检索，命中知识库时优先依据资料回答
- 非知识库问题可答：未命中知识库时，模型仍可给出通用建议
- 管理后台可维护：模型配置、连接测试、知识库上传、知识预览、阈值调节
- 知识库即时更新：支持 `.xlsx/.json/.csv` 上传后立即重建索引
- 项目内缓存：模型与依赖缓存落在项目目录，便于迁移和清理

---

## 技术栈

- 前端：Next.js 15 + TypeScript + TailwindCSS
- 后端：FastAPI + Uvicorn
- 模型：Ollama（OpenAI Compatible）
- 检索：scikit-learn TF-IDF + jieba
- 数据：`backend/data/qa_knowledge.json`

---

## 目录结构

```text
demo2-QA-system/
├─ frontend/                         # Next.js 前端
├─ backend/                          # FastAPI 后端
│  ├─ main.py                        # API 入口
│  ├─ llm.py                         # 模型调用逻辑
│  ├─ knowledge.py                   # 知识库导入与检索
│  ├─ config.py                      # 运行时配置
│  └─ data/qa_knowledge.json         # 当前知识库
├─ start-local-ollama.ps1            # 启动本地 Ollama（项目缓存）
├─ pull-local-model.ps1              # 拉取本地模型（项目缓存）
├─ run-backend-local.ps1             # 启动后端（项目缓存）
├─ run-frontend-local.ps1            # 启动前端（项目缓存）
├─ switch-to-local-model.ps1         # 切换到本地模型配置
├─ LOCAL_MODEL_SETUP.md              # 本地模型启动说明（简版）
└─ AGENT_HANDOVER_AND_SCHOOL_DEPLOYMENT.md  # 交接与学校部署手册（完整版）
```

---

## 快速开始（Windows）

## 1) 环境准备

- Python 3.11+
- Node.js 20+
- npm 10+
- Ollama（Windows）：<https://ollama.com/download/windows>

## 2) 克隆与安装依赖

```powershell
git clone https://github.com/ChiTing111/Xin-AI-Consultant.git
cd Xin-AI-Consultant

py -m pip install -r backend/requirements.txt
cd frontend
npm install
cd ..
```

## 3) 配置环境变量

将 `.env.example` 复制为 `.env`，按需修改管理员密码：

```powershell
Copy-Item .env.example .env
```

## 4) 启动本地模型服务

```powershell
.\start-local-ollama.ps1 -OllamaHost "127.0.0.1:11435"
```

拉取模型（建议先用 3B 版本，响应更快）：

```powershell
.\pull-local-model.ps1 -Model "qwen2.5:3b" -OllamaHost "127.0.0.1:11435"
```

## 5) 启动后端与前端

```powershell
.\run-backend-local.ps1
.\run-frontend-local.ps1
```

访问：

- 首页：<http://localhost:3000>
- 管理后台：<http://localhost:3000/admin>

---

## 管理后台使用

默认管理员密码读取 `.env` 中的 `ADMIN_PASSWORD`。

### 连接配置

- `Base URL`：默认 `http://127.0.0.1:11435/v1`
- `模型`：可选 `qwen2.5:3b` / `qwen2.5:7b` / `llama3.1:8b`
- 点击“测试本地模型连接”确认可用

### 知识库管理

- 上传文件：支持 `.xlsx`、`.json`、`.csv`
- 上传后立即生效：自动重建索引
- 预览列表：支持关键词筛选，便于确认已导入内容

---

## 知识库文件格式建议

- JSON：数组，元素包含 `question` 和 `answer`
- CSV：表头包含 `问题/答案` 或 `question/answer`
- Excel：建议至少有“问题”“答案”两列

无效条目（空问题、空答案、"答案正在整理中"）会被自动过滤。

---

## 性能说明与优化建议

- 首次推理会慢：模型冷启动会导致第一次回答时间偏长（正常现象）
- 速度优先：使用 `qwen2.5:3b`
- 质量优先：使用 `qwen2.5:7b`（显存和时间成本更高）
- 若明显卡顿：重启 Ollama 服务，再做一次“测试本地模型连接”

---

## 学校部署（推荐拓扑）

推荐部署结构：

- `Nginx/Caddy`：负责 80/443 和 HTTPS
- `Next.js`：前端服务（内网 3000）
- `FastAPI`：后端服务（内网 8000）
- `Ollama`：模型服务（内网 11435）

详细部署与交接文档见：

- [`AGENT_HANDOVER_AND_SCHOOL_DEPLOYMENT.md`](./AGENT_HANDOVER_AND_SCHOOL_DEPLOYMENT.md)

---

## 常见问题

### Q1: 页面能打开，但回答很慢？
- 多数是模型冷启动或模型体积过大导致
- 先切到 `qwen2.5:3b` 再测试
- 检查后台“测试本地模型连接”是否成功

### Q2: 上传知识库后没效果？
- 确认上传成功返回“已生效条目数”
- 确认内容在知识预览中可查到
- 适当下调“检索相似度阈值”

### Q3: 为什么不再支持远程 API Key？
- 该仓库默认目标是学校低成本长期运行，优先本地模型
- 如需恢复远程能力，可在代码层另开分支扩展

---

## 相关文档

- [`LOCAL_MODEL_SETUP.md`](./LOCAL_MODEL_SETUP.md)：本地模型快速启动说明
- [`AGENT_HANDOVER_AND_SCHOOL_DEPLOYMENT.md`](./AGENT_HANDOVER_AND_SCHOOL_DEPLOYMENT.md)：完整交接与学校部署手册

---

如果你准备把它交给其他人维护，建议先让接手人按 README 完整走一遍启动和知识库上传流程，再进入生产部署。
