# 接口测试 · curl 脚本集合

> **配套**：`docs/测试用例.md`（用例定义）、`docs/接口文档.md`（接口契约）
> **范围**：`docs/测试用例.md` 中**所有含接口成分**的用例（类型为「接口」或「接口+UI」）。
> **不含**：纯 UI 用例（见配套的《P1/P2 UI 用例扩充》）与 `TC-DIFF-*`（见本文件 §0.4 单列）。

---

## 0. 使用说明

### 0.1 变量与占位符

| 占位符 | 含义 | 获取方式 |
|---|---|---|
| `{{base}}` | 服务基址 | 默认 `http://127.0.0.1:3002` —— **必须与后端端口对齐**，见下 |
| `{{token}}` | 登录后拿到的 JWT | 见 §0.2 |
| `{{adminToken}}` `{{teacherToken}}` `{{studentToken}}` `{{mentorToken}}` `{{leaderToken}}` | 各角色 token | 见 §0.2 |
| `{{courseId}}` `{{studentId}}` `{{projectId}}` `{{scheduleId}}` … | 真实业务 ID | 先用对应 GET 接口查出 |

**端口对齐（不先做这步，下面所有请求都会连接失败）**：

| | 默认端口 |
|---|---|
| 后端服务 | **3000** |
| 前端请求 | **3002** |

任选其一：`cd server && PORT=3002 npm start`，或把 `{{base}}` 改成 `http://127.0.0.1:3000`。

### 0.2 开局：取 5 个角色的 token

```bash
# 管理员
export adminToken=$(curl -s -X POST '{{base}}/api/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"account":"admin","password":"<管理员密码>"}' | jq -r .token)

# 教师（工号登录）
export teacherToken=$(curl -s -X POST '{{base}}/api/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"account":"2026T00026","password":"<身份证后6位>"}' | jq -r .token)

# 学生（学号登录）
export studentToken=$(curl -s -X POST '{{base}}/api/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"account":"202600034","password":"<身份证后6位>"}' | jq -r .token)

# 企业导师（工号，sub_role=mentor）
export mentorToken=$(curl -s -X POST '{{base}}/api/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"account":"2026T00027","password":"<身份证后6位>"}' | jq -r .token)

# 学院领导（工号，sub_role=leader）
export leaderToken=$(curl -s -X POST '{{base}}/api/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"account":"2026T00028","password":"<身份证后6位>"}' | jq -r .token)

# 顺手确认拿到了（每个都应是非空的长串）
echo "$adminToken" | head -c 20; echo
```

> ⚠️ **首登强制改密**：学生/教师/导师/领导若 `need_change_password=1`，登录响应里没有可用 token 用于业务（但 token 本身是签发的）。先按 `TC-COM-007` 改密再继续。
> ⚠️ **初始密码是身份证后 6 位**，不是 `666666` 那类固定值（见 `TC-DIFF-001`）。

### 0.3 通用判读

- `-i` 打印响应头，用于核对 HTTP 状态码（本套用例大量断言 401/403/409/413）。
- 建议装 `jq` 便于取字段；不装也能跑，只是输出不易读。
- **`GET` 接口无需 token**（全局放行），下面的 GET 用例若刻意带 token 是为了模拟真实前端。

### 0.4 TC-DIFF 组（**已知差异，不直接判定 BUG**）

> 本组用例**不是**"验证功能正确"，而是**确认已记录在案的手册—实现差异**。
> 期望值以 `docs/接口文档.md` §4 为准。**请勿按操作手册判定为缺陷。**
> 详见文末 §12。

---

## 1. TC-AUTH 权限与鉴权（接口类）

### TC-AUTH-001 管理员可写全部管理类资源 ｜ P0 ｜ 接口
> 18 条写路由逐条调用，**每条都不应返回 401/403**。

```bash
# ---- 学院 departments ----
curl -i -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试学院A","color":"#3b82f6"}'

curl -i -X PUT '{{base}}/api/departments/{{deptId}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试学院A2","color":"#3b82f6"}'

curl -i -X DELETE '{{base}}/api/departments/{{deptId}}' -H 'Authorization: Bearer {{adminToken}}'

# ---- 班级 classes ----
curl -i -X POST '{{base}}/api/classes' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试班级A","department":"测试学院A"}'

curl -i -X PUT '{{base}}/api/classes/{{classId}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试班级A2","department":"测试学院A"}'

curl -i -X DELETE '{{base}}/api/classes/{{classId}}' -H 'Authorization: Bearer {{adminToken}}'

# ---- 学生 students ----
curl -i -X POST '{{base}}/api/students' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试学生A","phone":"13800001111","email":"s@example.com","department":"测试学院A","className":"测试班级A"}'

curl -i -X PUT '{{base}}/api/students/{{studentPk}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试学生A2","phone":"13800001111","email":"s2@example.com","className":"测试班级A"}'

curl -i -X DELETE '{{base}}/api/students/{{studentPk}}' -H 'Authorization: Bearer {{adminToken}}'

# ---- 教师 teachers（无 POST）----
curl -i -X PUT '{{base}}/api/teachers/{{teacherPk}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试教师A","phone":"13800002222","email":"t@example.com","department":"测试学院A"}'

curl -i -X DELETE '{{base}}/api/teachers/{{teacherPk}}' -H 'Authorization: Bearer {{adminToken}}'

# ---- 专业/分类 categories ----
curl -i -X POST '{{base}}/api/categories' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试专业A","department":"测试学院A","color":"#10b981"}'

curl -i -X PUT '{{base}}/api/categories/{{categoryId}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"测试专业A2","department":"测试学院A"}'

curl -i -X DELETE '{{base}}/api/categories/{{categoryId}}' -H 'Authorization: Bearer {{adminToken}}'

curl -i -X POST '{{base}}/api/categories/sync' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' -d '{}'

# ---- 课程 courses ----
curl -i -X POST '{{base}}/api/courses' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"title":"测试课程A","description":"用于权限用例","teacher":"测试教师A","mentor":"","credits":3,"duration":64,"status":"active","semester":"2026-2027-1"}'

curl -i -X PUT '{{base}}/api/courses/{{courseId}}' -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"title":"测试课程A2"}'

curl -i -X DELETE '{{base}}/api/courses/{{courseId}}' -H 'Authorization: Bearer {{adminToken}}'
```

**预期**：以上每条**都不返回 401/403**（200/201/400/404/409 等业务码均可接受）。

### TC-AUTH-002 学生写管理类资源一律 403 ｜ P0 ｜ 接口
> 同 001 的 18 条路径，把 token 换成学生。**每条必须 403。**

```bash
for spec in "POST /api/departments" "PUT /api/departments/1" "DELETE /api/departments/1" \
            "POST /api/classes" "PUT /api/classes/1" "DELETE /api/classes/1" \
            "POST /api/students" "PUT /api/students/1" "DELETE /api/students/1" \
            "PUT /api/teachers/1" "DELETE /api/teachers/1" \
            "POST /api/categories" "PUT /api/categories/1" "DELETE /api/categories/1" "POST /api/categories/sync" \
            "POST /api/courses" "PUT /api/courses/1" "DELETE /api/courses/1"; do
  m=${spec%% *}; p=${spec#* }
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$m" "{{base}}$p" \
    -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' -d '{}')
  echo "$m $p -> $code $( [ "$code" = 403 ] && echo OK || echo '❌ 期望403' )"
done
```

**预期**：全部 `403`，body `{"success":false,"message":"无权限执行该操作"}`。

### TC-AUTH-003 教师写管理类资源一律 403 ｜ P0 ｜ 接口

```bash
# 与 TC-AUTH-002 完全相同的循环，仅替换 token
for spec in "POST /api/departments" "PUT /api/departments/1" "DELETE /api/departments/1" \
            "POST /api/classes" "PUT /api/classes/1" "DELETE /api/classes/1" \
            "POST /api/students" "PUT /api/students/1" "DELETE /api/students/1" \
            "PUT /api/teachers/1" "DELETE /api/teachers/1" \
            "POST /api/categories" "PUT /api/categories/1" "DELETE /api/categories/1" "POST /api/categories/sync" \
            "POST /api/courses" "PUT /api/courses/1" "DELETE /api/courses/1"; do
  m=${spec%% *}; p=${spec#* }
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$m" "{{base}}$p" \
    -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' -d '{}')
  echo "$m $p -> $code $( [ "$code" = 403 ] && echo OK || echo '❌ 期望403' )"
done
```

**预期**：全部 `403`。

### TC-AUTH-004 企业导师写管理类资源一律 403 ｜ P1 ｜ 接口
```bash
# 同上循环，token 换成 {{mentorToken}}，预期全部 403
```

### TC-AUTH-005 学院领导写管理类资源一律 403 ｜ P1 ｜ 接口
```bash
# 同上循环，token 换成 {{leaderToken}}，预期全部 403
```

### TC-AUTH-006 未登录写管理类资源一律 401 ｜ P0 ｜ 接口
```bash
for spec in "POST /api/departments" "PUT /api/departments/1" "DELETE /api/departments/1" \
            "POST /api/classes" "PUT /api/classes/1" "DELETE /api/classes/1" \
            "POST /api/students" "PUT /api/students/1" "DELETE /api/students/1" \
            "PUT /api/teachers/1" "DELETE /api/teachers/1" \
            "POST /api/categories" "PUT /api/categories/1" "DELETE /api/categories/1" "POST /api/categories/sync" \
            "POST /api/courses" "PUT /api/courses/1" "DELETE /api/courses/1"; do
  m=${spec%% *}; p=${spec#* }
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$m" "{{base}}$p" \
    -H 'Content-Type: application/json' -d '{}')   # 故意不带 Authorization
  echo "$m $p -> $code $( [ "$code" = 401 ] && echo OK || echo '❌ 期望401' )"
done
```

