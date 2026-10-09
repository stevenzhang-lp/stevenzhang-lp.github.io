# 内容文件运行与更新说明

本网站使用 Markdown 保存故事内容，并通过 Node.js 脚本生成浏览器可以直接读取的数据文件。

项目不需要 Python，也不包含 `.py` 文件。

## 1. 环境要求

请先确认电脑已安装 Node.js：

```bash
node --version
```

能够显示版本号即可，不需要安装额外的 npm 依赖。

## 2. 内容目录

每篇内容使用一个独立文件夹：

```text
content/stories/
├── voyage/
│   └── <story-slug>/
│       └── story.md
└── journal/
    └── <story-slug>/
        └── story.md
```

`story-slug` 建议使用小写英文和连字符，例如：

```text
content/stories/journal/my-first-note/story.md
content/stories/voyage/kuala-lumpur-night/story.md
```

## 3. 更新网站内容

在项目根目录运行：

```bash
node tools/sync-content.mjs
```

脚本会扫描 `content/stories/`，并更新：

```text
js/generated-content.js
content/journal/index.json
```

这两个文件是自动生成的，不应手动修改。

每次新增、删除或修改 `story.md` 后，都需要重新运行同步命令。

## 4. 自动监听

编辑多篇内容时，可以启动监听模式：

```bash
node tools/sync-content.mjs --watch
```

脚本会持续运行。Markdown 文件发生变化后，生成数据会自动更新。

结束监听可按：

```text
Control + C
```

## 5. 本地预览

浏览器不能通过 `file://` 直接读取 Markdown，因此需要启动本地静态服务器。

可以使用：

```bash
npx serve .
```

然后打开终端显示的本地地址，例如：

```text
http://localhost:3000
```

主要页面：

```text
http://localhost:3000/voyage.html
http://localhost:3000/journal.html
```

如果已经安装其他静态服务器工具，也可以使用其他方式启动；网站本身不依赖 `serve`。

## 6. Journal 文件示例

可以复制以下模板：

```text
content/stories/journal/_template/story.md
```

基本格式：

```markdown
---
title: 中文标题
title_en: English title
date: 2026-10-08
category: 随笔
category_en: NOTES
eyebrow: 思维碎片
eyebrow_en: THOUGHT FRAGMENT
excerpt: 中文摘要
excerpt_en: English summary
draft: false
---

# 中文标题

从这里开始写正文。
```

## 7. 隐藏草稿

不希望文章显示时，在 front matter 中设置：

```yaml
draft: true
```

设置为以下内容后会公开：

```yaml
draft: false
```

修改后需要重新运行：

```bash
node tools/sync-content.mjs
```

当前隐藏示例位于：

```text
content/stories/journal/_example/example.md
```

## 8. Voyage 图片结构

每个 Voyage 故事的图片放在对应名称的目录中：

```text
images/stories/<story-slug>/
├── original/
│   ├── cover.jpg
│   ├── gallery-01.jpg
│   └── gallery-02.jpg
├── hero/
├── card/
└── mini/
```

命名规则：

- 封面统一命名为 `cover.jpg`。
- 图集按照 `gallery-01.jpg`、`gallery-02.jpg` 顺序命名。
- `original`、`hero`、`card`、`mini` 中的文件名必须保持一致。
- `story.md` 中的 `slug` 必须和图片文件夹名称一致。

## 9. 删除内容

删除一篇内容时，删除对应故事文件夹，然后重新生成：

```bash
node tools/sync-content.mjs
```

Voyage 故事如果不再使用，也可以同时删除对应的：

```text
images/stories/<story-slug>/
```

## 10. 上传 GitHub 前检查

建议依次运行：

```bash
node tools/sync-content.mjs
node --check tools/sync-content.mjs
node --check js/generated-content.js
git status
```

确认 `story.md`、图片和自动生成的数据文件都已包含在 Git 变更中，再提交到 GitHub。

## 11. 常见问题

### 修改 Markdown 后页面没有变化

重新运行：

```bash
node tools/sync-content.mjs
```

然后刷新浏览器。必要时可以强制刷新页面。

### 页面显示文章读取失败

不要双击 HTML 文件打开。请通过本地静态服务器访问网站。

### 草稿意外显示

检查 front matter 是否准确包含：

```yaml
draft: true
```

然后重新运行同步命令。

### 图片无法显示

检查以下项目：

1. 图片文件名是否全部为小写 `.jpg`。
2. `cover.jpg` 和 `gallery-01.jpg` 命名是否正确。
3. 四个尺寸目录中的文件名是否一致。
4. `story.md` 的 `slug` 是否与图片目录一致。

### 手机端完整影集图片

添加或更换旅途图片后，生成轻量 WebP 影集版本：

```sh
python3 tools/build-album-images.py
```

需要 Pillow。输出位于每个故事的 `album/` 目录，最长边 960 像素；桌面影集仍使用 `card/`。图片预览先显示已加载的缩略图，再切换到屏幕尺寸的清晰版本。
