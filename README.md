# Xin AI Consultant - 智能教学平台

齐齐哈尔大学智能教学平台（升级版），融合 DeepTutor 全功能，支持全校师生使用。

## 系统能力

- **知识库问答**（核心）：向量 RAG + TF-IDF 混合检索，支持 PDF/DOCX/TXT/MD/XLSX/JSON/CSV
- **TutorBot**：老师创建个性化 AI 教师角色（5 种人格模板），学生选择对话
- **多模式工作区**：Chat / Deep Solve / Quiz / Guided Learning / Deep Research
- **扩展功能**：Co-Writer 协作写作 / Notebook 笔记本 / Memory 学习画像
- **三角色系统**：管理员 / 老师 / 学生，JWT 认证
- **多模型支持**：DeepSeek / OpenAI / Ollama 等，通过 litellm 统一路由

## 技术架构

- **前端**：Next.js 15 + React 19 + TailwindCSS 4
- **后端**：FastAPI + SQLAlchemy + litellm
- **数据库**：MySQL 8.0 + Redis 7
- **向量检索**：ChromaDB + sentence-transformers
- **部署**：Docker Compose

## 快速开始

### 1. 环境准备

- Python 3.11+
- Node.js 20+
- Docker Desktop（用于 MySQL + Redis）

### 2. 启动基础服务

```powershell
# 克隆项目
git clone https://github.com/Jesseovo/Xin-AI-Consultant.git
cd Xin-AI-Consultant
git checkout feature/deeptutor-upgrade

# 配置环境变量
Copy-Item .env.example .env
# 编辑 .env，填入 LLM API Key 等配置

# 启动 MySQL + Redis
docker compose -f docker-compose.dev.yml up -d
```

### 3. 启动后端

```powershell
cd backend
pip install -r requirements.txt
cd ..
python -m uvicorn backend.app.main:app --reload --port 8000
```

### 4. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

### 5. 访问

- 前端：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/api/health

## 测试环境配置（不烧本机性能）

```env
# LLM 走云端 API，不跑本地大模型
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1

# Embedding 本地 CPU 推理（无需 GPU）
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
```

## API 概览

| 路径 | 说明 |
|------|------|
| `POST /api/chat` | 旧版问答（兼容） |
| `POST /api/chat/stream` | 旧版流式问答（兼容） |
| `POST /api/v1/auth/register` | 注册 |
| `POST /api/v1/auth/login` | 登录 |
| `POST /api/v1/chat/send` | 新版对话 |
| `POST /api/v1/chat/stream` | 新版流式对话 |
| `GET /api/v1/bots/` | TutorBot 列表 |
| `POST /api/v1/bots/` | 创建 TutorBot |
| `POST /api/v1/knowledge/` | 创建知识库 |
| `POST /api/v1/knowledge/{id}/upload` | 上传文档 |
| `POST /api/v1/quiz/generate` | 生成测验 |
| `POST /api/v1/guided/plan` | 创建学习计划 |
| `POST /api/v1/research/` | 深度研究 |
| `POST /api/v1/cowriter/rewrite` | 协作写作 |

完整 API 文档见 http://localhost:8000/docs

## 目录结构

```
Xin-AI-Consultant/
├── frontend/                      # Next.js 前端
│   └── src/
│       ├── app/                   # 页面路由
│       │   ├── (auth)/            # 登录注册
│       │   ├── (main)/            # 学生主界面
│       │   ├── (teacher)/         # 老师面板
│       │   └── (admin)/           # 管理后台
│       ├── components/            # 共享组件
│       └── lib/                   # 工具库
├── backend/                       # FastAPI 后端
│   ├── app/                       # 应用入口 + 配置
│   ├── api/v1/endpoints/          # API 路由
│   ├── models/                    # ORM 模型（12 张表）
│   ├── services/                  # 业务逻辑
│   │   ├── llm_router.py          # 多模型路由
│   │   ├── rag_pipeline.py        # RAG 检索管道
│   │   ├── knowledge_service.py   # 知识库服务
│   │   ├── tutorbot_service.py    # TutorBot 服务
│   │   └── chat_modes/            # 对话模式
│   ├── core/                      # 安全 + 缓存
│   └── db/                        # 数据库连接
├── docker-compose.dev.yml         # 开发环境（MySQL + Redis）
├── docker-compose.prod.yml        # 生产环境
├── Dockerfile                     # 后端容器
└── docs/                          # 文档
    └── IMAGE_REQUIREMENTS.md      # 图片需求清单
```

## 分支说明

- `main`：原始简单问答版本
- `feature/deeptutor-upgrade`：升级版（本分支）