**预期**：全部 `401`，`{"success":false,"message":"未登录或登录已过期"}`。

### TC-AUTH-010 教师可写排课 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/schedules/bulk' \
  -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' \
  -d '{"schedules":[{"courseId":"{{courseId}}","title":"测试课程A","startDate":"2026-10-20","endDate":"2026-10-20","timeSlot":"09:00-11:00","room":"待定","teacher":"测试教师A","mentor":"","day":"周二","semester":"2026-2027-1","className":"测试班级A"}]}'
```

**预期**：**不是 401/403**（应 200，`success:true`）。

### TC-AUTH-011 企业导师可写排课 ｜ P1 ｜ 接口
```bash
curl -i -X POST '{{base}}/api/schedules/bulk' \
  -H 'Authorization: Bearer {{mentorToken}}' -H 'Content-Type: application/json' \
  -d '{"schedules":[{"courseId":"{{courseId}}","title":"测试课程A","startDate":"2026-10-20","endDate":"2026-10-20","timeSlot":"13:00-15:00","room":"待定","teacher":"测试教师A","className":"测试班级A"}]}'
```
**预期**：不是 401/403。

### TC-AUTH-012 学院领导可写排课 ｜ P1 ｜ 接口
```bash
curl -i -X POST '{{base}}/api/schedules/bulk' \
  -H 'Authorization: Bearer {{leaderToken}}' -H 'Content-Type: application/json' \
  -d '{"schedules":[{"courseId":"{{courseId}}","title":"测试课程A","startDate":"2026-10-20","endDate":"2026-10-20","timeSlot":"15:00-17:00","room":"待定","teacher":"测试教师A","className":"测试班级A"}]}'
```
**预期**：不是 401/403。

### TC-AUTH-013 学生写排课一律 403 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/schedules/bulk' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"schedules":[{"courseId":"{{courseId}}","title":"测试课程A","startDate":"2026-10-20","timeSlot":"09:00-11:00","room":"待定","teacher":"测试教师A"}]}'
# 预期 403

curl -i -X PUT '{{base}}/api/schedules/{{scheduleId}}' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"title":"被学生篡改","teacher":"测试教师A","room":"B101","day":"周二","startDate":"2026-10-20","endDate":"2026-10-20","timeSlot":"09:00-11:00"}'
# 预期 403

curl -i -X DELETE '{{base}}/api/schedules/{{scheduleId}}' \
  -H 'Authorization: Bearer {{studentToken}}'
# 预期 403
```

### TC-AUTH-014 未登录写排课 401 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/schedules/bulk' -H 'Content-Type: application/json' \
  -d '{"schedules":[{"courseId":"c1","title":"T","startDate":"2026-10-20","timeSlot":"09:00-11:00"}]}'
# 预期 401

curl -i -X PUT '{{base}}/api/schedules/1' -H 'Content-Type: application/json' -d '{}'    # 预期 401
curl -i -X DELETE '{{base}}/api/schedules/1'                                              # 预期 401
```

### TC-AUTH-015 教师端"新建课程内班级"仍能写入排课 ｜ P0 ｜ 接口+UI
> **接口部分**：直接从后端验 "教师 token 写排课成功"（即 TC-AUTH-010）；
> 并确认排课确实落库：

```bash
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq '.schedules'
```

**预期**：能查到刚写入的排课。**UI 部分见《P1/P2 UI 用例扩充》——但本条是 P0 UI，留人工执行。**

### TC-AUTH-020 学生可调教学类写接口 ｜ P1 ｜ 接口
> **本条用于确认"设计边界"**：教学类接口**有意不校验角色**，学生被拦才是 bug。

```bash
# 1) 保存一条自评（学生本人）
curl -i -X POST '{{base}}/api/eval/save' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"id":"ev-test-self-1","courseId":"{{courseId}}","studentId":"{{studentId}}","sessionNumber":1,"type":"self","score":88,"items":[{"name":"工作量","score":90}],"evaluatorId":"{{studentId}}","evaluatorName":"测试学生A","comment":"自评","createdAt":"2026-10-17 10:00:00"}'
# 预期：不被 403 拦截

# 2) 提交工单进度
curl -i -X POST '{{base}}/api/projects/{{projectId}}/progress' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"studentId":"{{studentId}}","progressType":"工单","status":"submitted","attachments":[{"name":"作答.txt","size":12,"dataUrl":"data:text/plain;base64,aGVsbG8="}]}'
# 预期：不被 403 拦截

# 3) 提交素质评价
curl -i -X POST '{{base}}/api/quality-evaluations/submit' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","studentId":"{{studentId}}","description":"本学期参加技能大赛并获三等奖","files":[{"name":"证书.txt","size":12,"dataUrl":"data:text/plain;base64,aGVsbG8="}]}'
# 预期：不被 403 拦截
```

### TC-AUTH-021 ⚠️ 企业导师可越权调教师写接口 ｜ P1 ｜ 接口
> **【已知差异】** 后端无角色校验，**当前不会被拦**——这是记录项，不是待修 bug。

```bash
curl -i -X POST '{{base}}/api/projects' \
  -H 'Authorization: Bearer {{mentorToken}}' -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","name":"导师越权建的任务","hours":2,"content":"x","keyPoints":"","knowledgePoints":"","orderNo":99,"weekNo":"","visibleTiers":["basic","advanced","excellent"]}'
```

**预期（当前实现）**：**不被 403 拦截**。手册§五说导师端"只读"，但那是**前端隐藏按钮**，接口层拦不住。

### TC-AUTH-030 未带 token 的 GET 仍 200 ｜ P0 ｜ 接口
> **这是防回归的关键用例**：收紧写接口时若"整表挂守卫"，这里会全 401。

```bash
for p in /api/departments /api/classes /api/students /api/teachers /api/categories /api/courses /api/schedules; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "{{base}}$p")
  echo "GET $p -> $code $( [ "$code" = 200 ] && echo OK || echo '❌ 期望200' )"
done
```

**预期**：全部 `200`。

### TC-AUTH-031 学生身份 GET 也 200 ｜ P1 ｜ 接口

```bash
for p in /api/departments /api/classes /api/students /api/teachers /api/categories /api/courses /api/schedules; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "{{base}}$p" -H 'Authorization: Bearer {{studentToken}}')
  echo "GET $p -> $code"
done
```
**预期**：全部 `200`。

### TC-AUTH-032 需 token 的 GET 无 token 应 401 ｜ P1 ｜ 接口
> 这几个 GET 虽被全局放行，但在 handler 内**自行解析 token**。

```bash
curl -i '{{base}}/api/user/profile'     # 预期 401
curl -i '{{base}}/api/auth/verify'      # 预期 401
curl -i '{{base}}/api/todos'            # 预期 401
```

### TC-AUTH-040 密码错返回剩余次数 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"202600034","password":"definitely-wrong"}'
```
**预期**：`401`，message 含 `还剩 4 次机会`（首次错）。

> ⚠️ 本用例会消耗失败计数。跑完请用 `TC-COM-009` 重置密码，或换一个专用测试账号。

### TC-AUTH-041 连错 5 次锁定 15 分钟 ｜ P0 ｜ 接口

```bash
for i in 1 2 3 4 5; do
  echo -n "第 $i 次: "
  curl -s -o /dev/null -w '%{http_code}\n' -X POST '{{base}}/api/user/login' \
    -H 'Content-Type: application/json' \
    -d '{"account":"202600034","password":"definitely-wrong"}'
done
# 预期：前 4 次 401，第 5 次 423

# 再试一次正确密码 —— 锁定期内即使密码正确也应 423
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"202600034","password":"<正确密码>"}'
# 预期 423，code":"ACCOUNT_LOCKED"
```

> ⚠️ **本用例会把账号锁 15 分钟**，请用**专用测试账号**，不要用真账号。

### TC-AUTH-042 禁用账号无法登录 ｜ P1 ｜ 接口

```bash
# 1) 先禁用
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/status' \
  -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"status":"inactive"}'

# 2) 尝试登录
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"{{被禁用账号}}","password":"<密码>"}'
# 预期 403，message":"该账号已被禁用"

# 3) 恢复（务必执行，否则账号一直禁用）
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/status' \
  -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"status":"active"}'
```

### TC-AUTH-043 无效 token 401 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/departments' \
  -H 'Authorization: Bearer this.is.not.a.valid.token' -H 'Content-Type: application/json' \
  -d '{"name":"x"}'
```
**预期**：`401`，`登录凭证无效，请重新登录`。

### TC-AUTH-044 首登标记为真时必须改密 ｜ P0 ｜ 接口+UI
> **接口部分**：

```bash
# 新建一个账号（会自动 need_change_password=1）
curl -s -X POST '{{base}}/api/accounts/students' \
  -H 'Authorization: Bearer {{adminToken}}' -H 'Content-Type: application/json' \
  -d '{"name":"首登测试生","phone":"13800009999","idCard":"510000200001019999","department":"测试学院A","className":"测试班级A"}' | jq .

