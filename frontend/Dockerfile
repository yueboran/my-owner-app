# ==============================
# 第一阶段：构建前端静态文件
# ==============================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 优先复制依赖文件并安装，利用 Docker 缓存加速构建
COPY package.json package-lock.json* ./
RUN npm install

# 复制其余代码并进行编译打包
COPY . .
RUN npm run build

# ==============================
# 第二阶段：配置 Nginx 生产环境
# ==============================
FROM nginx:alpine

# 将构建好的静态文件拷贝到 Nginx 默认的托管目录中
# Vite 的默认构建输出目录是 dist
COPY --from=builder /app/dist /usr/share/nginx/html

# 移除不要暴露的后端代码文件
RUN rm -f /usr/share/nginx/html/server.cjs

# 替换默认的 Nginx 配置，以便支持单页应用(SPA)的路由以及反向代理后端 API
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
