# Steven Zhang's Personal Website

This repository contains the source code for my personal website and digital archive (deployed at [stevenzhangym.com](https://stevenzhangym.com)).

Built with vanilla HTML, CSS, and JavaScript.

内容新增、同步与本地预览方式请参阅 [`CONTENT_WORKFLOW.md`](CONTENT_WORKFLOW.md)。

## Markdown 思维碎片

内容采用“一篇故事一个文件夹”的结构：

```text
content/stories/
├── voyage/<story-slug>/story.md
└── journal/<story-slug>/story.md

images/stories/<story-slug>/
├── original/cover.jpg, gallery-01.jpg, ...
├── hero/cover.jpg, gallery-01.jpg, ...
├── card/cover.jpg, gallery-01.jpg, ...
└── mini/cover.jpg, gallery-01.jpg, ...
```

修改或新增 `story.md` 后运行：

```bash
node tools/sync-content.mjs
```

开发时可持续监听：

```bash
node tools/sync-content.mjs --watch
npx serve .
```

脚本会同时生成 `js/generated-content.js` 和 `content/journal/index.json`。打开终端输出的本地地址并进入网站；浏览器出于安全限制不能从 `file://` 读取 Markdown，因此请用本地服务器预览。随笔模板见 `content/stories/journal/_template/story.md`；以下划线开头或设置 `draft: true` 的故事不会进入索引。