# 用它的手机号+初始密码登录，观察 need_change_password
curl -s -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"13800009999","password":"<上一步返回的 initialPassword>"}' | jq '{need_change_password, portal}'
```
**预期**：`need_change_password: true`。**UI 部分属 P0，留人工执行。**

### TC-AUTH-050 未登录调小智 401 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/assistant/navigate' -H 'Content-Type: application/json' \
  -d '{"type":"navigate","text":"帮我看成绩"}'
```
**预期**：`401`（此前是公开接口，属本次修复项）。

### TC-AUTH-051 登录后小智可用 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/assistant/navigate' \
  -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
  -d '{"type":"navigate","text":"帮我看成绩"}'
```
**预期**：`200`，`success:true`。

### TC-AUTH-052 超过 20 次/分钟返回 429 ｜ P1 ｜ 接口

```bash
for i in $(seq 1 21); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST '{{base}}/api/assistant/navigate' \
    -H 'Authorization: Bearer {{studentToken}}' -H 'Content-Type: application/json' \
    -d '{"type":"navigate","text":"测试限流"}')
  echo "第 $i 次 -> $code"
done
# 预期：第 1–20 次 200，第 21 次 429
```

> 限流按**用户**维度（`req.user.id`）。换另一个用户的 token 应重新计数。

---

## 2. TC-COM 通用流程（接口类）

### TC-COM-001 统一登录成功（手机号） ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"13800000000","password":"<密码>"}'
```
**预期**：`200`，返回 `token` / `user` / `portal` / `need_change_password`。

### TC-COM-002 统一登录成功（学号/工号） ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"202600034","password":"<密码>"}'
```
**预期**：同 001。确认**手机号与学号都能登录**（后端 `WHERE account=? OR user_no=?`）。

### TC-COM-005 新密码规则校验 ｜ P0 ｜ 接口+UI

```bash
# 1) 少于 8 位
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPassword":"1234567"}'
# 预期 400「新密码至少 8 位」

# 2) 无数字
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPassword":"abcdefgh"}'
# 预期 400「新密码需同时包含字母和数字」

# 3) 无字母
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPassword":"12345678"}'
# 预期 400

# 4) 合规（会真的改掉密码！）
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPassword":"abc12345","oldPassword":"<当前密码>"}'
# 预期 200
```

> ⚠️ 第 4 步**会真的修改密码**，之后请用新密码登录。

### TC-COM-006 改密需验旧密码 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"newPassword":"abc12345","oldPassword":"wrong-old-password"}'
```
**预期**：`400`，`旧密码不正确`。

### TC-COM-007 首登改密可不传旧密码 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/user/change-password' -H 'Authorization: Bearer {{newAccountToken}}' \
  -H 'Content-Type: application/json' -d '{"newPassword":"abc12345"}'
```
**预期**：`200`，且该用户 `need_change_password` 被置 0。

### TC-COM-010 个人信息读取 ｜ P1 ｜ 接口+UI

```bash
curl -s '{{base}}/api/user/profile' -H 'Authorization: Bearer {{studentToken}}' | jq .profile
```
**预期**：含 `name/userNo/phone/department/role/subRole/roleLabel/className`。

### TC-COM-011 修改绑定手机号 ｜ P1 ｜ 接口

```bash
# 1) 格式错
curl -i -X POST '{{base}}/api/user/change-phone' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPhone":"123","password":"<当前密码>"}'
# 预期 400

# 2) 密码错
curl -i -X POST '{{base}}/api/user/change-phone' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPhone":"13900000001","password":"wrong"}'
# 预期 400「当前密码不正确」

# 3) 与原号相同
curl -i -X POST '{{base}}/api/user/change-phone' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPhone":"13800000000","password":"<当前密码>"}'
# 预期 400「新手机号与当前相同」

# 4) 已被他人占用
curl -i -X POST '{{base}}/api/user/change-phone' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPhone":"13800000001","password":"<当前密码>"}'
# 预期 409「该手机号已被其他账号使用」

# 5) 正常（会真的改掉，之后用新号登录）
curl -i -X POST '{{base}}/api/user/change-phone' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"newPhone":"13900000009","password":"<当前密码>"}'
# 预期 200
```

### TC-COM-012 上传头像大小限制 ｜ P2 ｜ 接口

```bash
# 构造 >400KB 的 base64（这里用 500KB 的 A 填充）
BIG=$(head -c 500000 /dev/zero | tr '\0' 'A')
curl -i -X POST '{{base}}/api/user/avatar' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d "{\"avatar\":\"data:image/png;base64,$BIG\"}" \
  | head -c 300
```
**预期**：`400`，`头像过大，请压缩后再上传`。

```bash
# 空头像
curl -i -X POST '{{base}}/api/user/avatar' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"avatar":""}'
# 预期 400
```

### TC-COM-019 待办跨设备保留 ｜ P1 ｜ 接口+UI
> **接口部分**（模拟"另一台设备"）：

```bash
# 1) 写入一份待办（全量覆盖式同步）
curl -i -X POST '{{base}}/api/todos/sync' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"todos":[{"id":"todo-test-1","title":"跨设备测试待办","completed":true,"createdAt":"2026-10-17","dueDate":"","createdBy":""}]}'

# 2) 模拟重登/换设备：重新读取
curl -s '{{base}}/api/todos' -H 'Authorization: Bearer {{studentToken}}' | jq '.todos'
```
**预期**：能回读到 `todo-test-1` 且 `completed: true`（说明状态已落库，不依赖浏览器 localStorage）。

### TC-COM-020 待办隔离（不可读他人） ｜ P0 ｜ 接口

```bash
# 用学生 token 尝试读别人的待办（传 createdBy 参数应被忽略）
curl -s '{{base}}/api/todos?createdBy=另一个人的名字' -H 'Authorization: Bearer {{studentToken}}' | jq .
```
**预期**：**只返回该学生自己的待办**——服务端从 JWT 取 `created_by`，忽略该参数。

---

## 3. TC-ADM 管理员端（接口类）

### TC-ADM-010 创建学院 ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"测试学院A","color":"#3b82f6"}'
```
**预期**：`201`，返回 `department`。

### TC-ADM-011 学院重名被拒 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"测试学院A"}'
```
**预期**：`409`，`学院名称已存在`。

### TC-ADM-012 学院名为空 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":""}'
```
**预期**：`400`，`学院名称不能为空`。

### TC-ADM-013 查看删除影响面 ｜ P1 ｜ 接口+UI

```bash
curl -s '{{base}}/api/departments/{{deptId}}/usage' | jq .
```
**预期**：返回 `{ success, usage:{categoryCount,courseCount,classCount,studentCount,teacherCount,scheduleCount,…}, hasData }`。

### TC-ADM-014 非空学院直接删除被拒 ｜ P0 ｜ 接口

```bash
curl -i -X DELETE '{{base}}/api/departments/{{非空deptId}}' -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：`409`，`该学院下还有课程分类、课程、班级、学生或教师数据`，body 带 `details`。

### TC-ADM-015 空学院可直接删除 ｜ P1 ｜ 接口

```bash
# 先建一个空学院
NEWID=$(curl -s -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"空学院-待删"}' | jq -r '.department.id')
# 再删它
curl -i -X DELETE "{{base}}/api/departments/$NEWID" -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：`200`，`删除成功`。

### TC-ADM-016 强制级联删除学院 ｜ P0 ｜ 接口

```bash
curl -i -X DELETE '{{base}}/api/departments/{{有数据的deptId}}?force=true' \
  -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：`200`；该学院下课程/班级/学生/评价/成绩等**全部被删（不可逆）**。
**复核**：`curl -s '{{base}}/api/departments' | jq '.departments[] | select(.id=="{{deptId}}")'` 应为空。

### TC-ADM-017 学生不可删学院 ｜ P0 ｜ 接口

```bash
curl -i -X DELETE '{{base}}/api/departments/{{deptId}}' -H 'Authorization: Bearer {{studentToken}}'
```
**预期**：`403`。

### TC-ADM-020 创建专业 ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/categories' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试专业A","department":"测试学院A","color":"#10b981"}'
```
**预期**：`201`。

### TC-ADM-021 专业改名同步课程 ｜ P1 ｜ 接口

```bash
# 1) 改名
curl -i -X PUT '{{base}}/api/categories/{{categoryId}}' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"测试专业A-改名后","department":"测试学院A"}'

# 2) 核对挂在该专业下的课程冗余字段是否同步
curl -s '{{base}}/api/courses?categoryId={{categoryId}}' | jq '.courses[] | {id,title,department}'
```
**预期**：改名成功；课程的学院/分类冗余字段同步更新。

### TC-ADM-022 从排课反推分类 ｜ P2 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/categories/sync' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{}'
# 再跑一次验幂等
curl -i -X POST '{{base}}/api/categories/sync' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{}'
```
**预期**：按排课记录生成缺失的专业/课程；**重复调用不产生重复数据**。

### TC-ADM-023 删除专业 ｜ P1 ｜ 接口+UI

```bash
curl -i -X DELETE '{{base}}/api/categories/{{categoryId}}' -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：删除成功。

### TC-ADM-030 单个添加教师 ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/accounts/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试教师甲","phone":"13800002222","idCard":"510000199001012222","subRole":"teacher","department":"测试学院A"}'
```
**预期**：`201`，返回 `account.userNo`（形如 `2026T00026`）与 `initialPassword`。

### TC-ADM-031 批量添加教师 ｜ P1 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/accounts/import' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "rows": [
    {"name":"测试教师乙","phone":"13800002223","idCard":"510000199001012223","identity":"教师","department":"测试学院A"},
    {"name":"测试教师丙","phone":"13800002224","idCard":"510000199001012224","identity":"teacher","department":"测试学院A"}
  ]
}'
```
**预期**：`inserted: 2`。

