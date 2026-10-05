# 个人电子菜单

> 说明：本仓库里的 `project.config.json` 中 appid 是占位符 `touristappid`，用微信开发者工具打开时，请替换成你自己的 AppID（这是为了不公开项目对应的账号）。


一个人的私房菜单，两个壳：

- **微信小程序** —— 在微信里打开，能分享、能收藏、能点单
- **手机网页版** —— 扫二维码就能用，不用注册不用审核（真正的"发给朋友就能用"）

两个壳共用同一份菜单数据，数据源是 `server/menu.py`。

---

## 一、30 秒跑起来

双击 **`start.bat`**（第一次会自动建环境装依赖），窗口里会打印三个地址：

```
菜单页（发给朋友）：http://192.168.x.x:8000/
店主后台：        http://192.168.x.x:8000/shop?token=你的后台口令
本机打开：        http://127.0.0.1:8000/
```

手机连**同一个 Wi-Fi**，打开第一个地址，或者直接扫店主后台里的二维码。

命令行方式：

```bat
.venv\Scripts\python server\app.py
.venv\Scripts\python server\app.py --port 9000    :: 换端口
.venv\Scripts\python server\app.py --dev          :: 改代码自动重启
```

---

## 二、目录说明

```
项目目录\
├─ server\                 Python 服务端（主要代码都在这）
│  ├─ app.py                Flask 入口：页面 + 接口 + 后台
│  ├─ menu.py               店名、分类；DISHES 现在是空的
│  ├─ db.py                 订单存储（SQLite，标准库）
│  ├─ export_menu.py        把菜单同步给微信小程序
│  ├─ 示例菜单_备份.py      最初那 12 道示例菜，想参考格式就看它
│  ├─ templates\            网页模板（Jinja2）
│  ├─ static\               网页样式和脚本
│  └─ data\                 订单库 + 你自己加的菜（自动生成）
│
├─ images\dishes\      ★    菜品照片（加菜时上传的照片存这里）
│
├─ pages\                  小程序的页面
│  ├─ index\                菜单首页（分类、搜索、招牌）
│  ├─ detail\               菜品详情（食材、做法、收藏）
│  ├─ cart\                 点单清单
│  ├─ favorites\            我的收藏
│  ├─ mine\                 我的（服务器设置、清空数据）
│  └─ about\                关于这份菜单
│
├─ utils\                   小程序的工具模块（store 本地存储 / api 服务器请求）
├─ data\menu.js         ★    小程序用的菜单，由 export_menu.py 生成，别手改
├─ app.json / app.js / app.wxss   小程序全局配置
├─ project.config.json      微信开发者工具的工程配置
├─ start.bat                一键启动
└─ requirements.txt         Python 依赖
```

---

## 三、改菜单

**菜单现在是空的** —— 一道菜都没有，这是特意留给你自己填的。

### 加菜：在店主后台点（不用写代码）

打开店主后台 → 点 **「＋ 加一道菜」** → 填菜名、价格、分类、食材做法、选一张照片 → 保存。
菜立刻出现在菜单里，朋友刷新就能看到。加完点一下 **「同步给微信小程序」**，
小程序的 `data/menu.js` 会自动更新（等于帮你跑了一遍 `export_menu.py`）。

- 照片会自动存到 `images/dishes/<菜品编号>.<后缀>`
- 菜存在 `server/data/dishes.json` 里，和代码完全分开：想备份菜单就复制这个文件
- 菜编号从 100 开始，可以随时在后台删除

### 改店名 / 分类：改代码

改 **`server/menu.py`** 里的 `SHOP`（店名、口号、公告、联系方式）和 `CATEGORIES`（分类），
然后：

```bat
:: 1. 重启服务（网页版立刻生效）
:: 2. 同步给微信小程序
.venv\Scripts\python server\export_menu.py
```

`export_menu.py` 会重新生成 `data/menu.js`，小程序用微信开发者工具重新上传即可。

> `data/menu.js` 是自动生成的文件（里面含你的店名和联系方式），
> 所以它没有上传到仓库。克隆下来之后先运行一次
> `.venv\Scripts\python server\export_menu.py` 生成它，小程序才能编译。

菜品的 `image` 字段填图片地址就显示照片，留空则显示彩色图标卡片：

```python
"image": "/images/dishes/1.jpg",   # 小程序本地图
"image": "https://你的域名/1.jpg",  # 网络图
```

网络图片要在微信公众平台配置 **downloadFile 合法域名**。

