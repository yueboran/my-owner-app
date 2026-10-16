# 璀璨星图

个人知识与应用工作台，包含 React 前端、FastAPI 后端及书页工坊本地电子书应用。

## 本地运行

需要 Node.js、Python 3.11+、uv；书页工坊需要已安装的 Chrome 或 Edge。

```powershell
Copy-Item .env.example .env
npm --prefix frontend ci
npm --prefix apps/page-studio install
cd backend
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

另开终端，在项目根目录执行：

```powershell
npm --prefix frontend run dev
```

打开 `http://localhost:3000`。书页工坊位于应用合集，前端开发服务自动启动本机接入引擎（43824）；也可以单独运行 `apps/page-studio/启动项目版.cmd`。浏览器程序的自定义路径可通过 `BOOK_BROWSER` 配置。

后端配置参见 `.env.example` 和 `backend/README.md`。请使用自己的配置，并修改开发环境默认签名密钥。

## 目录

- `frontend`：React、TypeScript、Vite 前端。
- `backend`：FastAPI 接口、数据模型与工具。
- `apps/page-studio`：书页工坊完整应用及项目接入层。
- `apps/social-media`：自媒体工作台说明与后续独立服务目录，入口位于应用合集。
- `apps/recruitment-agent`：招聘浏览器代理说明与后续服务目录，规划调用 Laya 与 LLM 操作招聘网站，入口位于应用合集。

数据库、浏览器登录会话、抓取结果、依赖目录和本机 Node 可执行文件不随源码发布。依赖安装后再运行；原版独立模式可在相应目录执行 `npm install` 和 `npm start`。

## 验证

```powershell
npm --prefix frontend run build
node --test apps/page-studio/test/*.test.cjs
node --test apps/page-studio/integration/*.test.cjs
```

书页工坊的浏览器测试需要本机 Chrome 或 Edge。