### TC-ADM-033 编辑教师 ｜ P1 ｜ 接口+UI

```bash
curl -i -X PUT '{{base}}/api/teachers/{{teacherPk}}' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试教师甲-改名","phone":"13800002229","email":"newt@example.com","department":"测试学院A"}'
```
**预期**：`200`，字段更新。

### TC-ADM-034 删除教师 ｜ P1 ｜ 接口+UI

```bash
curl -i -X DELETE '{{base}}/api/teachers/{{teacherPk}}' -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：`200`；有关联授课时受保护（见 `TC-BND` 类）。

### TC-ADM-040 创建课程 ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/courses' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "title":"算法与数据结构",
  "description":"课程简介",
  "teacher":"测试教师甲",
  "mentor":"",
  "cover":"",
  "credits":3,
  "duration":64,
  "status":"active",
  "semester":"2026-2027-1"
}'
```
**预期**：`201`，返回课程对象，`id` 自动生成。

### TC-ADM-041 课程字段完整存入 ｜ P1 ｜ 接口

```bash
curl -s '{{base}}/api/courses/{{courseId}}' | jq '.course | {id,title,credits,duration,semester,teacher,mentor,status}'
```
**预期**：各字段与提交一致。

### TC-ADM-042 修改课程 ｜ P1 ｜ 接口

```bash
# 只传 title —— 其余字段应保留原值
curl -i -X PUT '{{base}}/api/courses/{{courseId}}' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"title":"算法与数据结构（改名）"}'

# 复核：credits/duration/semester 不应被清空
curl -s '{{base}}/api/courses/{{courseId}}' | jq '.course | {title,credits,duration,semester}'
```
**预期**：`title` 变了，其余**保持原值**。

### TC-ADM-043 删除课程级联删排课 ｜ P0 ｜ 接口

```bash
# 删前记下排课数
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq '.schedules | length'

curl -i -X DELETE '{{base}}/api/courses/{{courseId}}' -H 'Authorization: Bearer {{adminToken}}'

# 删后应为 0
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq '.schedules | length'
```
**预期**：课程删除；该课程排课**一并删除**（长度变 0）。

### TC-ADM-044 按学院/教师/分类查课程 ｜ P2 ｜ 接口

```bash
curl -s '{{base}}/api/courses?department=测试学院A' | jq '.courses | length'
curl -s '{{base}}/api/courses?teacher=测试教师甲' | jq '.courses | length'
curl -s '{{base}}/api/courses?categoryId={{categoryId}}' | jq '.courses | length'
curl -s '{{base}}/api/courses?departmentId={{deptId}}' | jq '.courses | length'
```
**预期**：各筛选参数生效，结果与预期集合一致。

### TC-ADM-050 单个添加学生 ｜ P0 ｜ 接口+UI
> 注：`/api/accounts/students` 与 `/api/students` 都能建学生。**推荐用前者**（它会派生学号与初始密码）。

```bash
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试学生甲","phone":"13800003333","idCard":"510000200001013333","department":"测试学院A","className":"测试班级A"}'
```
**预期**：`201`，返回 `userNo`（形如 `202600035`）与 `initialPassword`。

### TC-ADM-051 批量添加学生 ｜ P1 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/accounts/import' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "rows": [
    {"name":"测试学生乙","phone":"13800003334","idCard":"510000200001013334","identity":"学生","department":"测试学院A","className":"测试班级A"},
    {"name":"测试学生丙","phone":"13800003335","idCard":"510000200001013335","identity":"student","department":"测试学院A","className":"测试班级A"}
  ]
}'
```
**预期**：`inserted: 2`。

### TC-ADM-052 学生列表分页上限 ｜ P2 ｜ 接口
> ⚠️ **注意**：学生接口与账号接口行为**不同**——学生接口**没有 100 封顶**。

```bash
# 学生接口：pageSize 不封顶，传多少给多少
curl -s '{{base}}/api/students?pageSize=200' | jq '.students | length'
# 预期：接近 200（受库里总数限制），而不是被压到 100

# 对比账号接口：硬封顶 100
curl -s '{{base}}/api/accounts?pageSize=200' -H 'Authorization: Bearer {{adminToken}}' | jq '{pageSize, count:(.accounts|length)}'
# 预期：pageSize 被压到 100
```

### TC-ADM-053 编辑/删除学生 ｜ P1 ｜ 接口+UI

```bash
curl -i -X PUT '{{base}}/api/students/{{studentPk}}' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试学生甲-改名","phone":"13800003339","email":"s9@example.com","className":"测试班级A"}'

curl -i -X DELETE '{{base}}/api/students/{{studentPk}}' -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：编辑生效；删除后列表移除。

### TC-ADM-060 账号列表查询与筛选 ｜ P0 ｜ 接口

```bash
curl -s '{{base}}/api/accounts' -H 'Authorization: Bearer {{adminToken}}' | jq '{total,page,pageSize}'
curl -s '{{base}}/api/accounts?keyword=测试' -H 'Authorization: Bearer {{adminToken}}' | jq '.accounts | length'
curl -s '{{base}}/api/accounts?role=student' -H 'Authorization: Bearer {{adminToken}}' | jq '.accounts | length'
curl -s '{{base}}/api/accounts?refType=teacher' -H 'Authorization: Bearer {{adminToken}}' | jq '.accounts | length'
curl -s '{{base}}/api/accounts?status=active' -H 'Authorization: Bearer {{adminToken}}' | jq '.accounts | length'
curl -s '{{base}}/api/accounts?page=2&pageSize=5' -H 'Authorization: Bearer {{adminToken}}' | jq '{page,pageSize}'
```
**预期**：各参数生效；返回 `total/page/pageSize/accounts`。

### TC-ADM-061 账号列表分页上限 ｜ P1 ｜ 接口

```bash
curl -s '{{base}}/api/accounts?pageSize=200' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '{返回的pageSize:.pageSize, 实际条数:(.accounts|length)}'
```
**预期**：`pageSize` 被**压到 100**。

### TC-ADM-062 单独添加账号（四种身份） ｜ P0 ｜ 接口+UI

```bash
# 学生
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"账号学生","phone":"13800004441","idCard":"510000200001014441","department":"测试学院A","className":"测试班级A"}'

# 教师
curl -i -X POST '{{base}}/api/accounts/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"账号教师","phone":"13800004442","idCard":"510000199001014442","subRole":"teacher","department":"测试学院A"}'

# 企业导师
curl -i -X POST '{{base}}/api/accounts/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"账号导师","phone":"13800004443","idCard":"510000199001014443","subRole":"mentor","department":"测试学院A"}'

# 学院领导
curl -i -X POST '{{base}}/api/accounts/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"账号领导","phone":"13800004444","idCard":"510000199001014444","subRole":"leader","department":"测试学院A"}'
```
**预期**：四条均 `201`；后三条的 `subRole` 分别为 `teacher` / `mentor` / `leader`。

### TC-ADM-063 账号入库查重 ｜ P0 ｜ 接口

```bash
# 1) 重复身份证
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"重复身份证","phone":"13800004455","idCard":"510000200001014441","department":"测试学院A"}'
# 预期 409 ID_CARD_EXISTS（message 含已有学号）

# 2) 重复手机号
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"重复手机号","phone":"13800004441","idCard":"510000200001014456","department":"测试学院A"}'
# 预期 409 PHONE_EXISTS
```

### TC-ADM-064 身份证/手机号格式校验 ｜ P1 ｜ 接口

```bash
# 身份证非 18 位
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"格式测试1","phone":"13800004466","idCard":"12345","department":"测试学院A"}'
# 预期 400 ID_CARD_FORMAT

# 手机号非 11 位
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"格式测试2","phone":"123","idCard":"510000200001014467","department":"测试学院A"}'
# 预期 400 PHONE_FORMAT

# 姓名为空
curl -i -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"","phone":"13800004468","idCard":"510000200001014468","department":"测试学院A"}'
# 预期 400 NAME_REQUIRED
```

### TC-ADM-065 批量导入逐行容错 ｜ P0 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/accounts/import' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "rows": [
    {"name":"合法学生1","phone":"13800005551","idCard":"510000200001015551","identity":"学生","department":"测试学院A","className":"测试班级A"},
    {"name":"非法身份","phone":"13800005552","idCard":"510000200001015552","identity":"路人甲","department":"测试学院A"},
    {"name":"重复身份证","phone":"13800005553","idCard":"510000200001015551","identity":"学生","department":"测试学院A"},
    {"name":"合法学生2","phone":"13800005554","idCard":"510000200001015554","identity":"student","department":"测试学院A","className":"测试班级A"}
  ]
}'
```
**预期**：`inserted: 2`、`failed: 2`；`errors` 精确到**行号**（第 2 行身份非法、第 3 行身份证重复）与原因。

### TC-ADM-066 身份中英文映射 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/accounts/import' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "rows": [
    {"name":"映射-学","phone":"13800006601","idCard":"510000200001016601","identity":"学","department":"测试学院A","className":"测试班级A"},
    {"name":"映射-student","phone":"13800006602","idCard":"510000200001016602","identity":"student","department":"测试学院A","className":"测试班级A"},
    {"name":"映射-教师","phone":"13800006603","idCard":"510000199001016603","identity":"教师","department":"测试学院A"},
    {"name":"映射-老师","phone":"13800006604","idCard":"510000199001016604","identity":"老师","department":"测试学院A"},
    {"name":"映射-mentor","phone":"13800006605","idCard":"510000199001016605","identity":"mentor","department":"测试学院A"},
    {"name":"映射-企导","phone":"13800006606","idCard":"510000199001016606","identity":"企导","department":"测试学院A"},
    {"name":"映射-leader","phone":"13800006607","idCard":"510000199001016607","identity":"leader","department":"测试学院A"},
    {"name":"映射-院领导","phone":"13800006608","idCard":"510000199001016608","identity":"院领导","department":"测试学院A"}
  ]
}'
```
**预期**：全部 `inserted: 8`。之后用 `GET /api/accounts?keyword=映射-` 核对各条的 `role` / `sub_role`。