---

## 四、几个地址

| 地址 | 用途 |
| --- | --- |
| `/` | 菜单页，发给朋友的就是这个 |
| `/dish/1` | 单道菜的详情（食材 + 做法） |
| `/shop?token=...` | 店主后台：看订单、标记完成、二维码 |
| `/api/menu` | 菜单 JSON 接口 |
| `/api/order` | 下单接口（POST） |
| `/api/orders?token=...` | 订单 JSON（给需要对接的场景） |
| `/health` | 存活检查 |

后台口令建议放在 `server/config_local.py` 里（该文件不会上传到仓库）：

```python
OVERRIDES = {
    "contact": "你的联系方式",
    "admin_token": "你自己设的口令",
}
```

没有这个文件时，程序使用 `server/menu.py` 里的默认值（`contact` 为空、口令为 `change-me`），
这时后台的初始口令就是 `change-me`，**请务必改掉**。

---

## 五、让朋友用起来（三种方式，从易到难）

### 方式 1：同一个 Wi-Fi（今天就能用）

朋友和你的电脑连同一个网络，扫店主后台里的二维码。
适合在家里、办公室、小型聚会上用。

### 方式 2：让外网也能访问

需要一个能被公网访问的地址，两种常见做法：

- **内网穿透**（最快）：用 ngrok、cpolar、frp 这类工具把 8000 端口映射出去，会得到一个 `https://xxx.ngrok-free.app` 之类的地址，把这个地址发给朋友即可。
- **云服务器**（最稳）：买一台便宜的小服务器，把整个 `项目目录` 传上去，
  `pip install -r requirements.txt` 后跑 `python server/app.py`，用 Nginx 套一层域名和 HTTPS。

> 外网暴露时请务必：改掉 `admin_token`、给服务器设好防火墙、别把 `server/data/orders.db` 公开出去。

### 方式 3：发布成微信小程序（真正"在微信里用"）

小程序和网页不一样，**必须注册账号并审核**才能给朋友用。流程：

1. 到 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序，主体选**个人**（免费），拿到 **AppID**。
2. 装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，
   "导入项目"选择 `项目目录` 目录，把 AppID 填进去（现在配置里是 `touristappid`，只能本地预览）。
3. 本地点"预览"，用微信扫码，先确认界面和数据都对。
4. 点"上传" → 到公众平台的**版本管理**里把它设为**体验版**，
   在"成员管理 → 体验成员"里把朋友的微信号加进去，朋友就能扫码体验（不用审核）。
5. 想彻底公开，就提交审核 → 审核通过后点"发布"，之后任何人搜到或扫码都能用。

小程序的两种点单模式：

- **默认（复制清单）**：选完菜生成一段文字，复制后发微信给你。不需要服务器。
- **连接服务器**：在「我的」页面填入上面方式 1/2 得到的地址，点"测试连接"，
  之后朋友点单会**直接进你的后台**，你打开 `/shop` 就能看到。

> 注意：小程序真机访问网络接口时，要求域名是 **HTTPS** 并且已在公众平台配置为
> **request 合法域名**。用 `http://192.168.x.x` 这种地址只有在开发者工具里勾了
> "不校验合法域名"时才通。所以真机要用服务器模式，基本等同于方式 2 做完之后。

---

## 六、常见问题

**手机打不开地址？**
确认手机和电脑在同一个 Wi-Fi；Windows 防火墙首次会弹窗，要点"允许访问"；
公司/学校网络常做了隔离，换手机热点试试。

**二维码扫出来是 `127.0.0.1`？**
说明没取到局域网 IP，通常是电脑没连网络。先连上网再启动。

**想清空测试订单？**
删掉 `server\data\orders.db` 再重启。

**改了菜单，小程序还是旧的？**
改完要跑 `export_menu.py`，再用微信开发者工具重新上传/预览。

**端口被占用？**
`.venv\Scripts\python server\app.py --port 9000`。

---

## 七、技术说明

- 服务端：Python 3.10+ / Flask 3 / Jinja2 / waitress，订单用标准库 `sqlite3`
- 网页端：原生 HTML/CSS/JS，没有前端框架，手机优先，微信浏览器可直接用
- 小程序：原生小程序（WXML/WXSS/JS），无第三方组件
- 依赖清单：`requirements.txt`

数据都存在你自己电脑上：菜单在 `menu.py`，订单在 `server/data/orders.db`，
小程序里的收藏和点单选菜保存在各人手机本地，互不干扰。
