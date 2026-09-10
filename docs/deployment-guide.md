# 课程管理实施平台 — 自动部署图形化文档

> **一句话理解：** 谁把代码推到 GitHub 的 `main` 分支（或点一下 Run workflow），GitHub 就会自动把项目构建好、传到阿里云、重启服务，约 2 分钟后线上就是新版本。
>
> 工作流定义：[`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

---

## 0. 30 秒看懂

```mermaid
flowchart LR
    A["你<br/>本地电脑"] -->|"① git push main<br/>或点 Run workflow"| B["GitHub"]
    B -->|"② 自动构建+打包"| C["Actions Runner"]
    C -->|"③ 上传+重启"| D["阿里云"]
    D -->|"④ 2 分钟后"| E["线上更新完成"]
```

**你只需要做 ①，②③④ 全自动。**

---

## 1. 谁负责做什么

| 角色 | 要做的事 | 只做一次还是每次 |
|------|---------|----------------|
| **仓库所有者** | 配置阿里云服务器、SSH 密钥、3 个 GitHub Secrets、邀请协作者 | 只做一次 |
| **协作者（你）** | clone 仓库 → 改代码 → push 到 main（或点 Run workflow）→ 看 Actions 日志 | 每次部署 |
| **GitHub Actions** | 构建、打包、上传、重启 | 全自动 |
| **阿里云服务器** | 跑 pm2 进程，对外提供访问 | 全自动 |

> 协作者**不需要**服务器密码、**不需要**SSH 私钥、**不需要**配置任何 Secret。这些都在 GitHub 仓库里存好了，你 push 即可。

---

## 2. 部署架构总览

```mermaid
flowchart LR
    A["协作者本地电脑<br/>Windows / Mac / Linux"]
    B["GitHub 仓库<br/>main 分支"]
    C["GitHub Actions Runner<br/>ubuntu-latest（临时）"]
    D["阿里云 ECS<br/>/var/www/first-ancient"]
    E["pm2 进程<br/>course-api"]
    F["浏览器<br/>线上站点"]

    A -->|"push 或 Run workflow"| B
    B -->|"触发 deploy.yml"| C
    C -->|"scp 上传 tar.gz"| D
    C -->|"ssh 解压 + pm2 restart"| D
    D --> E --> F
```

| 组件 | 职责 |
|------|------|
| 协作者本地电脑 | 改代码、提交、推送，或手动触发 |
| GitHub 仓库 | 存代码、存 Secrets、触发 workflow |
| Actions Runner | GitHub 免费提供的临时 Ubuntu，执行构建和上传 |
| 阿里云 ECS | 真正跑线上服务的服务器 |
| pm2 | 守护后端进程，崩溃自动拉起 |

---

## 3. 一次部署的完整时序

```mermaid
sequenceDiagram
    autonumber
    actor U as 协作者
    participant GH as GitHub
    participant RT as Actions Runner
    participant SR as 阿里云
    participant PM as pm2

    U->>GH: git push origin main
    GH->>RT: 启动 deploy.yml
    RT->>RT: npm ci + vite build
    RT->>RT: 打包 deploy.tar.gz
    RT->>SR: scp 上传到 /tmp
    RT->>SR: ssh: 解压 + npm ci + pm2 restart
    SR->>PM: 重启 course-api
    PM-->>SR: online
    GH-->>U: Actions 页显示绿色 ✓
```

### 对应 `deploy.yml` 每一步

| 步骤 | 做什么 | 失败会怎样 |
|------|--------|-----------|
| Checkout | 拉代码 | 后面全跑不了 |
| Setup Node.js 20 | 装 Node 20 | 构建跑不了 |
| Build frontend | `npm ci` + `vite build` → `dist/` | 没有产物可部署 |
| Pack artifacts | 打包 `dist + server` 为 tar.gz | 没东西可上传 |
| Upload tarball | scp 上传到服务器 `/tmp` | 服务器拿不到新代码 |
| Extract & restart | ssh 解压、还原 `.env`、`npm ci`、`pm2 restart` | 线上不更新 |

---

## 4. 前置条件（所有者一次性配置，协作者可跳过本节）

```mermaid
flowchart TB
    S1["阿里云 ECS 已开通<br/>已装 Node + pm2"]
    S2["SSH 密钥对：<br/>私钥存到 GitHub Secret<br/>公钥放到服务器 authorized_keys"]
    S3["服务器已有 server/.env<br/>（数据库连接等）"]
    S4["GitHub 仓库 → Settings →<br/>Secrets and variables → Actions<br/>添加 3 个 Secret"]
    S5["邀请协作者：<br/>Settings → Collaborators → Add people"]

    S1 --> S2 --> S3 --> S4 --> S5
```

需要添加的 3 个 GitHub Secrets：

| Secret 名 | 是什么 | 举例 |
|-----------|--------|------|
| `ALIYUN_HOST` | 服务器公网 IP | `47.108.xx.xx` |
| `ALIYUN_USER` | SSH 用户名 | `root` |
| `ALIYUN_SSH_KEY` | SSH 私钥**完整文本**（含 BEGIN/END 行，换行用真实换行） | `-----BEGIN OPENSSH PRIVATE KEY-----` … |

> Secrets 对协作者**完全不可见**，日志里也只显示 `***`。

---

## 5. 协作者在自己电脑上触发自动部署（核心教程）

### 5.0 总流程（6 步）

```mermaid
flowchart TB
    S1["① 被邀请为协作者 + 邮件确认"]
    S2["② git clone 仓库到本地"]
    S3["③ 改代码 + 本地验证"]
    S4["④ 触发部署<br/>方式A: push main / 方式B: 点 Run workflow"]
    S5["⑤ Actions 页看日志等绿勾"]
    S6["⑥ 浏览器访问线上验证"]
    S1 --> S2 --> S3 --> S4 --> S5 --> S6
```

下面每一步都给出**具体命令**和**预期看到的结果**。照着复制粘贴即可。

---

### ① 被仓库所有者邀请为协作者

**所有者做（只需一次）：**
1. 打开 GitHub 仓库页面
2. 点顶部 `Settings` 标签
3. 左侧菜单 `Access` → `Collaborators and teams`
4. 点绿色 `Add people` 按钮 → 输入你的 GitHub 用户名或邮箱 → 确认

**你做：**
1. 邮箱会收到一封 `xxx invited you to xxx/first-ancient` 的邮件
2. 点邮件里的 `Accept invite` 按钮（或直接打开邮件里的邀请链接）
3. 接受后你就有了仓库写权限，可以 push 和触发部署

> 验证：打开仓库页，右上角能看到 `Settings`（如果你看不到 Settings，说明还没被加成功，找所有者确认）。

---

### ② 把仓库克隆到本地

```bash
# 把 <owner> 换成仓库所有者的 GitHub 用户名
git clone https://github.com/<owner>/first-ancient.git
cd first-ancient
```

**预期输出：**
```
Cloning into 'first-ancient'...
remote: Enumerating objects: done.
Receiving objects: 100% (xxx/xxx), done.
```

如果要在本地跑起来看效果：
```bash
npm install      # 装依赖，约 1-2 分钟
npm run dev      # 启动开发服务器
# 浏览器打开 http://localhost:5173/
```
> 只想触发部署、不在本地跑的话，`npm install` 这步可以跳过。

---

### ③ 改代码并本地验证

```bash
# 第一次在这台电脑提交，先配置你的身份（只需一次）
git config user.name  "你的名字"
git config user.email "你的邮箱@example.com"

# 切到 main 并拉最新
git checkout main
git pull origin main

# 然后用编辑器改代码……改完建议本地 npm run dev 看一眼没问题
```

---

### ④ 触发部署（两种方式，任选其一）

#### 方式 A：推送到 main 自动触发（最常用）

```bash
git add .
git commit -m "fix: 修复登录页xxx"
git push origin main
```

**预期输出：**
```
Enumerating objects: done.
Counting objects: 100% (done).
To github.com:xxx/first-ancient.git
   a1b2c3d..e4f5g6h  main -> main
```

**push 完就完了**，GitHub 会自动开始部署，不用再做任何事。

> 如果 push 时报 `! [remote rejected] main -> main (protected branch)`，说明 `main` 被保护，不能直接 push。改用 Pull Request：
> ```bash
> git checkout -b fix/login
> git push origin fix/login
> # 然后到 GitHub 网页发起 PR → 点 Merge → 合并后自动触发
> ```

#### 方式 B：手动点 Run workflow（不改代码也能部署）

**用网页（推荐）：**
1. 打开仓库页，点顶部 `Actions` 标签
2. 左侧列表点 `Deploy to Aliyun`
3. 右上角点 `Run workflow` 下拉框
4. Branch 选 `main`
5. 点绿色 `Run workflow` 按钮
6. 下方列表立刻多一条新的运行记录

**用命令行（gh CLI）：**
```bash
gh auth login                          # 首次需登录，按提示浏览器授权
gh workflow run deploy.yml --ref main  # 触发
gh run watch                           # 实时看本次运行日志
```
> 安装 gh：Windows `winget install GitHub.cli`，Mac `brew install gh`。

---

### ⑤ 在 Actions 页查看部署日志

1. 打开仓库 → 点 `Actions` 标签
2. 中间列表点最新一次 `Deploy to Aliyun`
3. 看状态：🟡 进行中 / ✅ 成功 / ❌ 失败
4. 点 `deploy` 那个 job → 往下展开能看到每一步的日志
5. 失败时找红色那一步，看它的输出报错

```mermaid
flowchart LR
    L1["Actions 标签"] --> L2["点 Deploy to Aliyun"] --> L3["点最新一次运行"] --> L4["点 deploy job"] --> L5["展开看每步日志"]
```

> 一次部署通常 1.5 ~ 2 分钟。看到 ✅ 就说明线上已经更新好了。

---

### ⑥ 浏览器访问线上站点验证

把 `ALIYUN_HOST` 换成实际服务器 IP（问所有者要），浏览器打开：
```
http://<ALIYUN_HOST>/
```
能看到登录页 = 部署成功。

---

### 5.7 完整示例：一次真实的部署会话

下面是一次从改代码到部署成功的完整终端记录，供参考：

```bash
# 假设你已经被加为协作者，且已 clone 过仓库
$ cd first-ancient
$ git checkout main
Switched to branch 'main'
$ git pull origin main
Already up to date.

# 改一个文件
$ notepad src/views/Login.vue   # （或用任意编辑器）

# 本地验证
$ npm run dev
  VITE v6.4.3  ready in 312 ms
  ➜  Local:   http://localhost:5173/
  # 浏览器看一眼没问题，Ctrl+C 停掉

# 提交并推送
$ git add .
$ git commit -m "fix: 登录页按钮颜色"
[main e4f5g6h] fix: 登录页按钮颜色
 1 file changed, 1 insertion(+), 1 deletion(-)
$ git push origin main
Enumerating objects: done.
To github.com:xxx/first-ancient.git
   a1b2c3d..e4f5g6h  main -> main

# 现在打开 GitHub 仓库 → Actions，会看到一条新的运行
# 等约 2 分钟，看到 ✅，浏览器打开 http://<服务器IP>/ 验证
```

---

### 5.8 权限与安全（你可能会问的问题）

| 问题 | 答案 |
|------|------|
| 我能看到服务器密码 / SSH 私钥吗？ | **不能**。Secrets 对协作者完全不可见，日志里也只显示 `***` |
| 我本地需要配置服务器私钥吗？ | **不需要**。私钥只在 GitHub Secrets 里，你 push 就行 |
| 我能触发部署吗？ | 能。协作者有 Write 权限，可以 push 和点 Run workflow |
| 我能改 `deploy.yml` 吗？ | 能，但建议走 PR 让所有者审查 |
| 会不会把别人的部署覆盖？ | 不会串。每次 push 触发一次独立运行，后跑的覆盖先跑的，最终是最新代码 |

---

## 6. 部署后验证（可选，需 SSH 登录服务器）

```bash
ssh root@<ALIYUN_HOST>

pm2 status                       # course-api 应为 online
pm2 logs course-api --lines 50   # 看最近日志，无报错
pm2 monit                        # 实时 CPU/内存

ls -la /var/www/first-ancient/dist/index.html   # 前端文件存在
```

---

## 7. 常见问题

### Q1：我 push 了，Actions 没反应？

- 确认推的是 `main`：`git branch --show-current` 必须输出 `main`
- 确认 [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) 在 main 上存在
- 确认你是协作者（能 push 成功就说明是）；如果你是 fork 的仓库，push 到自己 fork 不会触发原仓库部署

### Q2：SCP / SSH 步骤失败？

- 这是所有者的问题：检查 3 个 Secrets 是否配对、私钥是否完整、服务器安全组是否放行 22 端口
- 协作者能做的：把 Actions 日志里红色那步的报错截图发给所有者

### Q3：构建 `vite build` 失败？

- 先在本地 `npm run build` 跑一遍，本地过了再 push
- 常见是 TypeScript 类型错误，看日志最后几行
- Node 版本：workflow 用 Node 20，本地也建议 20（`node -v`）

### Q4：部署成功但线上还是旧的？

- 浏览器可能缓存了，强刷 `Ctrl+F5`
- 服务器端：`pm2 logs course-api --err --lines 50` 看后端有没有报错
- 极端情况让所有者登服务器 `pm2 restart course-api`

### Q5：服务器上的 `.env` 会被覆盖吗？

**不会。** 打包时 `tar --exclude='server/.env'`，解压前后 workflow 还会备份还原 `.env`。数据库密码等始终保留在服务器本地。

---

## 附：相关文件

- 工作流定义：[`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- 使用文档：[`../USAGE.md`](../USAGE.md)
- Excel 导入模板：[`excel-import-templates.md`](excel-import-templates.md)