```bash
curl -s '{{base}}/api/accounts?keyword=映射-' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '.accounts[] | {name, role, sub_role}'
```

### TC-ADM-067 启用/禁用账号 ｜ P0 ｜ 接口+UI

```bash
# 1) 禁用
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/status' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"status":"inactive"}'

# 2) 被禁用后无法登录
curl -i -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"{{被禁用账号}}","password":"<密码>"}'
# 预期 403

# 3) 恢复
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/status' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"status":"active"}'

# 4) 非法状态值
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/status' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"status":"frozen"}'
# 预期 400 INVALID_STATUS
```

### TC-ADM-068 导出（三种） ｜ P1 ｜ 接口+UI

```bash
# 1) 全量（脱敏）
curl -s '{{base}}/api/accounts/export' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '.accounts[0] | {id_card, name}'
# 预期：id_card 为 "******"，且【不含】initial_password

# 2) 学生（含明文初始密码）
curl -s '{{base}}/api/accounts/export-students' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '.students[0]'
# 预期：含中文列名 学号/姓名/手机号/学院/状态/初始密码

# 3) 教师（含明文初始密码，身份为中文）
curl -s '{{base}}/api/accounts/export-teachers' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '.teachers[0]'
# 预期：含 姓名/手机号/邮箱/学院/工号/身份/初始密码，身份为中文（教师/企业导师/学院领导）
```

### TC-ADM-069 学号/工号派发规则 ｜ P1 ｜ 接口

```bash
# 连续建 3 个学生，看学号是否递增
for i in 1 2 3; do
  curl -s -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"派号测试$i\",\"phone\":\"1380000770$i\",\"idCard\":\"51000020000101770$i\",\"department\":\"测试学院A\",\"className\":\"测试班级A\"}" \
    | jq '{userNo:.account.userNo}'
done
```
**预期**：`userNo` 形如 `202600035` / `202600036` / `202600037`，**递增且不重复**。

```bash
# 教师：形如 2026T00026
curl -s -X POST '{{base}}/api/accounts/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"派号测试教师","phone":"13800007799","idCard":"510000199001017799","subRole":"teacher","department":"测试学院A"}' \
  | jq '{userNo:.account.userNo}'
```

### TC-ADM-070 分配学院/班级 ｜ P1 ｜ 接口+UI

```bash
curl -i -X PUT '{{base}}/api/accounts/{{userId}}/assign' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"department":"测试学院A","className":"测试班级A"}'

# 复核：users.department 与 students.class_name 是否同步
curl -s '{{base}}/api/accounts?keyword={{关键字}}' -H 'Authorization: Bearer {{adminToken}}' \
  | jq '.accounts[0] | {name, department}'
```
**预期**：`200`；学生表 `department` 与 `class_name` **同步更新**。

### TC-ADM-080 新增单条排课 ｜ P0 ｜ 接口+UI

```bash
curl -i -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules": [{
    "courseId":"{{courseId}}","title":"算法与数据结构",
    "startDate":"2026-10-20","endDate":"2027-01-10","timeSlot":"3-4",
    "room":"A301","teacher":"测试教师甲","mentor":"","day":"3",
    "semester":"2026-2027-1","className":"测试班级A"
  }]
}'
```
**预期**：`inserted: 1`。

### TC-ADM-081 批量导入排课 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules": [
    {"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-10-21","endDate":"2026-10-21","timeSlot":"1-2","room":"A302","teacher":"测试教师甲","day":"3","semester":"2026-2027-1","className":"测试班级A"},
    {"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-10-22","endDate":"2026-10-22","timeSlot":"5-6","room":"A303","teacher":"测试教师甲","day":"4","semester":"2026-2027-1","className":"测试班级A"}
  ]
}'
```
**预期**：返回 `inserted/updated/skipped` 计数与 message。

### TC-ADM-082 排课去重 — 全班级覆盖 ｜ P0 ｜ 接口

```bash
# 1) 先导入一条「全班级」排课（className 为空）
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-01","endDate":"2026-11-01","timeSlot":"7-8","room":"B101","teacher":"测试教师甲","day":"5","semester":"2026-2027-1","className":""}]
}' | jq .

# 2) 再导入同时段、带班级的排课 —— 应被跳过
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-01","endDate":"2026-11-01","timeSlot":"7-8","room":"B102","teacher":"测试教师甲","day":"5","semester":"2026-2027-1","className":"测试班级A"}]
}' | jq .
```
**预期**：第 2 次 `coveredByGlobal: 1`、`skipped: 1`，message 含"已由全班级排课覆盖"。

### TC-ADM-083 排课去重 — 班级专属反覆盖 ｜ P0 ｜ 接口

```bash
# 1) 先导入某班专属
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-02","endDate":"2026-11-02","timeSlot":"9-10","room":"C101","teacher":"测试教师甲","day":"6","semester":"2026-2027-1","className":"测试班级A"}]
}' | jq .

# 2) 再导入同时段的「全班级」—— 应被跳过
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-02","endDate":"2026-11-02","timeSlot":"9-10","room":"C102","teacher":"测试教师甲","day":"6","semester":"2026-2027-1","className":""}]
}' | jq .
```
**预期**：第 2 次 `shadowedByClass: 1`、`skipped: 1`。

### TC-ADM-084 排课去重 — 同班重复为更新 ｜ P1 ｜ 接口

```bash
# 连续两次导入同班同时段，第二次应记为 updated
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-03","endDate":"2026-11-03","timeSlot":"11-12","room":"D101","teacher":"测试教师甲","day":"1","semester":"2026-2027-1","className":"测试班级A"}]
}' | jq .updated

curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"算法与数据结构（改教室）","startDate":"2026-11-03","endDate":"2026-11-03","timeSlot":"11-12","room":"D999","teacher":"测试教师甲","day":"1","semester":"2026-2027-1","className":"测试班级A"}]
}' | jq .
```
**预期**：第二次 `updated: 1`（不是 inserted）。

### TC-ADM-085 排课并行班 ｜ P1 ｜ 接口

```bash
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules": [
    {"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-04","endDate":"2026-11-04","timeSlot":"13-14","room":"E101","teacher":"测试教师甲","day":"2","semester":"2026-2027-1","className":"测试班级A"},
    {"courseId":"{{courseId}}","title":"算法与数据结构","startDate":"2026-11-04","endDate":"2026-11-04","timeSlot":"13-14","room":"E102","teacher":"测试教师甲","day":"2","semester":"2026-2027-1","className":"测试班级B"}
  ]
}' | jq .
```
**预期**：`inserted: 2`（两个不同非空班级 = 合法并行班，都插入）。

### TC-ADM-086 排课缺必填字段被跳过 ｜ P2 ｜ 接口

```bash
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules": [
    {"courseId":"{{courseId}}","title":"","startDate":"2026-11-05","timeSlot":"1-2"},
    {"courseId":"{{courseId}}","title":"缺日期","startDate":"","timeSlot":"1-2"},
    {"courseId":"{{courseId}}","title":"缺时段","startDate":"2026-11-05","timeSlot":""},
    {"courseId":"{{courseId}}","title":"完整行","startDate":"2026-11-05","endDate":"2026-11-05","timeSlot":"1-2","room":"F101","teacher":"测试教师甲","day":"3","semester":"2026-2027-1","className":"测试班级A"}
  ]
}' | jq '{inserted, skipped}'
```
**预期**：`skipped: 3`、`inserted: 1`。

### TC-ADM-087 排课导入自动建课程/教师 ｜ P2 ｜ 接口

```bash
curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"course-auto-created-1","title":"自动创建测试课","startDate":"2026-11-06","endDate":"2026-11-06","timeSlot":"1-2","room":"G101","teacher":"自动创建测试师","day":"4","semester":"2026-2027-1","className":"测试班级A"}]
}' | jq .

# 复核课程是否被自动创建
curl -s '{{base}}/api/courses/course-auto-created-1' | jq '.course.title'
```
**预期**：课程 `course-auto-created-1` 被创建，标题为"自动创建测试课"。

### TC-ADM-088 改排课不影响班级归属 ｜ P0 ｜ 接口

```bash
# 1) 造一条班级专属排课，记下 id
SID=$(curl -s -X POST '{{base}}/api/schedules/bulk' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "schedules":[{"courseId":"{{courseId}}","title":"班级归属测试","startDate":"2026-11-07","endDate":"2026-11-07","timeSlot":"3-4","room":"H101","teacher":"测试教师甲","day":"5","semester":"2026-2027-1","className":"测试班级A"}]
}' >/dev/null; \
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq -r '.schedules[] | select(.title=="班级归属测试") | .id')

