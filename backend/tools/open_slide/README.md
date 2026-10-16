# Open Slide HTML 工具

当前项目的个人知识库通过 `html_generation.create_router` 调用工具。
模型在 OpenCode 中规划符合 `DeckSpec` 的内容，`renderer.render` 校验并输出离线 HTML。
支持三套主题及封面、正文、比较、流程、架构、图表和引语布局。
图表必须有来源备注，图解端点必须与节点匹配；不执行模型生成的代码。

环境变量（设置在项目 `.env` 或启动环境）：

- `OPENCODE_SERVER_URL`：默认 `http://127.0.0.1:4096`。
- `OPENCODE_EXECUTABLE`：可选的 OpenCode 可执行文件路径。
- `OPENCODE_HTML_AUTOSTART`：默认 `1`，仅默认本机地址自动启动；`0` 禁用。
- `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`：已有服务的可选 HTTP Basic 身份信息。

模型登录与密钥由 OpenCode 管理，不传到浏览器。目录出现模型不保证其额度或登录有效；
实际调用失败会保留失败状态，不替换模型、不产生虚假的成功结果。
生成工具不要求账户登录。前端自动创建浏览器标识（`stars:html-client`），通过
`X-HTML-Client` 关联任务和历史；该标识用于本地任务归属，不是账户认证。
`localhost` 和 `127.0.0.1` 的浏览器存储独立，建议固定使用同一地址查看历史。
任务元数据、内容结构和 HTML 保存到 `backend/.generated/html`，未挂载为公开静态目录。
会话禁止工具执行；结果经过转义，预览 iframe 仅允许本地脚本，并带禁止联网的 CSP。

启动项目已有后端与前端即可。工具无需原 `html生成skills` 目录，也不依赖 5180 端口。
关闭生成弹窗不取消任务，再次打开可查看记录。当前版输出 HTML，不包含 Open Slide 的 React 编辑器。

验证：在 backend 目录用项目 `.venv/Scripts/python.exe -m unittest discover -s tests -p test_html_generation.py`。
迁移设计资料位于 `references`，上游许可保存在 `licenses`。

## 现成编辑器
默认 HTML 内嵌 Frontend Slides Editable 的 Swiss 编辑运行时，支持文字格式、Undo/Redo、Unlock layout、对象拖动缩放、添加文本/图片/视频、Pages 复制/排序/删除及离线导出。
知识库弹窗的“保存修改”使用原生导出器并写回本任务 result.html，首份原稿保存在 original.html；下载读取编辑器当前内容。历史旧 HTML 加载时自动适配，无需重新调用模型。
槽位模式保留布局，Unlock layout 解锁文字块；SVG 内部节点及图表数值尚无完整的数据编辑器。
Open Slide 原生 inspector 依赖 TSX 源文件和 Vite 服务，此次未将该源码编辑器嵌到静态 HTML。
