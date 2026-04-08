<div align="center">

# 🧠 夹心

**✨ AI-Powered Intelligent Teaching Platform ✨**

[![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

🌐 **[中文](#-中文文档)** | **[English](#-english-documentation)**

*Created by **Jesse** 🚀*

</div>

---

## 📖 中文文档

### 💡 这是什么？

**夹心** 是一个融合了 AI 大模型的智能教学平台，让老师变身「赛博教师」🤖，学生随时随地都能获得智能辅导。

> 🎯 老师上传资料 → AI 学习理解 → 学生提问即答 → 个性化学习体验

### ⚡ 核心功能

| 功能 | 说明 |
|------|------|
| 🗂️ **知识库问答** | 向量 RAG + TF-IDF 混合检索，支持 PDF / DOCX / TXT / MD / XLSX |
| 🤖 **TutorBot** | 老师创建个性化 AI 教师角色，5 种人格模板可选 |
| 🧩 **多模式工作区** | Chat 💬 / Deep Solve 🔍 / Quiz 📝 / Guided Learning 📚 / Deep Research 🔬 |
| ✍️ **Co-Writer** | AI 协作写作，支持改写、扩写、摘要、翻译 |
| 📓 **Notebook** | 智能笔记本，自动收集学习记录 |
| 🧠 **Memory** | 学生画像记忆，越用越懂你 |
| 👥 **三角色系统** | 管理员 🔧 / 老师 👨‍🏫 / 学生 👨‍🎓，JWT 认证 |
| 🔀 **多模型支持** | DashScope / DeepSeek / OpenAI / Ollama，litellm 统一路由 |

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────┐
│                 🖥️ Frontend                      │
│        Next.js 15 + React 19 + TailwindCSS 4    │
│           Framer Motion ✨ 文字动画效果            │
├─────────────────────────────────────────────────┤
│                 ⚙️ Backend                       │
│      FastAPI + SQLAlchemy + litellm + JWT        │
├──────────────┬──────────────┬───────────────────┤
│  💾 Database  │  🔍 Search   │  🤖 LLM           │
│ SQLite/MySQL │ ChromaDB     │ DashScope/OpenAI  │
│ Redis(可选)   │ BM25+TF-IDF  │ DeepSeek/Ollama   │
└──────────────┴──────────────┴───────────────────┘
```

### 🚀 快速开始

#### 1️⃣ 环境要求

- 🐍 Python 3.11+
- 📦 Node.js 20+（前端）
- 🐋 Docker（可选，用于 MySQL + Redis）

#### 2️⃣ 克隆 & 配置

```bash
# 📥 克隆项目
git clone https://github.com/Jesseovo/Xin-AI-Consultant.git
cd Xin-AI-Consultant

# 📝 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key
```

#### 3️⃣ 启动后端 🐍

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

#### 4️⃣ 启动前端 ⚛️

```bash
cd frontend
npm install
npm run dev
```

#### 5️⃣ 开始使用 🎉

| 地址 | 说明 |
|------|------|
| 🌐 http://localhost:3000 | 前端界面 |
| 📄 http://localhost:8000/docs | API 文档 |
| 💚 http://localhost:8000/api/health | 健康检查 |

### 🔌 API 概览

| 路径 | 说明 |
|------|------|
| `POST /api/v1/auth/register` | 📝 注册 |
| `POST /api/v1/auth/login` | 🔑 登录 |
| `POST /api/v1/chat/stream` | 💬 流式对话 |
| `GET /api/v1/bots/` | 🤖 TutorBot 列表 |
| `POST /api/v1/knowledge/` | 🗂️ 创建知识库 |
| `POST /api/v1/knowledge/{id}/upload` | 📤 上传文档 |
| `POST /api/v1/quiz/generate` | 📝 生成测验 |
| `POST /api/v1/guided/plan` | 📚 创建学习计划 |
| `POST /api/v1/research/` | 🔬 深度研究 |
| `POST /api/v1/cowriter/rewrite` | ✍️ AI 写作 |

> 📖 完整文档：http://localhost:8000/docs

### 📁 项目结构

```
Xin-AI-Consultant/
├── 🖥️ frontend/                    # Next.js 前端
│   └── src/
│       ├── app/                    # 页面路由
│       │   ├── (auth)/             # 🔑 登录注册
│       │   ├── (main)/             # 👨‍🎓 学生主界面
│       │   ├── (teacher)/          # 👨‍🏫 老师面板
│       │   └── (admin)/            # 🔧 管理后台
│       ├── components/             # 🧩 共享组件
│       └── lib/                    # 🔧 工具库
├── ⚙️ backend/                     # FastAPI 后端
│   ├── app/                        # 应用入口
│   ├── api/v1/endpoints/           # API 路由
│   ├── models/                     # 数据模型（12 张表）
│   ├── services/                   # 业务逻辑
│   │   ├── llm_router.py           # 🔀 多模型路由
│   │   ├── rag_pipeline.py         # 🔍 RAG 检索管道
│   │   └── chat_modes/             # 💬 对话模式
│   ├── core/                       # 🔐 安全 + 缓存
│   └── db/                         # 💾 数据库连接
├── 🐋 docker-compose.dev.yml       # 开发环境
├── 🐋 docker-compose.prod.yml      # 生产环境
└── 📄 docs/                        # 文档
```

### 🏷️ 版本说明

| 标签/分支 | 说明 |
|----------|------|
| `main` | 🆕 最新完整版（当前） |
| `v1.0-original` | 📦 原始简单问答版本 |

---

## 📖 English Documentation

### 💡 What is JiaXin?

**JiaXin (夹心)** is an AI-powered intelligent teaching platform that transforms teachers into "cyber tutors" 🤖, enabling students to get personalized AI-assisted learning anytime, anywhere.

> 🎯 Teachers upload materials → AI learns & understands → Students ask & get answers → Personalized learning experience

### ⚡ Key Features

| Feature | Description |
|---------|-------------|
| 🗂️ **Knowledge Base Q&A** | Hybrid RAG (Vector + TF-IDF + BM25), supports PDF / DOCX / TXT / MD / XLSX |
| 🤖 **TutorBot** | Teachers create personalized AI teacher personas with 5 personality templates |
| 🧩 **Multi-Mode Workspace** | Chat 💬 / Deep Solve 🔍 / Quiz 📝 / Guided Learning 📚 / Deep Research 🔬 |
| ✍️ **Co-Writer** | AI collaborative writing: rewrite, expand, summarize, translate |
| 📓 **Notebook** | Smart notebooks that auto-collect learning records |
| 🧠 **Memory** | Student profiling — the more you use it, the better it knows you |
| 👥 **Role System** | Admin 🔧 / Teacher 👨‍🏫 / Student 👨‍🎓 with JWT authentication |
| 🔀 **Multi-Model** | DashScope / DeepSeek / OpenAI / Ollama via litellm unified routing |

### 🏗️ Tech Stack

- **Frontend**: Next.js 15 + React 19 + TailwindCSS 4 + Framer Motion
- **Backend**: FastAPI + SQLAlchemy + litellm + JWT
- **Database**: SQLite (default, zero-config) / MySQL + Redis (optional)
- **Vector Search**: ChromaDB + sentence-transformers
- **Deployment**: Docker Compose ready

### 🚀 Quick Start

```bash
# 📥 Clone
git clone https://github.com/Jesseovo/Xin-AI-Consultant.git
cd Xin-AI-Consultant

# 📝 Configure
cp .env.example .env
# Edit .env with your LLM API key

# 🐍 Backend
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000

# ⚛️ Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Visit 🌐 http://localhost:3000 and start exploring!

### 🏷️ Versions

| Tag/Branch | Description |
|------------|-------------|
| `main` | 🆕 Latest full-featured version |
| `v1.0-original` | 📦 Original simple Q&A version |

---

<div align="center">

**🧠 夹心**

Made with ❤️ by **[Jesse](https://github.com/Jesseovo)**

*Powered by AI, Built for Learning* 🎓

</div>
