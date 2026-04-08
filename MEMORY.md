# 项目记忆文件 -- Xin（夹心说）智能教学平台

> 此文件供 Cursor AI 快速恢复上下文。新会话请先读此文件。

## 项目概述

Xin（夹心说）智能教学平台。学生提问 -> 后端检索知识库 -> 大模型基于检索结果生成回答 -> 支持多模式学习工作区。

## 技术栈

- **前端**: Next.js 15 + TailwindCSS 4 + TypeScript + react-markdown，端口 3000
- **后端**: Python FastAPI + uvicorn，端口 8000
- **知识检索**: scikit-learn TF-IDF + jieba 中文分词 + 关键词匹配混合检索
- **LLM**: 阿里云百炼 API（OpenAI 兼容协议），通过 openai Python SDK 调用，支持流式输出
- **数据存储**: JSON 文件（后端），前端无持久化（轻量单页设计）

## 目录结构

```
d:\vibecoding\demo2-QA-system\
├── frontend/
│   ├── src/app/page.tsx              # 单页主入口（欢迎态/对话态切换，深色主题）
│   ├── src/app/admin/page.tsx        # 管理员配置页（Tab 分块 + 保存后跳转）
│   ├── src/app/layout.tsx            # 根布局（极简，无 Provider）
│   ├── src/app/globals.css           # 苹果风格深色主题（sf-glass/sf-card/sf-input）
│   ├── src/components/
│   │   ├── MessageBubble.tsx         # 消息气泡（sf-glass 半透明 + Markdown + 流式光标）
│   │   └── TeacherCard.tsx           # 老师联系方式卡片（苹果橙色调）
│   ├── src/lib/
│   │   └── useSSE.ts                 # SSE 流式接收 hook（fetch + ReadableStream）
│   ├── next.config.ts                # API 代理 /api/* -> localhost:8000
│   └── package.json
├── backend/
│   ├── main.py                       # FastAPI 入口 + 异步 LLM 调用 + SSE 流式端点
│   ├── knowledge.py                  # 知识库加载 + TF-IDF/关键词混合检索
│   ├── llm.py                        # LLM 调用（支持普通 + stream 两种模式）
│   ├── config.py                     # 运行时配置管理
│   ├── preprocess.py                 # xlsx -> JSON 预处理脚本
│   ├── data/
│   │   ├── qa_knowledge.json         # 62 条有效问答对
│   │   └── runtime_config.json       # 管理员运行时配置（自动生成）
│   └── requirements.txt              # 依赖（已锁版本）
├── .env                              # API Key + 管理员密码（不提交 git）
├── .gitignore                        # 排除 .env / node_modules / runtime_config 等
├── 需要准备的数据-吴迪260313.xlsx      # 原始数据源
└── MEMORY.md                         # 本文件
```

## 设计理念

- **轻量快捷**：单页应用，无多会话/侧栏，问完即走
- **苹果美学**：纯黑背景 (#000) + 半透明高斯模糊 + 微妙阴影 + 圆角矩形 (Squircle)，参考 iOS/macOS 设计语言
- **色彩克制**：主色调为苹果系统蓝 (#0a84ff)，辅以苹果橙 (#ff9f0a)、苹果绿 (#30d158)。无紫色
- **性能优先**：异步 LLM 调用不阻塞事件循环，混合检索提高召回率
- **用户界面纯净**：管理设置入口不在用户主界面展示（仅通过 /admin 路径访问）
- **一键清空**：对话态 header 显示"新对话"按钮即可回到欢迎页

## 关键 API 接口

| 方法 | 路径 | 鉴权 | 用途 |
|------|------|------|------|
| POST | /api/chat | 无 | 学生提问（一次性返回） |
| POST | /api/chat/stream | 无 | 学生提问（SSE 流式返回） |
| POST | /api/admin/login | 无 | 管理员登录验证 |
| GET | /api/admin/config | X-Admin-Token | 获取当前配置 |
| POST | /api/admin/config | X-Admin-Token | 更新配置 |
| POST | /api/admin/test-connection | X-Admin-Token | 测试 LLM API 连接 |
| GET | /api/health | 无 | 健康检查 |

## SSE 流式协议

`POST /api/chat/stream` 返回 `text/event-stream`，事件格式：

```
data: {"type": "meta", "can_answer": true, "sources": [...], "teacher_contact": null}
data: {"type": "delta", "content": "你好"}
data: {"type": "delta", "content": "！关于"}
...
data: {"type": "done"}
```

错误时返回 `{"type": "error", "content": "错误信息"}`

## 鉴权机制

- 管理员密码配在 `.env` 的 `ADMIN_PASSWORD` 字段（默认 admin123）
- 前端 `/admin` 页面先调 `POST /api/admin/login` 获取 token
- 后续管理 API 请求通过 `X-Admin-Token` Header 携带 token
- token 存在前端 localStorage，退出登录时清除

## 启动方式

```bash
# 后端（在项目根目录）
py -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 前端（在 frontend 目录）
cd frontend && npm run dev
```

前端访问：http://localhost:3000
管理后台：http://localhost:3000/admin

## 核心数据流

1. 学生输入问题或点击快速提问卡片 -> 从欢迎态切换为对话态
2. 前端通过 useSSE hook 调用 POST /api/chat/stream
3. Next.js rewrites 代理到 FastAPI :8000
4. FastAPI 用 jieba 分词 + TF-IDF + 关键词匹配混合检索知识库 Top3（0.7 TF-IDF + 0.3 关键词权重）
5. 若最高相似度 >= 阈值(0.15)：LLM 流式生成回答（asyncio.to_thread 避免阻塞事件循环），逐 chunk SSE 推送
6. 若最高相似度 < 阈值：返回无法回答 + 老师联系方式
7. LLM 调用失败时：返回友好提示（错误写入后端日志，不暴露给用户）
8. 用户可继续追问，或点击"清空重来"回到欢迎页

## 前端架构

### 单页设计（page.tsx）
- **欢迎态**：深色背景 + 渐变光晕 + Logo"小软" + 中央输入框 + 6 个快速提问卡片
- **对话态**：消息列表 + 底部输入框 + 快速提问标签 + 停止/清空按钮
- **状态管理**：组件内 useState（Message[]），无 Context/Redux/外部 store

### 视觉系统（Apple Design Language）
- 纯黑背景 (#000000) + CSS 变量（--accent: #0a84ff 苹果蓝）
- `.sf-glass` 高斯模糊半透明面板（saturate(180%) + blur(20px)，模拟 iOS 材质）
- `.sf-card` 交互式卡片（hover 时 scale(1.02) + 边框变亮，非线性动画曲线）
- `.sf-input` 输入框（iOS 搜索栏风格，focus 时蓝色光圈）
- `animate-fade` / `animate-in` / `animate-float` 入场动画
- 无紫色/渐变描边/渐变文字，追求克制与留白

## 知识库

- 数据来源：xlsx "精选问题" sheet
- 预处理后 62 条有效问答对
- 如需更新：编辑 xlsx -> 运行 `py backend/preprocess.py` -> 重启后端

## 配置说明

- `.env` 存放默认配置（API Key、Base URL、模型、管理员密码）
- 管理员可通过 /admin 动态修改，保存到 runtime_config.json
- 管理后台分为「连接配置」和「其他配置」两个 Tab
- 保存配置后自动跳转回问答页
- 运行时优先级：runtime_config.json > .env
- 支持模型：qwen3.5-plus, qwen3-max, qwen3-coder-next/plus, glm-5, glm-4.7, kimi-k2.5, MiniMax-M2.5
