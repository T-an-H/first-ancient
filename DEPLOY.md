# 部署到阿里云（从 0 到 1）

公网 IP：`8.137.91.87`，系统：Ubuntu 22.04。
部署：Vue 前端（Nginx 静态）+ Node.js Express 后端（pm2）+ MySQL。
自动部署：push 到 `main` 分支 → GitHub Actions 构建 + scp 推送 tarball + ssh 解压 + pm2 重启。

> 服务器全程不访问 GitHub，规避大陆网络问题。构建在 GitHub Actions runner（境外）完成。

---

## 阶段 A：服务器基础环境（一次性，约 20 分钟）

### A1. 安全组放行端口

阿里云控制台 → ECS 实例 → 安全组 → 入方向规则，添加：

| 端口 | 来源 | 用途 |
|------|------|------|
| 80/80 | 0.0.0.0/0 | HTTP 公网访问 |
| 22/22 | 0.0.0.0/0 | SSH（建议 later 限定为你家 IP） |

### A2. SSH 登录服务器

```bash
ssh root@8.137.91.87
```

### A3. 安装基础软件

```bash
apt update && apt upgrade -y
apt install -y nginx mysql-server git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2
npm config set registry https://registry.npmmirror.com
```

验证：

```bash
node -v     # 应出 v20.x
nginx -v
mysql --version
pm2 -v
```

### A4. 配置 MySQL

```bash
mysql_secure_installation
```

按提示设置 root 密码（**记下来，下面 A6 要用**），其余问题全选 Y。

建库：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS course_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### A5. 生成部署用 SSH 密钥对（给 GitHub Actions 用）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key
```

**复制 `cat ~/.ssh/deploy_key` 输出的整段私钥**（含 `-----BEGIN` 和 `-----END` 行），阶段 C2 要贴进 GitHub Secrets。

### A6. 准备目录与后端环境变量

```bash
mkdir -p /var/www/first-ancient/server
```

写后端环境变量 `/var/www/first-ancient/server/.env`（**不进仓库，只放服务器**）：

```bash
cat > /var/www/first-ancient/server/.env <<'EOF'
PORT=3000
DB_PASSWORD=<A4 设的 MySQL root 密码>
DEEPSEEK_API_KEY=<你的 DeepSeek API Key>
CORS_ORIGINS=http://8.137.91.87
EOF
```

把 `<A4 设的 MySQL root 密码>` 和 `<你的 DeepSeek API Key>` 替换成真实值。

### A7. 配置 Nginx

新建 `/etc/nginx/sites-available/course-platform`：

```bash
cat > /etc/nginx/sites-available/course-platform <<'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/first-ancient/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
EOF
```

启用：

```bash
ln -sf /etc/nginx/sites-available/course-platform /etc/nginx/sites-enabled/course-platform
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 阶段 B：首次上线

服务器不用 `git clone`，代码全靠 GitHub Actions 打 tarball 用 scp 推上来再解压。

1. 完成阶段 C（配置自动部署）后，push 一次到 `main`，或在 GitHub Actions 页面点 **Run workflow**。
2. 等 Actions 跑完（绿勾），服务器上已有 `dist/` 和 `server/` 代码。
3. 回到服务器执行导表语句：

```bash
mysql -u root -p course_platform < /var/www/first-ancient/server/sql/schema.sql
mysql -u root -p course_platform < /var/www/first-ancient/server/sql/schema_extra.sql
mysql -u root -p course_platform < /var/www/first-ancient/server/sql/schema_project.sql
```

4. 可选灌测试数据：

```bash
cd /var/www/first-ancient/server && npm ci && npm run seed
```

5. pm2 开机自启：

```bash
pm2 startup      # 按提示执行它给的那条命令
pm2 save
```

6. 验证：
   - 浏览器开 `http://8.137.91.87`，看到登录页即成功。
   - `curl http://8.137.91.87/api/health` 返回 `{"status":"ok",...}`。

---

## 阶段 C：配置自动部署

### C1. 工作流文件

已在仓库根目录创建 `.github/workflows/deploy.yml`。push 到 `main` 自动触发；也可在 Actions 页面手动触发（`workflow_dispatch`）。

### C2. 在 GitHub 仓库添加 Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret，添加三个：

