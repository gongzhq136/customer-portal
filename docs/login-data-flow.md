# 用户登录数据流转图

## 一、邮箱密码登录（主流程）

```
┌──────────┐       ┌──────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Browser │       │ Nuxt Server  │       │  Better Auth     │       │  PostgreSQL │
└────┬─────┘       └──────┬───────┘       └────────┬─────────┘       └──────┬──────┘
     │                    │                        │                        │
     │ 1. POST /login     │                        │                        │
     │ (email, password)  │                        │                        │
     │───────────────────→│                        │                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ login.vue:onSubmit()│             │                        │
     │         │ signIn.email()      │             │                        │
     │         └──────────┬──────────┘             │                        │
     │                    │                        │                        │
     │  2. POST /api/auth/sign-in/email             │                        │
     │───────────────────────────────────────────→│                        │
     │                    │                        │                        │
     │                    │              3. Query user by email              │
     │                    │                        │───────────────────────→│
     │                    │                        │                        │
     │                    │              4. user {id, email, role}           │
     │                    │                        │←───────────────────────│
     │                    │                        │                        │
     │                    │         5. Verify password (bcrypt)             │
     │                    │                        │                        │
     │                    │              ┌─────────┴──────────┐             │
     │                    │              │ email verified?    │             │
     │                    │              └────┬──────────┬────┘             │
     │                    │                   │          │                  │
     │                    │              YES  │          │ NO               │
     │                    │                   │          │                  │
     │  6a. Set-Cookie    │          6b. Error│          │                  │
     │  (session_token)   │  "Email not       │          │                  │
     │←─────────────────────────────────────│  verified"│                  │
     │                    │                   │          │                  │
     │                    │                   │    ┌─────┴──────┐           │
     │                    │                   │    │Redirect to │           │
     │                    │                   │    │/verify-email│          │
     │                    │                   │    └────────────┘           │
     │                    │                   │          │
     │                    │                   │          │  → 见流程三
     │                    │                   │
     │                    │         7. Create session + account query       │
     │                    │                        │───────────────────────→│
     │                    │                        │                        │
     │                    │              8. customSession plugin             │
     │                    │              enrich user with providerId         │
     │                    │                        │                        │
```

## 二、Session 建立后的初始化流程

```
┌──────────┐       ┌──────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Browser │       │ Nuxt Client  │       │  Nuxt Server     │       │  PostgreSQL │
└────┬─────┘       └──────┬───────┘       └────────┬─────────┘       └──────┬──────┘
     │                    │                        │                        │
     │  Cookie已设置       │                        │                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ auth plugin (setup) │             │                        │
     │         │                     │             │                        │
     │  9. getSession()              │             │                        │
     │──────────────────────────────────────────→│                        │
     │                    │                        │                        │
     │ 10. {session, user, providerId}             │                        │
     │←──────────────────────────────────────────│                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ userStore.setSession│             │                        │
     │         │  ├─ currentUser     │             │                        │
     │         │  ├─ currentSession  │             │                        │
     │         │  └─ fetchPermissions│             │                        │
     │         └──────────┬──────────┘             │                        │
     │                    │                        │                        │
     │  11. GET /api/auth/permissions              │                        │
     │──────────────────────────────────────────→│                        │
     │                    │                        │                        │
     │                    │    12. getUserPermissions()                     │
     │                    │    ├─ 查询 system role (user.role)              │
     │                    │    ├─ 查询 member 表 (组织角色)                  │
     │                    │    │──────────────────────────────────────────→│
     │                    │    │←─────────────────────────────────────────│
     │                    │    ├─ 合并系统权限 + 组织权限                     │
     │                    │    └─ 返回扁平权限 map                           │
     │                    │                        │                        │
     │  13. {permissions, role, organizationRole, activeOrganization}       │
     │←──────────────────────────────────────────│                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────────────────┐│                        │
     │         │ userStore 更新:                  ││                        │
     │         │  ├─ permissions = {'sr.create':true, ...}
     │         │  ├─ role = 'user'                │                        │
     │         │  ├─ organizationRole = 'owner'   │                        │
     │         │  └─ activeOrganization = {...}   │                        │
     │         └──────────┬──────────────────────┘│                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ 无活跃组织？          │             │                        │
     │         │ → 自动选择第一个组织   │             │                        │
     │         │ → setActiveOrg(org)  │             │                        │
     │         └──────────┬──────────┘             │                        │
     │                    │                        │                        │
     │  14. 检查 pendingInvitationId               │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ localStorage中有    │             │                        │
     │         │ invitationId?       │             │                        │
     │         ├─→ YES: acceptInvitation()         │                        │
     │         │    POST /api/auth/org/accept      │                        │
     │         └─→ NO: 跳过          │             │                        │
     │         └──────────┬──────────┘             │                        │
     │                    │                        │                        │
     │ 15. window.location.href = redirectURL      │                        │
     │───────────────────→│                        │                        │
     │                    │                        │                        │
     │         ┌──────────┴──────────┐             │                        │
     │         │ auth.global.ts      │             │                        │
     │         │ (middleware)         │             │                        │
     │         │                     │             │                        │
     │         │ 检查 route 是否公开  │             │                        │
     │         │ /login, /signup 等   │             │                        │
     │         ├─→ YES: 放行          │             │                        │
     │         └─→ NO: useSession()  │             │                        │
     │             ├─ 有session → 放行 │            │                        │
     │             └─ 无session → 401 │            │                        │
     │                → redirect login│            │                        │
     │         └──────────────────────┘             │                        │
     │                    │                        │                        │
     │ 16. /dashboard 渲染 │                        │                        │
     │←───────────────────│                        │                        │
     │                    │                        │                        │
```

