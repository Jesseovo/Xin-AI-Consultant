# Xin AI Consultant 交接与部署手册

> 适用对象：后续接手维护本系统的老师/同学/运维人员（非原作者）。

## 1. 这份文档解决什么问题

本手册覆盖三件事：

1. 如何从零搭建一个可用的知识库问答 Agent
2. 如何在本项目中从零启动并维护
3. 如何部署到学校环境，供校内人员访问

---

## 2. 系统架构（当前实现）

- 前端：Next.js（`frontend`）
- 后端：FastAPI（`backend`）
- 检索：TF-IDF + 关键词匹配（`backend/knowledge.py`）
- 模型：OpenAI 兼容接口（云端或本地 Ollama）
- 知识库：JSON 文件（`backend/data/qa_knowledge.json`）
- 管理后台：
  - 连接配置
  - 知识库上传（xlsx/json/csv）
  - 其他配置（阈值、老师联系方式）

---

## 3. 从零搭建一个 Agent（通用方法）

如果以后要做同类 Agent（不局限于本专业），建议按以下步骤：

### Step 1：明确边界

- 目标用户是谁（例如：软件工程学生）
- 允许回答范围是什么（专业/学院相关）
- 明确拒答策略（超范围时给联系方式或人工渠道）

### Step 2：准备知识库

- 问答对结构统一为：
  - `question`
  - `answer`
- 每条答案要可核验、避免模糊描述
- 过滤“答案正在整理中”之类无效内容

### Step 3：先做可解释检索，再接生成

- 先保证检索可命中（TopK、阈值、召回质量）
- 再接大模型做润色与组织表达
- 保留 `sources` 返回，方便排查命中质量

### Step 4：加管理入口

- 可在线更新模型配置
- 可在线上传知识库并即时重建索引
- 提供“连接测试”和“条目统计”

### Step 5：最后再做上线与运维

- 监控接口可用性
- 做备份/回滚
- 明确谁负责数据更新、谁负责系统稳定性

---

## 4. 本项目从零启动（开发/交接环境）

## 4.1 环境要求

- Windows 10/11 或 Linux
- Python 3.11+
- Node.js 20+
- npm 10+
- Ollama（本地模型时）

## 4.2 初始化

在项目根目录执行：

```powershell
py -m pip install -r backend/requirements.txt
cd frontend
npm install
```

创建根目录 `.env`（示例）：

```env
DASHSCOPE_API_KEY=你的云端Key（本地模型可留空）
DASHSCOPE_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
DEFAULT_MODEL=qwen3.5-plus
ADMIN_PASSWORD=请改为强密码
```

## 4.3 本地模型（Ollama）启动

> 本项目脚本默认把模型缓存放在项目目录，避免占满系统盘。

```powershell
.\start-local-ollama.ps1 -OllamaHost "127.0.0.1:11435"
.\pull-local-model.ps1 -Model "qwen2.5:7b" -OllamaHost "127.0.0.1:11435"
.\switch-to-local-model.ps1 -Model "qwen2.5:7b" -BaseUrl "http://127.0.0.1:11435/v1"
```

## 4.4 启动前后端

```powershell
.\run-backend-local.ps1
.\run-frontend-local.ps1
```

- 前端：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin`

---

## 5. 知识库更新（后台直传）

登录后台后，进入“知识库”Tab：

1. 上传文件（支持 `.xlsx/.json/.csv`）
2. 点击“上传并立即生效”
3. 系统会返回“共 N 条问答已生效”
4. 立即提问验证，无需重启服务

### 文件格式建议

- Excel：建议含“问题”“答案”列（或保持当前模板）
- JSON：数组，元素必须有 `question`/`answer`
- CSV：表头包含 `问题/答案` 或 `question/answer`

---

## 6. 学校部署方案（推荐）

建议在**学校服务器**上使用“反向代理 + 后端 + 前端 + 本地模型”结构：

- `Nginx/Caddy`（80/443，HTTPS）
- `Next.js`（前端服务）
- `FastAPI`（后端服务）
- `Ollama`（模型服务）

## 6.1 推荐端口规划

- 前端：`127.0.0.1:3000`
- 后端：`127.0.0.1:8000`
- 模型：`127.0.0.1:11435`
- 对外只暴露 80/443（由 Nginx/Caddy 转发）

## 6.2 Linux 生产部署（简化流程）

1. 安装 Python / Node / Ollama
2. 拉取项目代码
3. 安装依赖（`pip install -r ...`，`npm ci`）
4. 配置 `.env`、管理员密码
5. `ollama pull qwen2.5:7b`
6. 将后端 `base_url` 配置为 `http://127.0.0.1:11435/v1`
7. 用 systemd 托管三个服务：
   - ollama
   - backend（uvicorn）
   - frontend（next start）
8. 配置 Nginx/Caddy 的 HTTPS 域名

### Caddy 示例

```caddy
ai-consultant.school.edu {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

> 前端已将 `/api/*` 转发到后端，无需额外暴露后端公网端口。

## 6.3 Windows 服务器可选方案

- 使用任务计划/NSSM/WinSW 托管：
  - Ollama
  - `run-backend-local.ps1`
  - `run-frontend-local.ps1`
- 用 IIS ARR 或 Nginx for Windows 做 443 入口

---

## 7. 运维与交接 SOP

## 7.1 每日巡检

- 页面访问是否正常（`/`、`/admin`）
- 后端健康检查：`/api/health`
- 模型连接测试：后台“测试 API 连接”
- 最新知识库条目数是否符合预期

## 7.2 备份策略（至少每日）

重点备份：

- `backend/data/qa_knowledge.json`（知识库）
- `.env`（密钥与密码）
- 管理文档与部署配置

## 7.3 升级策略

- 先在测试机更新
- 通过后再切生产
- 保留最近一次可用版本用于回滚

## 7.4 常见问题

- **上传成功但检索不生效**
  - 检查返回条目数是否 > 0
  - 检查问题是否在知识范围内
  - 检查相似度阈值是否过高
- **模型连接失败**
  - 检查 Ollama 是否运行
  - 检查 `base_url` 与端口
  - 检查服务器代理设置（本地地址应走 no_proxy）

---

## 8. 给接手人的最小清单

接手后至少完成：

1. 能独立启动前后端+模型
2. 能通过后台上传知识库并立即检索验证
3. 能修改管理员密码、模型配置
4. 知道备份与回滚文件位置
5. 知道学校域名入口与证书续期负责人

---

如需继续扩展，优先级建议：

1. 增加知识库上传“预览 + 覆盖确认”
2. 增加知识库版本管理（可回滚）
3. 增加查询日志与错误监控看板
