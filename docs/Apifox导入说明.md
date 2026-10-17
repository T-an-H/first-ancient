# Apifox 导入说明

> 配套文件：`docs/apifox-课程多元评价平台接口测试.json`
> 来源：`docs/测试用例.md` 中的 **124 条接口类用例**（类型为「接口」或「接口+UI」）

---

## 1. 导入

**Apifox → 项目 → 导入数据 → Postman → 选择该 JSON 文件**

导入后结构：

```
00 登录（先跑这个）          5 条
01 变量准备（先跑这个）        4 条
02 测试数据准备（先跑这个）     3 条
TC-AUTH 权限与鉴权          122 个请求（25 条用例；其中 5 组权限扫描各 18 个请求，2 组 GET 各 7 个）
TC-COM  通用流程             11 条
TC-ADM  管理员端             43 条
TC-TCH  教师端               14 条
TC-STU  学生端                8 条
TC-E2E  端到端                1 条
TC-BND  边界与异常            12 条
TC-DIFF 已知差异               8 条
99 危险操作（勿一键运行）       6 条
```

共 **237 个请求**（AUTH 的 5 组权限扫描各含 18 个请求、2 组 GET 各含 7 个，因此请求数远大于 124 条用例数）。

---

## 2. 运行前必须填的变量

在 Apifox 的「**环境 / 集合变量**」里填写（文件已预置 28 个变量）：

| 变量 | 说明 | 是否必填 |
|---|---|---|
| `baseUrl` | 服务地址，默认 `http://47.114.42.189` | ✅ |
| `adminAccount` / `adminPassword` | 管理员账号，默认 `admin` / `666666` | ✅ |
| `teacherAccount` / `teacherPassword` | 教师账号 | ✅ |
| `mentorAccount` / `mentorPassword` | 企业导师账号 | ✅ |
| `leaderAccount` / `leaderPassword` | 学院领导账号 | ✅ |
| `studentAccount` / `studentPassword` | 学生账号 | ✅ |
| `studentPhone` | 学生手机号（测「手机号登录」） | 可选 |
| `deptName` | 学院名称，默认已填 | ✅ |
| `bigBase64` | >400KB 的 base64 串（测头像/大文件上限） | 可选 |

**自动变量**（无需手填，跑前置文件夹即可）：
`adminToken` `teacherToken` `mentorToken` `leaderToken` `studentToken`、`deptId` `categoryId` `courseId` `studentId`、`testDeptId` `testCategoryId` `testCourseId`。

---

## 3. 运行顺序（重要）

```
① 00 登录（先跑这个）        → 5 个角色 token 写入集合变量
② 01 变量准备（先跑这个）     → 拉取真实 deptId / categoryId / courseId / studentId
③ 02 测试数据准备（先跑这个）  → 自建 testDeptId / testCategoryId / testCourseId
④ 按组跑：TC-AUTH → TC-COM → TC-ADM → TC-TCH → TC-STU → TC-E2E → TC-BND → TC-DIFF
⑤ 「99 危险操作」逐个手动跑，勿一键执行
```

> 跳过 ① 会导致所有带鉴权的请求拿到空 token 而 401。

---

## 4. 关于「99 危险操作」与真实数据

**这是本集合最重要的安全设计。**

上一轮实测时，权限用例里用了**真实 ID**（`departments/348`、`categories/18`、真实课程 id）做 DELETE/PUT，而目标环境**未部署角色守卫**，结果**真的删掉了真实数据**。

因此本集合做了三点修正：

1. **权限扫描（TC-AUTH-002~006 的 18 条写路由）一律改用 `{{fakeId}}`**（默认 `999999`），即使目标环境无守卫也只会得到 404。
2. **破坏性用例集中到「99 危险操作」文件夹**，并在描述里写明风险。
3. **写操作只应指向 `testDeptId` / `testCategoryId` / `testCourseId`**（由「02 测试数据准备」自建）。

运行「99 危险操作」前请确认：

- [ ] 目标不是生产库，或已确认可承受数据损失
- [ ] `testDeptId` 等变量确实是**自建**对象
- [ ] 已备份

---

## 5. 判读规则

| 标记 | 含义 |
|---|---|
| `⚠️ 已知差异` | 手册与实现的分歧，**期望值是"当前行为"**，**不要按操作手册判为 BUG**。见 TC-DIFF 组 |
| `P0` | 阻断级。**模拟结果仅供参考，需人工复核** |
| 断言失败 | Apifox 会在「测试报告」里标红 |

**环境前提**：若目标环境为**旧版构建**（未部署权限收紧 / 待办 / 小智鉴权 / 限流），以下用例会大面积失败，属于**环境未更新**而非用例错误：

`TC-AUTH-002/003/004/005/013/032/050/052`、`TC-COM-019/020`、`TC-ADM-017`

---

## 6. 需要手工补前置的用例

以下用例本集合只给了请求，**前置条件需人工准备**（描述里已注明）：

| 用例 | 需准备 |
|---|---|
| TC-AUTH-041 | 连跑 5 次错误密码（Apifox「运行」面板设迭代 5 次） |
| TC-AUTH-042 | 先把目标账号置为 `inactive` |
| TC-ADM-014/015/016 | 先建自建学院，把真实 id 填进 `testDeptId` / `emptyDeptId` |
| TC-ADM-063 | 先建一条同身份证账号 |
| TC-COM-009 | 填目标用户 id 到 `targetUserId` |
| TC-TCH-044/045 | 先锁定/设截止时间 |
| TC-TCH-092 | 该 submission 必须已打过分 |
| TC-STU-086 | 需 5 个独立学生账号 |
| TC-BND-002 | 需一个有学生的班级 |
| TC-BND-008 | 用「运行」面板设并发 8 次 |

---

## 7. 与文档的对应关系

| 文档 | 作用 |
|---|---|
| `docs/测试用例.md` | 用例定义（226 条，含 UI） |
| `docs/接口文档.md` | 接口契约与已知差异（§4） |
| **`docs/apifox-课程多元评价平台接口测试.json`** | **本集合：124 条接口类用例的可执行形态** |
| `docs/接口测试-curl集合.md` | 同等内容的 curl 版本 |
| `docs/接口测试执行报告.md` | 对线上实跑的结果 |

---

*本文件由 `docs/测试用例.md` 生成。用例变动时请重新生成，勿手工改 JSON。*