## 三、邮箱未验证 → OTP 流程

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌─────────┐
│  Browser │       │ verify-email │       │ Better Auth  │       │  Email  │
└────┬─────┘       └──────┬───────┘       └──────┬───────┘       └────┬────┘
     │                    │                       │                    │
     │ 1. /verify-email   │                       │                    │
     │ ?email=x&from=login│                       │                    │
     │───────────────────→│                       │                    │
     │                    │                       │                    │
     │  2. 自动发送OTP     │                       │                    │
     │  sendVerificationOtp({email, type:'sign-in'})
     │──────────────────────────────────────────→│                    │
     │                    │                       │                    │
     │                    │              3. 生成6位OTP              │
     │                    │              存入 verification 表        │
     │                    │                       │──────→ 生成邮件 ──→│
     │                    │                       │                    │
     │                    │                       │     4. 发送邮件    │
     │                    │                       │──────────────────→│
     │                    │                       │                    │
     │  5. 用户输入6位OTP  │                       │                    │
     │───────────────────→│                       │                    │
     │                    │                       │                    │
     │  6. signIn.emailOtp({email, otp})          │                    │
     │──────────────────────────────────────────→│                    │
     │                    │                       │                    │
     │                    │          7. 验证OTP    │                    │
     │                    │          标记email已验证 │                   │
     │                    │          创建session    │                    │
     │                    │                       │                    │
     │  8. Set-Cookie + Session                    │                    │
     │←──────────────────────────────────────────│                    │
     │                    │                       │                    │
     │  9. redirect → /dashboard (回到流程二)      │                    │
     │───────────────────→│                       │                    │
