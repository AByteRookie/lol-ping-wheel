# LoL 信号盘 · League Ping Wheel

在**任意网页**上呼出《英雄联盟》风格的信号盘：**按住 `G` → 滑动鼠标选方向 → 松开 `G` 发出**。

- 8 个 Smart Ping + 中心 Caution，方位与游戏一致（北 撤退 / 东北 推进 / 东 正在路上 / 东南 全力进攻 / 南 请求支援 / 西南 需要视野 / 西 敌人消失 / 西北 敌方视野 / 中心 警告）
- 光标处弹出、扇形高亮、中心联动、落地信号停留 2 秒、按官方格式转写队伍聊天
- 图标为**手绘内联 SVG**（无外部图片），音效为 **Web Audio 实时合成**（无音频文件）
- 零依赖、单文件、不污染宿主页（样式封装在 Shadow DOM 内）

---

## 三种安装方式

### 方式一：用户脚本

需要先装 [Tampermonkey 篡改猴](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd)。

1. 打开本仓库里的 **`lol-ping-wheel.user.js`**
2. 点右上角 **Raw**（或在 Tampermonkey 里选「实用工具 → 从 URL 安装」粘贴 Raw 地址）
3. Tampermonkey 会弹出安装页 → 点 **安装**

之后**每个网页**都生效，重启浏览器不会失效。

### 方式二：加载解压缩扩展（不需要 Tampermonkey）

1. 下载本仓库的 `dist/lol-ping-wheel-extension.zip` 并**解压**（解压后应直接看到 `manifest.json`）
2. Edge 地址栏输入 `edge://extensions` → 打开左下角 **「开发人员模式」**
3. 把解压出来的文件夹**直接拖进这个页面**（比用"加载解压缩的扩展"选择框更不容易选错层级）

> 注意：下载 `.crx` **不能**双击安装——Chromium 从 2018 年起就禁止安装商店外的 crx。crx 只用于方式三的策略安装。

### 方式三：策略安装（永不被停用，需要管理员权限）

1. 以**管理员身份**运行 `extras/策略安装-需管理员.bat`
2. 完全关闭 Edge 再打开

之后扩展由策略安装，**不能被你或任何提示停用**，也不需要开发者模式。副作用是 Edge 菜单会出现「由你的组织管理」。

撤销：以管理员身份运行
`reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /f`

---

## 用法

| 操作 | 结果 |
|---|---|
| **按住 `G` 不放** | 信号盘在光标处弹出 |
| **移动鼠标** | 朝哪个方向就高亮哪个扇形，中心同步显示图标与名称 |
| **松开 `G`** | 在光标位置发出所选信号 |
| `Esc` / 鼠标右键 | 取消，不发出 |

- 只在**普通网页**（http/https）上生效：`edge://` 开头的页面、Edge 新标签页、PDF 阅读器、扩展商店页面都不行
- 装好之后**已经打开的页面要按 `F5` 刷新**才会生效（内容脚本只在页面加载时注入）
- 在输入框里按 `G` 会自动让路，不会抢你打字
- 呼出后也可用方向键选（可选）

## 可调参数

改 `content.js`（扩展）或用户脚本顶部的 `init({...})`：

| 参数 | 默认 | 说明 |
|---|---|---|
| `radius` | `168` | 信号盘半径 px |
| `lang` | `'zh'` | `'zh'` / `'en'` / `'both'` |
| `sound` | `true` | Web Audio 合成音效 |
| `colorblind` | `false` | `true` 用 Okabe-Ito 色盲安全配色 |
| `holdKey` | `'KeyG'` | 呼出键（`KeyboardEvent.code`） |
| `holdKeyEnabled` | `true` | 唯一入口：按住呼出、松开发出 |
| `altClick` / `ctrlClick` / `altHold` / `quickKeysEnabled` | 全 `false` | 其余触发方式，默认关闭以免和网站抢按键 |

---

## 目录结构

```
lol-ping-wheel.user.js          用户脚本（方式一）
extension/                      解压缩扩展源码（方式二）
  manifest.json
  content.js                    挂载配置
  lol-ping-wheel.js             组件本体
dist/
  lol-ping-wheel-extension.zip  解压后可直接拖进扩展页
  lol-ping-wheel-extension.crx  仅供方式三使用
  update.xml                    方式三的更新清单
extras/
  策略安装-需管理员.bat
```

## 关于图标与版权

本项目是**粉丝自制的交互复刻**，与 Riot Games 无任何关联。信号盘的结构、方位、名称依据公开资料（[LoL Wiki · Ping](https://wiki.leagueoflegends.com/en-us/Ping)、[Riot 官方支持页](https://support.riotgames.com/en-us/league-of-legends/gameplay/smart-ping)）实现；**仓库内不含任何 Riot 的美术或音频资源**，所有图标都是本项目手绘的矢量近似，音效为实时合成。

「英雄联盟 / League of Legends」是 Riot Games, Inc. 的商标。

## 许可

MIT
