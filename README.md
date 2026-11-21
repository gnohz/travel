# Travel · 我们的旅行

一个 GitHub 仓库和 GitHub Pages 网站，按旅行分目录。仓库名应为 **travel**（小写）。

```text
travel/
├── sedona-2026/           # 独立 Vite / React / TypeScript 应用及行程数据
├── scripts/              # 总站组装与本地构建预览
├── .github/workflows/    # 一个统一的 GitHub Pages 部署任务
└── dist/                 # 构建输出：总站首页 + sedona-2026/
```

GitHub Pages 保留仓库路径前缀 `/travel/`，每次旅行使用独立子目录。

## GitHub Pages 与本地预览

公开仓库：`https://github.com/gnohz/travel`。

- Travel 总入口：`https://gnohz.github.io/travel/`
- Sedona 指南：`https://gnohz.github.io/travel/sedona-2026/`

本地 Tailscale 预览继续保留。内网地址与运维记录仅存于未跟踪的 `.local/preview-access.md`；也可运行 `tailscale serve status` 查看当前转发。

本机后台服务可通过 `npm run preview:status` 查看，`npm run preview:install` 安装或重新加载，`npm run preview:uninstall` 移除。服务只监听 `127.0.0.1:4173`，日志保存在 `.local/`。修改内容后重新构建即可更新本地预览。

## 本地运行

需要 Node.js 22+、Python 3.12+。

```sh
npm ci
python3 -m venv .venv
.venv/bin/python3 -m pip install -r sedona-2026/requirements.txt
npm run dev
```

开发地址按 Vite 输出打开，包含 `/travel/sedona-2026/`。开发模式不注册 Service Worker。

验证生产版（PWA 仅在构建版、HTTPS 或 localhost 下启用）：

```sh
npm test
npm run build
npm run preview
```

打开 `http://127.0.0.1:4173/travel/sedona-2026/`。预览服务器也提供总站 `/travel/`。`PYTHON` 环境变量可指定其他已安装 ReportLab 的 Python。

## 修改行程

唯一内容源：`sedona-2026/src/data/travel.json`。修改后重新构建，网页数据与中文 PDF 同时更新。

- `days`：五天时间线；`optionGroup`/`option` 表示二选一，`condition` 使接驳活动随徒步方案一起切换。
- `places`：统一地点；徒步地点的 `navigationId` 指向真实车辆停车场。
- `flights`、`stays`、`rental`、`shopping`：预订与准备信息。
- `sources`、`verification`：官方来源及已确认/估算/待核实的边界。

中文 PDF 在构建时用 ReportLab 生成，内嵌 Noto Sans SC 字体，输出 `sedona-2026/public/sedona-2026-guide.pdf` 并自动复制到发布目录。字体许可在 `sedona-2026/scripts/fonts/OFL.txt`。六条徒步及四个主要景点均有对应实景照片，来源在 `sedona-2026/public/images/credits.json`；详情页标注作者和许可，所有图片保存到本地并纳入离线缓存。

手动检查全部官方链接：`npm run check:links --workspace sedona-2026`。报告写入 `output/link-audit.json`；HTTP 403 可能是访问防护，需要用浏览器确认真实页面，不能把返回 200 的无关页面算作可用。此次修复了 Tortas 旧域名、Hilton 酒店代码和 Uptown 失效停车页。Tortas 官网有多个分店，点 Sedona 标签查看 1630 AZ-89A 分店。

## GitHub Pages 部署

1. 将总项目推送至 GitHub 的 `travel` 仓库 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 工作流 `.github/workflows/pages.yml` 安装依赖、测试、检查 TypeScript、生成 PDF、构建并发布整个 `dist/`。
4. Actions 成功后访问 `https://USERNAME.github.io/travel/sedona-2026/`。

不需要 API Key、后端或数据库。GitHub Pages 公开可访问，不加入门锁密码、预订确认号、护照、电话等信息。

若仓库名称改变，须同时调整 Vite `base`、`scripts/build-offline.mjs` 的 `base`、manifest 的 `id` 与根预览服务器路径。不要只改其中一个。

## 后续旅行

在根目录并列新增 `japan-2027/` 等应用，加入根 `package.json` 的 workspaces 和 build 命令，再在 `scripts/assemble.mjs` 将其产物复制至 `dist/japan-2027/` 并添加入口卡片。每次旅行使用独立的 PWA scope、manifest ID、缓存前缀及 localStorage 前缀；新旅行构建时必须保留其他旅行目录。

## 离线与更新设计

- 构建时对 HTML、JS、CSS、数据、图片、图标和 PDF 生成内容哈希版本；安装必须完整缓存所有必需文件。
- 界面询问活动 Service Worker 的真实缓存状态；资源完整后才显示“已准备好离线使用”。
- 旅行 JSON：Network First，6 秒超时回退到缓存。应用还内置同版完整行程以应对初次 API/数据请求失败。
- 版本化静态资源与应用外壳：Cache First。新 Service Worker 安装后等待用户点“立即更新”；只有收到控制器切换后才刷新。
- 更新只清理 `sedona-2026-` 缓存，不影响其他旅行。天气缓存单独存 localStorage，离线或请求失败明确标注缓存与更新时间。
- 地图链接、官方网页和导航应用本身不属于离线内容，出发前在地图应用下载离线地图。
- iOS 存储可能被系统清理；出发前联网重开并核查。

## 验收

自动测试覆盖时区边界、跨时区下一站、地点引用、停车场导航、方案结构、天气数据拒绝、完整缓存状态、安装失败、离线应用外壳及数据、Network First 回退、版本切换、缓存隔离。

手机实机必须完成以下流程，桌面浏览器检查不能替代：

1. iPhone Safari 在线打开，在“更多”确认离线准备完成。
2. 分享 → 添加到主屏幕，打开独立 PWA。
3. 开飞行模式，关闭再重开 PWA，查看五天行程、地点、图片和 PDF。
4. 恢复网络；修改行程、推送新版本；在 PWA 点“检查更新”，看到新版本后点“立即更新”。
5. 确认新内容，再断网重开确认仍为新版本。

仍待出发前核实：临时封路/步道状态、实际接驳变化及末班、餐厅节假日营业、儿童 Booster Seat、厨房/火锅设备、航班调整、交通与停车费。官方已公布 11/19–11/29 假期接驳扩展，但 11/26 感恩节不运营。