```

## 四、OAuth 社交登录流程（GitHub/Google）

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────┐
│  Browser │    │ login.vue│    │ Better Auth  │    │ OAuth Provider│   │PostgreSQL│
└────┬─────┘    └────┬─────┘    └──────┬───────┘    └──────┬───────┘    └────┬────┘
     │               │                  │                   │                │
     │ 1. 点击GitHub/Google按钮          │                   │                │
     │──────────────→│                  │                   │                │
     │               │                  │                   │                │
     │  2. signIn.social({provider, callbackURL})            │                │
     │←──────────────│                  │                   │                │
     │               │                  │                   │                │
     │  3. 302 → GitHub/Google OAuth授权页                  │                │
     │──────────────────────────────────────────────────→│                │
     │               │                  │                   │                │
     │  4. 用户授权   │                  │                   │                │
     │←──────────────────────────────────────────────────│                │
     │               │                  │                   │                │
     │  5. 302 → /api/auth/sign-in/social?code=xxx          │                │
     │──────────────────────────────────→│                   │                │
     │               │                  │                   │                │
     │               │     6. 用code换token, 获取用户信息     │                │
     │               │                  │──────────────────→│                │
     │               │                  │←──────────────────│                │
     │               │                  │                   │                │
     │               │     7. 查找/创建 user + account       │                │
     │               │                  │──────────────────────────────────→│
     │               │                  │←──────────────────────────────────│
     │               │                  │                   │                │
     │               │     8. hook: afterUserCreated        │                │
     │               │     → 自动创建个人组织(非admin)        │                │
     │               │                  │──────────────────────────────────→│
     │               │                  │                   │                │
     │  9. Set-Cookie + 302 → callbackURL                   │                │
     │←──────────────────────────────────│                   │                │
     │               │                  │                   │                │
     │ 10. → /dashboard (回到流程二)     │                   │                │
     │               │                  │                   │                │
```

## 五、数据流转总览

```
                        ┌─────────────┐
                        │  用户操作     │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
        ┌──────────┐   ┌──────────┐      ┌───────────┐
        │ 邮箱密码  │   │ 社交登录  │      │ 邮箱未验证  │
        │ signIn.  │   │ signIn.  │      │ → OTP流程  │
        │ email()  │   │ social() │      │            │
        └────┬─────┘   └────┬─────┘      └─────┬─────┘
             │              │                  │
             └──────────────┼──────────────────┘
                            ▼
                  ┌───────────────────┐
                  │ Better Auth 验证   │
                  │ → 创建 session     │
                  │ → Set-Cookie      │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ customSession     │
                  │ → 附加 providerId │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ auth plugin       │
                  │ → getSession()    │
                  │ → useSession()    │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ userStore         │
                  │ .setSession()     │
                  │ → 存储user/session│
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ fetchPermissions  │
                  │ GET /api/auth/    │
                  │   permissions     │
                  │ → 系统权限+组织权限 │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ 组织初始化         │
                  │ → 自动选择活跃组织  │
                  │ → 处理待接受邀请    │
                  └─────────┬─────────┘
                            ▼
                  ┌───────────────────┐
                  │ middleware 验证    │
                  │ → session有效     │
                  │ → 渲染目标页面     │
                  └───────────────────┘
```

## 六、关键数据结构在各阶段的变化

| 阶段            | 数据                                                                |
| --------------- | ------------------------------------------------------------------- |
| 登录请求        | `{email, password}`                                                 |
| 数据库查询      | `user {id, email, role, name, image}`                               |
| Session 创建    | `{token, userId, expiresAt, activeOrganizationId}`                  |
| Cookie 设置     | `better-auth.session_token=<token>`                                 |
| customSession   | `user + providerId` (github/google/credential)                      |
| Permissions API | `{permissions: {'sr.create': true, ...}, role, orgRole, activeOrg}` |
| Store 最终状态  | `{user, session, permissions, role, orgRole, activeOrganization}`   |

## 七、相关源文件索引

| 文件                                 | 职责                             |
| ------------------------------------ | -------------------------------- |
| `app/pages/login.vue`                | 登录页面，处理邮箱密码和社交登录 |
| `app/pages/verify-email.vue`         | OTP 验证页面                     |
| `app/utils/auth-client.ts`           | Better Auth 客户端配置           |
| `app/plugins/auth.ts`                | 应用启动时初始化 session         |
| `app/middleware/auth.global.ts`      | 路由守卫，未登录重定向           |
| `app/stores/useUserStore.ts`         | 用户状态、权限管理               |
| `server/utils/auth.ts`               | Better Auth 服务端配置           |
| `server/utils/permissions.ts`        | 权限检查逻辑                     |
| `server/api/auth/[...].ts`           | Auth API 代理路由                |
| `server/api/auth/permissions.get.ts` | 权限查询接口                     |
| `server/db/schema/auth-schema.ts`    | 认证相关数据库表                 |
