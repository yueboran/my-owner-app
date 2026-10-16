# 书页工坊：从根目录原版重新迁移

来源：项目根目录 `书页工坊/`。原应用的 server.cjs、lib、public、scripts、test、运行时和依赖完整复制，原文件保持逐字节一致。`source-manifest.json` 记录此次文件哈希。

前次重写的 React 页面、Hook、类型与应用目录已移出项目，备份位于 `C:/Users/26897/AppData/Local/Temp/starmap-page-studio-replaced-20261015-235607/`。旧抓取数据没有混入此次新迁移。

项目页面用 iframe 承载原版完整工作台；原版 app.js 负责全部操作与状态。新增接入层只做路径前缀、允许本机项目嵌入、CSS 主题覆盖和页面高度同步。没有改写原应用的抓取、保存、导出、目录、暂停继续与编辑逻辑。

- 项目入口：应用合集 → 书页工坊，或 `http://127.0.0.1:3000/#page-studio`。
- `npm --prefix frontend run dev` 自动启动项目接入服务；默认端口 43824。
- 单独运行项目接入服务：`apps/page-studio/启动项目版.cmd`。
- 原版独立模式仍使用未改动的 `启动.cmd` 和默认端口 43821。
- `BOOK_PORT`、`BOOK_DATA_DIR` 支持测试隔离。项目正式数据在 `apps/page-studio/数据`。
- 构建后的前端连接本机 43824 服务。仅支持 localhost / 127.0.0.1 页面，保留本机应用范围。

验证：原版 `node --test test/*.test.cjs` 共 23 项通过；`node --test integration/host.test.cjs` 验证接入路径、原版令牌和来源限制。`scratch/verify_page_studio_remigration.cjs` 通过 3002 测试前端、43822 隔离引擎执行完整浏览器流程；数据与截图在 `scratch/page-studio-remigration`。