# 2) 只改 room，不传 className
curl -i -X PUT "{{base}}/api/schedules/$SID" -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{
  "title":"班级归属测试","teacher":"测试教师甲","mentor":"","semester":"2026-2027-1",
  "room":"H999","day":"5","startDate":"2026-11-07","endDate":"2026-11-07","timeSlot":"3-4"
}'

# 3) 复核：className 必须仍是「测试班级A」，不能变成空（空=全班级）
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq ".schedules[] | select(.id==\"$SID\") | {room, className}"
```
**预期**：`room` 变了，`className` **仍是「测试班级A」**（不能被整行 UPDATE 写成 NULL）。

### TC-ADM-089 删除排课 ｜ P1 ｜ 接口+UI

```bash
curl -i -X DELETE '{{base}}/api/schedules/{{scheduleId}}' -H 'Authorization: Bearer {{adminToken}}'
curl -s '{{base}}/api/schedules?courseId={{courseId}}' | jq ".schedules[] | select(.id==\"{{scheduleId}}\")"
# 预期：200；复核查询无该条
```

---

## 4. TC-TCH 教师端（接口类）

### TC-TCH-015 课程内班级的权威存储 ｜ P1 ｜ 接口

```bash
# 1) 设置某生在本课程内的班级
curl -i -X PUT '{{base}}/api/teaching/enrollments/class' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","studentId":"{{studentId}}","className":"测试班级A"}'

# 2) 回读映射
curl -s '{{base}}/api/teaching/enrollments/class-map?courseId={{courseId}}' | jq .

# 3) 传空串 = 移出班级
curl -i -X PUT '{{base}}/api/teaching/enrollments/class' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","studentId":"{{studentId}}","className":""}'
```
**预期**：落库；`class-map` 可回读；空串能移出班级。

### TC-TCH-016 只按姓名无法匹配学生 ｜ P0 ｜ 接口

```bash
curl -s '{{base}}/api/teaching/students-resolve?keyword=张三' | jq .
curl -s '{{base}}/api/teaching/students-resolve?studentNo=&phone=&idCard=&keyword=张三' | jq .
```
**预期**：`reason: "no-identity"`，**匹配失败**。（姓名会重名，不作判定依据。）

### TC-TCH-022 课程标准文件超限 ｜ P1 ｜ 接口+UI
> **接口部分**（绕过前端，直接打后端）：

```bash
# 构造一个 >1MiB 的 base64（触发 nginx/Express 的请求体上限）
BIG=$(head -c 1400000 /dev/zero | tr '\0' 'A')
curl -i -X POST '{{base}}/api/course-standards' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d "{\"courseId\":\"{{courseId}}\",\"name\":\"超大文件.txt\",\"size\":1400000,\"dataUrl\":\"data:text/plain;base64,$BIG\",\"uploader\":\"测试教师甲\"}" \
  | head -c 400
```
**预期**：`413`，提示"上传内容过大，请压缩文件后重试…"。
> ⚠️ 上限是 **720KB**（文件）/ **1 MiB**（请求体），**不是 20MB，也不是手册说的 2MB**。见 `TC-DIFF-013`。

### TC-TCH-023 删除课程标准 ｜ P2 ｜ 接口

```bash
# 先上传一个小的
CSTD=$(curl -s -X POST '{{base}}/api/course-standards' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","name":"待删.txt","size":12,"dataUrl":"data:text/plain;base64,aGVsbG8=","uploader":"测试教师甲"}' \
  | jq -r '.data.id')

curl -i -X DELETE "{{base}}/api/course-standards/$CSTD" -H 'Authorization: Bearer {{teacherToken}}'
```
**预期**：`200`（**注意该族接口返回 `code/msg/data` 格式**）。

### TC-TCH-032 ⚠️ 接口层不校验合计 ｜ P1 ｜ 接口
> **【已知差异】** 后端不校验权重合计，期望值是"**保存成功**"，不是"被拒绝"。

```bash
curl -i -X PUT '{{base}}/api/grade-config/{{courseId}}' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{
  "regularWeight": 70, "midtermWeight": 30, "finalWeight": 37,
  "qualityEvalWeight": 0, "qualityEvalMaxBonus": 5,
  "selfEvalWeight": 10, "peerReviewWeight": 10, "interGroupEvalWeight": 10,
  "teacherScoreWeight": 50, "mentorScoreWeight": 20,
  "midtermExamWeight": 50, "midtermProjectWeight": 50,
  "finalExamWeight": 50, "finalProjectWeight": 50
}'
```
**预期（当前实现）**：**200 保存成功**（合计 = 137%）。前端才拦截。

### TC-TCH-033 权重缺省字段用默认值 ｜ P1 ｜ 接口

```bash
curl -i -X PUT '{{base}}/api/grade-config/{{courseId}}' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{"regularWeight": 50}'

curl -s '{{base}}/api/grade-config/{{courseId}}' | jq '.config'
```
**预期**：`200`；未传字段取默认值，**不报错**。

### TC-TCH-034 首次读取返回默认配置 ｜ P1 ｜ 接口

```bash
curl -s '{{base}}/api/grade-config/{{未配置的courseId}}' | jq '{persisted, config:.config}'
```
**预期**：`persisted: false`，`config` 为默认值。

### TC-TCH-042 任务可见层次 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/projects' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{
  "courseId":"{{courseId}}","name":"仅基础层可见的任务","hours":2,
  "content":"x","keyPoints":"","knowledgePoints":"","orderNo":90,"weekNo":"","visibleTiers":["basic"]
}'

curl -s '{{base}}/api/projects?courseId={{courseId}}' | jq '.data[] | select(.name=="仅基础层可见的任务") | {name, visibleTiers}'
```
**预期**：`visibleTiers: ["basic"]` 正确落库。

### TC-TCH-043 批量新建任务 ｜ P2 ｜ 接口
> **注意**：body **直接是数组**，不是 `{projects:[…]}`。

```bash
curl -i -X POST '{{base}}/api/projects/bulk' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '[
  {"courseId":"{{courseId}}","name":"批量任务A","hours":2,"content":"a","keyPoints":"","knowledgePoints":"","orderNo":91,"weekNo":"","visibleTiers":["basic","advanced","excellent"]},
  {"courseId":"{{courseId}}","name":"批量任务B","hours":3,"content":"b","keyPoints":"","knowledgePoints":"","orderNo":92,"weekNo":"","visibleTiers":["basic","advanced","excellent"]}
]'
```
**预期**：两条都创建成功。

### TC-TCH-044 锁定任务后禁止修改 ｜ P0 ｜ 接口

```bash
# 1) 锁定
curl -i -X PATCH '{{base}}/api/projects/{{projectId}}/lock' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{"locked":true}'

# 2) 尝试修改 —— 应被拒
curl -i -X PUT '{{base}}/api/projects/{{projectId}}' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","name":"改名试试","hours":2,"content":"x","keyPoints":"","knowledgePoints":"","orderNo":1,"weekNo":"","visibleTiers":["basic"]}'
```
**预期**：修改被**拒绝**（`409`）。

### TC-TCH-045 截止时间与锁定互斥 ｜ P1 ｜ 接口

```bash
# 1) 设截止时间
curl -i -X PATCH '{{base}}/api/projects/{{projectId}}/close-at' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{"closeAt":"2026-12-01T23:59:59"}'

# 2) 截止未到时尝试加锁 —— 应被拒
curl -i -X PATCH '{{base}}/api/projects/{{projectId}}/lock' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{"locked":true}'

# 3) 反向：先锁定，再改 closeAt —— 应被拒
curl -i -X PATCH '{{base}}/api/projects/{{projectId}}/close-at' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' -d '{"closeAt":"2026-12-31T23:59:59"}'
```
**预期**：两种操作**均被拒绝**。

### TC-TCH-046 删除任务级联删文件与进度 ｜ P1 ｜ 接口

```bash
# 1) 建任务 + 传个文件
PID=$(curl -s -X POST '{{base}}/api/projects' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","name":"待删任务","hours":2,"content":"x","keyPoints":"","knowledgePoints":"","orderNo":93,"weekNo":"","visibleTiers":["basic"]}' \
  | jq -r '.data.id')

curl -s -X POST '{{base}}/api/projects/files' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PID\",\"fileType\":\"预习资料\",\"name\":\"资料.txt\",\"size\":12,\"dataUrl\":\"data:text/plain;base64,aGVsbG8=\"}"

# 2) 删除任务
curl -i -X DELETE "{{base}}/api/projects/$PID" -H 'Authorization: Bearer {{teacherToken}}'

# 3) 复核文件也没了
curl -s "{{base}}/api/projects/$PID/files" | jq '.data | length'
```
**预期**：任务、其文件、进度一并删除（复核长度为 0）。

### TC-TCH-092 重复打分被拒 ｜ P1 ｜ 接口

```bash
# 1) 学生先提交素质评价
STU={{studentId}}
EVAL=$(curl -s -X POST '{{base}}/api/quality-evaluations/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d "{\"courseId\":\"{{courseId}}\",\"studentId\":\"$STU\",\"description\":\"重复打分测试\",\"files\":[{\"name\":\"c.txt\",\"size\":12,\"dataUrl\":\"data:text/plain;base64,aGVsbG8=\"}]}" \
  | jq -r '.evaluation.id')

SUB=$(curl -s "{{base}}/api/quality-evaluations/student/{{courseId}}/$STU" | jq -r '.evaluation.submissions[-1].id')

# 2) 第一次打分 —— 应成功
curl -i -X PUT "{{base}}/api/quality-evaluations/$EVAL/submissions/$SUB/score" \
  -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' \
  -d '{"score":85,"teacherComment":"成果扎实"}'

# 3) 第二次打分 —— 应被拒
curl -i -X PUT "{{base}}/api/quality-evaluations/$EVAL/submissions/$SUB/score" \
  -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' \
  -d '{"score":60,"teacherComment":"想改成60"}'
```
**预期**：第二次 **`409 该次提交已经批改，不能重复修改`**（当前**无撤销接口**）。

### TC-TCH-093 打分越界 ｜ P1 ｜ 接口

```bash
curl -i -X PUT "{{base}}/api/quality-evaluations/{{evalId}}/submissions/{{submissionId}}/score" \
  -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' \
  -d '{"score":101,"teacherComment":"越界"}'
# 预期 400「分数必须在 0-100 之间」

curl -i -X PUT "{{base}}/api/quality-evaluations/{{evalId}}/submissions/{{submissionId}}/score" \
  -H 'Authorization: Bearer {{teacherToken}}' -H 'Content-Type: application/json' \
  -d '{"score":-1,"teacherComment":"越界"}'
# 预期 400
```

---

## 5. TC-STU 学生端（接口类）

### TC-STU-032 素质评价无文件被拒 ｜ P1 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/quality-evaluations/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","studentId":"{{studentId}}","description":"没传文件","files":[]}'
```
**预期**：`400`，`请至少上传一份文件`。

```bash
# 附：courseId 或 studentId 为空
curl -i -X POST '{{base}}/api/quality-evaluations/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"","studentId":"","description":"x","files":[{"name":"a.txt","size":12,"dataUrl":"data:text/plain;base64,aGVsbG8="}]}'
# 预期 400「课程和学生信息不能为空」
```

### TC-STU-033 多次提交生成多份 ｜ P2 ｜ 接口

```bash
# 连续提交两次，应生成两个 submission
for i in 1 2; do
  curl -s -X POST '{{base}}/api/quality-evaluations/submit' -H 'Authorization: Bearer {{studentToken}}' \
    -H 'Content-Type: application/json' \
    -d "{\"courseId\":\"{{courseId}}\",\"studentId\":\"{{studentId}}\",\"description\":\"第 $i 次\",\"files\":[{\"name\":\"f$i.txt\",\"size\":12,\"dataUrl\":\"data:text/plain;base64,aGVsbG8=\"}]}" \
    | jq '.evaluation.submissions | length'
done
# 预期：依次为 1、2（每次生成新 submission，不是覆盖）
```

### TC-STU-083 ⚠️ AI 分层时间闸门在前端 ｜ P1 ｜ 接口
> **【已知差异】** 后端无闸门，直接调接口**可绕过**"第一节课结束后才开启"。

```bash
curl -s '{{base}}/api/tier-test/{{courseId}}/questions' | jq '.questions | length'
```
**预期（当前实现）**：**能取到题**（不校验时间窗口）。闸门在前端 `getPendingAITierTests`。

### TC-STU-084 分层测试重复提交 ｜ P1 ｜ 接口

```bash
# 1) 首次提交
curl -s -X POST '{{base}}/api/tier-test/{{courseId}}/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"{{studentId}}","answers":[]}' | jq .

# 2) 再次提交 —— 应返回 alreadySubmitted
curl -s -X POST '{{base}}/api/tier-test/{{courseId}}/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"{{studentId}}","answers":[]}' | jq '{alreadySubmitted, tier, score}'
```
**预期**：第二次 `alreadySubmitted: true` + 原结果（**不覆盖**）。

### TC-STU-085 分层测试层级阈值 ｜ P1 ｜ 接口
> 需要能构造精确得分。**最简单**：先取题判出正确答案，再按需要的分数组合提交。

```bash
# 1) 取题（含正确答案需从提交响应里看；题目本身不含答案）
curl -s '{{base}}/api/tier-test/{{courseId}}/questions' | jq '.questions[] | {id, questionText, options, score}'

# 2) 用不同账号/课程构造不同得分，核对层级阈值
#    ≥80 → excellent(卓越层)；60–79 → advanced(进阶层)；<60 → basic(基础层)
curl -s -X POST '{{base}}/api/tier-test/{{courseId}}/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"{{studentId}}","answers":[{"questionId":"q1","answerText":"这里填选项原文"}]}' \
  | jq '{score, tier, tierLabel}'
```
**预期**：阈值严格按 `≥80 / ≥60 / <60` 划分。

### TC-STU-086 分层测试判断题答案等价 ｜ P1 ｜ 接口

```bash
# 对同一道判断题，分别提交五种等价写法，应**都判为正确**
for ans in "正确" "对" "true" "T" "√"; do
  echo -n "提交「$ans」-> "
  curl -s -X POST '{{base}}/api/tier-test/{{courseId}}/submit' -H 'Authorization: Bearer {{studentToken}}' \
    -H 'Content-Type: application/json' \
    -d "{\"studentId\":\"{{另一学生}}\",\"answers\":[{\"questionId\":\"{{判断题id}}\",\"answerText\":\"$ans\"}]}" \
    | jq -c '.details[0] | {isCorrect}'
done
```
**预期**：五种写法**均 `isCorrect: true`**（归一化容错）。
> ⚠️ 每个学生只能提交一次，所以每种写法要用**不同的学生账号**，或先清掉上个学生的结果。

### TC-STU-087 ⚠️ 分层测试响应回传正确答案 ｜ P2 ｜ 接口
> **【已知差异】** 提交响应里确实回传了 `correctAnswer`。

```bash
curl -s -X POST '{{base}}/api/tier-test/{{courseId}}/submit' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"{{studentId}}","answers":[{"questionId":"q1","answerText":"x"}]}' \
  | jq '.details[0]'