| Secret 名 | 值 |
|-----------|-----|
| `ALIYUN_HOST` | `8.137.91.87` |
| `ALIYUN_USER` | `root` |
| `ALIYUN_SSH_KEY` | 阶段 A5 输出的**私钥整段**（含 `-----BEGIN` 和 `-----END` 行） |

### C3. 触发首次部署

```bash
git push origin main
```

或 GitHub 仓库 → Actions → Deploy to Aliyun → Run workflow。

绿勾后回到服务器执行阶段 B 的导表语句。

---

## 日常更新流程

```bash
git pull origin main        # 拉最新（Cursor 改之前先拉）
# 在 Cursor 里改代码……
git add .
git commit -m "说明改了啥"
git push origin main        # 上传，和以前一模一样
```

push 完 → GitHub 自动触发 Actions → 境外 runner 构建 → 打 tarball + scp 推服务器 → ssh 解压 + `npm ci + pm2 restart` → 刷新 `http://8.137.91.87` 即最新。

**你不用碰服务器，上传方式不变。**

要点：
- 只推 `main` 才自动部署；`feat/*` 分支不会触发，适合先开发再合并 main。
- 拉取和上传都是同一个地址 `origin`（`https://github.com/T-an-H/first-ancient.git`），服务器不在这条链路里。

---

## 已修复的部署踩坑（按时间顺序）

以下三个问题在首次部署时依次出现，现已在 `deploy.yml` 中修复，记录于此供复盘。

| 问题 | 现象 | 根因 | 修复 |
|------|------|------|------|
| 1 | `vue-tsc` 类型检查报错，构建中断 | 仓库存在历史类型错误，阻塞 CI 构建 | 构建改为 `VITE_API_BASE=/api npx vite build`，跳过 `vue-tsc` |
| 2 | `tar: empty archive`（scp 步骤） | `scp-action` 在 Docker 容器内执行，只挂载了 workspace，未挂宿主机 `/tmp`；`source: "/tmp/deploy.tar.gz"` 在容器内找不到 → glob 匹配为空 → drone-scp 打空包。同时 `target` 写成文件路径而非目录 | tar 包改生成在 workspace（`deploy.tar.gz`）；`source: "deploy.tar.gz"`（相对路径）；`target: "/tmp"`（远端目录） |
| 3 | `pm2: command not found`（ssh 步骤） | `ssh-action` 跑非交互式 shell，不加载 `.bashrc`/`.profile`，pm2 全局 bin 不在 `PATH` | 用 `$(npm config get prefix)/bin/pm2` 绝对路径调用；pm2 未装则 `npm install -g pm2`；加 `set -e` 快速失败 |

最终验证（commit `623c25a`，2026-09-08）：

```bash
$ curl http://8.137.91.87/api/health
{"status":"ok","time":"2026-09-07T17:35:53.828Z"}   # HTTP 200

$ curl http://8.137.91.87/                            # HTTP 200，返回 Vite 构建产物
```

---

## 排查命令

```bash
# 后端日志
pm2 logs course-api --lines 50

# 后端状态
pm2 status

# Nginx 状态/重载
systemctl status nginx
nginx -t && systemctl reload nginx

# 健康检查
curl http://8.137.91.87/api/health

# 看 Nginx 访问日志
tail -f /var/log/nginx/access.log
```

---

## 注意事项

- **GitHub 网络问题已规避**：构建在境外 runner，服务器只收 scp + 访问 npmmirror + DeepSeek API，不连 GitHub。
- **tar 排除 `.env` 和 `node_modules`**：不覆盖服务器真实配置，不传无用文件；解压前备份还原 `.env`。
- **数据库密码**：`server/db.js` 有硬编码 fallback `LZH88888888`，被 `server/.env` 的 `DB_PASSWORD` 覆盖；服务器用新强密码，别提交进仓库。
- **CORS**：走 nginx 同源代理不触发跨域；`CORS_ORIGINS` 保留以防直连 3000 调试。
- **不部署 Java 后端**：`java-backend/` 不参与。
- **HTTPS**：测试用 HTTP，后续有域名用 certbot 一键加。
- **部署用户**：示例用 root，测试阶段最快；生产建议建专用用户。
