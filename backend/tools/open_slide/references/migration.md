# 来源与适配

Frontend Slides Editable：本地 STYLE_PRESETS.md 的 Bold Signal、Electric Studio、Paper & Ink。迁移布局语法、签名元素和主题可辨识性；重写为 React 固定画布，不拷贝全屏滚动 CSS 或另一套 JS 编辑器。

huashu-design：内容推导五问、真实视觉、图像诚实性、语义构图、排印与审校。整合到本地 design-slide，不引入与原生工作区冲突的框架。用户已授权的迁移、验证和可逆修复直接推进。

Open Slide：保留 React 页、Design/Inspector/Pages、notes、主题预览和导出。原生导出可能包含 ZIP 资源，本地 pack_html.py 把资源嵌回 HTML。单文件离线稿保留导出演示器的导航，不承诺开发模式 Inspector 的全部编辑能力。

Visual Explainer 0.12.0：新增 figure-first、机制路径、架构边界、共享 SVG 节点/连线、同尺度前后比较、零起点数据图与模型口径。参考 technical-explainer.md 和 assets/technical-figures.tsx；适配为原生1920×1080图纸。缓存按钮的导出行为由单文件打包器补充，不声称任意React事件都能自动导出。

三个主题是当前实现范围，不声称迁移了全部46/60种风格。额外预设按相同机制逐套实现和截图检查。来源许可证保存在 licenses/；原来源目录保留。