```
**预期（当前实现）**：响应含 `correctAnswer` 字段——**学生提交后即可看到全部正确答案**。若允许重考即为透题。

---

## 6. TC-MEN 企业导师端（接口类）

> 企业导师端**没有专属接口**，全部复用教师/学生端接口（权限靠前端隐藏按钮）。
> 相关的**接口层**用例是 `TC-DIFF-007`（越权可调），见 §12。

---

## 7. TC-E2E 端到端（接口类）

### TC-E2E-006 评价写入驱动成绩明细 ｜ P0 ｜ 接口

```bash
# 1) 抹平前置：让学生先有一条评价
curl -s -X POST '{{base}}/api/eval/save' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"id":"ev-e2e-6","courseId":"{{courseId}}","studentId":"{{studentId}}","sessionNumber":1,"type":"self","score":88,"items":[],"evaluatorId":"{{studentId}}","evaluatorName":"测试学生甲","comment":"","createdAt":"2026-10-17 10:00:00"}'

# 2) 查成绩明细 —— self_eval_score 应被回填
curl -s '{{base}}/api/detailed-grades/student/{{studentId}}' | jq . 

# 3) 删掉这条评价
curl -i -X DELETE '{{base}}/api/eval/ev-e2e-6' -H 'Authorization: Bearer {{studentToken}}'

# 4) 再查 —— self_eval_score 应被清零/置空，不能残留旧值
curl -s '{{base}}/api/detailed-grades/student/{{studentId}}' | jq .
```
**预期**：保存评价后明细**同步回填**；删除后对应列**被清零**（不残留）。

---

## 8. TC-BND 边界与异常（接口类）

### TC-BND-002 班级有学生时不可删 ｜ P1 ｜ 接口

```bash
# 确保目标班级下有学生，然后删
curl -i -X DELETE '{{base}}/api/classes/{{有学生的classId}}' -H 'Authorization: Bearer {{adminToken}}'
```
**预期**：`409`，`CLASS_HAS_STUDENTS`。

### TC-BND-003 班级重名 ｜ P2 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/classes' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"测试班级A","department":"测试学院A"}'
# 预期 409 CLASS_EXISTS

curl -i -X PUT '{{base}}/api/classes/{{classId}}' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"测试班级A","department":"测试学院A"}'
# 预期 409（改名撞车）
```

### TC-BND-004 不存在的资源 ID ｜ P1 ｜ 接口

```bash
curl -i -X PUT '{{base}}/api/departments/999999' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"x"}'
# 预期 404

curl -i -X DELETE '{{base}}/api/students/999999' -H 'Authorization: Bearer {{adminToken}}'
# 预期 404

curl -i -X DELETE '{{base}}/api/schedules/999999' -H 'Authorization: Bearer {{adminToken}}'
# 预期 404 或 200（取决于实现，记录实际值）
```

### TC-BND-005 不存在的路由方法 ｜ P2 ｜ 接口
> **注意**：`/api/teachers` **没有 POST**。这不是"权限被拦"，是"方法不存在"。

```bash
curl -i -X POST '{{base}}/api/teachers' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{"name":"x"}'
```
**预期**：`404`（**不要误判成 403**）。

### TC-BND-006 超大请求体 ｜ P1 ｜ 接口

```bash
# 绕过前端，直接提交 >1MiB 的 JSON
BIG=$(head -c 1400000 /dev/zero | tr '\0' 'A')
curl -i -X POST '{{base}}/api/course-standards' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d "{\"courseId\":\"{{courseId}}\",\"name\":\"大.txt\",\"size\":1400000,\"dataUrl\":\"data:text/plain;base64,$BIG\"}" \
  | head -c 400
```
**预期**：`413`，且提示是**可读中文**（不是"请求失败(413)"）。
> 真正的网关瓶颈是 **1 MiB**；Express 的 2MB 刻意在其之上，**不会先触发**。

