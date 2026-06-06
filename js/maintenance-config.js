/**
 * MAINTENANCE MODE CONFIGURATION / 维护模式配置
 * 
 * You can toggle maintenance mode for specific pages or the entire domain here.
 * 你可以在这里开启或关闭特定页面或整个网站的维护/禁用状态。
 */
const MAINTENANCE_CONFIG = {
    // Set to true to temporarily disable access to the entire domain.
    // 设置为 true 以暂时禁用整个域名的访问。
    disableWholeDomain: false,

    // Define which pages should be disabled. 
    // Keys must match the exact HTML filename (e.g. 'diary.html', 'journal.html').
    // Set to true to disable a page, or false to enable it.
    // 定义哪些页面需要禁用。键名需与 HTML 文件名完全一致。
    disabledPages: {
        'diary.html': true,      // 日常切片 / Daily Fragments
        'journal.html': true,    // 思维碎片 / Thought Fragments
        'voyage.html': false,    // 时空档案室 / Voyage Archive
        'math.html': false,      // 数学/技术 / Math
        'vault.html': false,     // 归档 / Vault
        'share.html': false,     // 分享 / Share
        'index.html': false      // 首页 / Hub
    }
};