### TC-BND-007 请求体非法 JSON ｜ P2 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/departments' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' -d '{name: 这是非法JSON'
```
**预期**：`400`，`请求体格式错误，无法解析`。

### TC-BND-008 并发派号不重复 ｜ P1 ｜ 接口

```bash
# 并发创建 20 个账号，核对学号是否有重复
for i in $(seq 1 20); do
  curl -s -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"并发$i\",\"phone\":\"139000100$i\",\"idCard\":\"5100002000011000$i\",\"department\":\"测试学院A\",\"className\":\"测试班级A\"}" \
    | jq -r '.account.userNo' &
done
wait
# 提示：把上面的输出收集起来排序，检查有无重复
```
**预期**：20 个学号**互不重复**。

> 注：`phone`/`idCard` 需构造成 11 位/18 位合法值；上面是示意，请按实际位数补齐。

### TC-BND-009 重复同步待办 ｜ P1 ｜ 接口

```bash
# 第一次
curl -s -X POST '{{base}}/api/todos/sync' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"todos":[{"id":"todo-a","title":"A","completed":false,"createdAt":"2026-10-17","dueDate":"","createdBy":""}]}' | jq .

# 第二次（传不同列表）—— 第二次的列表应成为最终状态
curl -s -X POST '{{base}}/api/todos/sync' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"todos":[{"id":"todo-b","title":"B","completed":true,"createdAt":"2026-10-17","dueDate":"","createdBy":""}]}' | jq .

curl -s '{{base}}/api/todos' -H 'Authorization: Bearer {{studentToken}}' | jq '.todos'
```
**预期**：最终**只剩 `todo-b`**（`todo-a` 被对账删除）。

### TC-BND-010 待办脏数据被过滤 ｜ P2 ｜ 接口

```bash
curl -s -X POST '{{base}}/api/todos/sync' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"todos":[
    {"id":"todo-good","title":"有效","completed":false,"createdAt":"2026-10-17","dueDate":"","createdBy":""},
    {"id":"","title":"无id","completed":false,"createdAt":"2026-10-17","dueDate":"","createdBy":""},
    {"id":"todo-notitle","title":"","completed":false,"createdAt":"2026-10-17","dueDate":"","createdBy":""}
  ]}' | jq '{synced}'
```
**预期**：`synced: 1`（脏行被**丢弃**，不计入）。

### TC-BND-011 待办非数组入参 ｜ P2 ｜ 接口

```bash
curl -i -X POST '{{base}}/api/todos/sync' -H 'Authorization: Bearer {{studentToken}}' \
  -H 'Content-Type: application/json' -d '{"todos":"这不是数组"}'
```
**预期**：`400`，`todos 必须是数组`。

### TC-BND-012 大文件上传导致 MySQL 断连 ｜ P1 ｜ 接口

```bash
# 上传一个接近 nginx 上限的文件（约 900KB base64）
BIG=$(head -c 900000 /dev/zero | tr '\0' 'A')
curl -i -X POST '{{base}}/api/course-standards' -H 'Authorization: Bearer {{teacherToken}}' \
  -H 'Content-Type: application/json' \
  -d "{\"courseId\":\"{{courseId}}\",\"name\":\"临界.txt\",\"size\":900000,\"dataUrl\":\"data:text/plain;base64,$BIG\"}" \
  | head -c 400
```
**预期**：返回**可读错误**，而不是"服务器已重启"。
**前置检查**：后端启动日志里应有 `[mysql] max_allowed_packet=…` 自检行。若该值 < 上传所需，会在此告警。

### TC-BND-013 分页边界 ｜ P2 ｜ 接口

```bash
curl -s '{{base}}/api/accounts?page=0&pageSize=0' -H 'Authorization: Bearer {{adminToken}}' | jq '{page, pageSize}'
curl -s '{{base}}/api/accounts?page=-5&pageSize=-5' -H 'Authorization: Bearer {{adminToken}}' | jq '{page, pageSize}'
curl -s '{{base}}/api/accounts?pageSize=1000' -H 'Authorization: Bearer {{adminToken}}' | jq '{pageSize, count:(.accounts|length)}'
curl -s '{{base}}/api/students?pageSize=1000' | jq '.students | length'
```
**预期**：`page` 最小 1；账号的 `pageSize` 被夹到 1–100；学生**不封顶**。

---

## 12. TC-DIFF 组（**已知差异，不直接判定 BUG**）

> ⚠️ **本组不是缺陷验证**。它们记录的是**手册与实现的既有分歧**，期望值以 `docs/接口文档.md` §4 为准。
> **请勿按操作手册判定为失败**。这些条目需要的是**决策**（改手册 / 补实现 / 保持现状），不是修复。

### TC-DIFF-001 初始密码规则 ｜ P1 ｜ 接口
```bash
curl -s -X POST '{{base}}/api/accounts/students' -H 'Authorization: Bearer {{adminToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"name":"初始密码测试","phone":"13900020001","idCard":"510000200001120001","department":"测试学院A","className":"测试班级A"}' \
  | jq '{userNo:.account.userNo, initialPassword:.account.initialPassword}'
```
**预期**：`initialPassword` = **身份证后 6 位**（本例应为 `120001`，末位 X 转大写）。
**【已知差异】** 手册账号表的 `666666/222222/...` 是历史数据，**不是规则**。

### TC-DIFF-004 权重合计不校验 ｜ P1 ｜ 接口
> 与 `TC-TCH-032` 同。
**【已知差异】** 接口层**接受**任意合计值（如 137%）。前端才拦。

### TC-DIFF-007 企业导师端"只读"仅前端实现 ｜ P1 ｜ 接口
```bash
curl -i -X POST '{{base}}/api/projects' -H 'Authorization: Bearer {{mentorToken}}' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"{{courseId}}","name":"导师越权建的任务","hours":2,"content":"x","keyPoints":"","knowledgePoints":"","orderNo":95,"weekNo":"","visibleTiers":["basic","advanced","excellent"]}'
```
**【已知差异】** 接口层**不拦截**（应被拦才是期望，但当前实现不拦）。手册§五的"只读"只是前端隐藏按钮。

### TC-DIFF-008 分层测试闸门在前端 ｜ P1 ｜ 接口
> 与 `TC-STU-083` 同。
**【已知差异】** 接口层**可绕过**"第一节课结束后开启"。

### TC-DIFF-009 分层测试回传正确答案 ｜ P2 ｜ 接口
> 与 `TC-STU-087` 同。
**【已知差异】** `details[].correctAnswer` **确实返回**。

### TC-DIFF-010 素质评价打分不可撤销 ｜ P1 ｜ 接口
> 与 `TC-TCH-092` 同。
**【已知差异】** 重复打分返回 `409`，**无撤销接口**。

### TC-DIFF-011 未挂载代码 ｜ P2 ｜ 接口
```bash
curl -i '{{base}}/api/tasks'                                    # 预期 404（未挂载）
curl -i '{{base}}/api/teaching/todos' -H 'Authorization: Bearer {{teacherToken}}'   # 预期 404（未挂载）
curl -i '{{base}}/api/teaching/notes' -H 'Authorization: Bearer {{teacherToken}}'   # 预期 404（未挂载）
```
**【已知差异】** 这些是**死代码**，不在测试范围。**不要为它们写通过用例。**

### TC-DIFF-012 两套登录 id 空间 ｜ P1 ｜ 接口
```bash
# 用旧接口登录
A=$(curl -s -X POST '{{base}}/api/auth/login' -H 'Content-Type: application/json' \
  -d '{"studentId":"202600034","password":"<密码>"}' | jq '.user.id')
# 用统一接口登录
B=$(curl -s -X POST '{{base}}/api/user/login' -H 'Content-Type: application/json' \
  -d '{"account":"202600034","password":"<密码>"}' | jq '.user.id')
echo "旧接口 id=$A  新接口 id=$B"
```
**【已知差异】** 两个 `id` 语义不同（前者 students 主键，后者 users 主键），**数值通常不等**。**不可混用两套 token 做同一学生的断言。**

---

## 附：接口用例覆盖自检

> 「接口类用例」= 类型为**接口**或**接口+UI**（后者只在其接口部分）。

| 来源组 | 纯接口 | 接口+UI | 接口类合计 | 本文件覆盖 |
|---|---|---|---|---|
| TC-AUTH | 23 | 2 | 25 | ✅ |
| TC-COM | 5 | 6 | 11 | ✅ |
| TC-ADM | 28 | 18 | 46 | ✅ |
| TC-TCH | 13 | 1 | 14 | ✅ |
| TC-STU | 7 | 0 | 7 | ✅ |
| TC-MEN | 0 | 0 | 0 | —（无专属接口） |
| TC-E2E | 1 | 0 | 1 | ✅（§7） |
| TC-BND | 12 | 0 | 12 | ✅ |
| TC-DIFF | 8 | 0 | 8 | ✅（§12 单列） |
| **合计** | **97** | **27** | **124** | ✅ |

> 全量 **226** 条用例的类型分布：**纯接口 97 / 接口+UI 27 / 纯 UI 102**。
> 纯 UI 用例（102 条）不在本文件范围；其中 P1/P2 的 78 条见《P1/P2 UI 用例扩充》。

---

*本文件由 `docs/测试用例.md` 自动生成，接口契约以 `docs/接口文档.md` 为准。*
