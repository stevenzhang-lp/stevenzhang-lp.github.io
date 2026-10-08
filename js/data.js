// Generated content is loaded before this file. Edit content/stories and run
// `node tools/sync-content.mjs` instead of editing these arrays directly.
const photos = window.CONTENT_PHOTOS || [];
const diaries = window.CONTENT_DIARIES || [];
const journals = window.CONTENT_JOURNALS || [];

const locationMap = {
    'CHINA·TAIPEI': { enTitle: 'TAIPEI', zhTitle: '台北', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·XINJIANG': { enTitle: 'XINJIANG', zhTitle: '新疆', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·JIANGXI': { enTitle: 'JIANGXI', zhTitle: '江西', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·HONG KONG': { enTitle: 'HONG KONG', zhTitle: '香港', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·YUNNAN': { enTitle: 'YUNNAN', zhTitle: '云南', enSub: 'CHINA', zhSub: '中国' },
    'MALAYSIA·KUALA LUMPUR': { enTitle: 'KUALA LUMPUR', zhTitle: '吉隆坡', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'MALAYSIA·PUTRAJAYA': { enTitle: 'PUTRAJAYA', zhTitle: '布城', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'MALAYSIA·PENANG': { enTitle: 'PENANG', zhTitle: '槟城', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'SINGAPORE': { enTitle: 'SINGAPORE', zhTitle: '新加坡', enSub: 'SINGAPORE', zhSub: '新加坡' }
};

// Each story stores original, hero, card and mini versions under images/stories/<slug>/.
function imageVariant(src, size) {
	const storyMatch = /^(images\/stories\/[^/]+)\/original\/(.+\.jpe?g)$/i.exec(src || '');
	const effectiveSize = size === 'hero' && window.matchMedia?.('(max-width: 760px), (pointer: coarse)').matches ? 'card' : size;
	if (storyMatch) return `${storyMatch[1]}/${effectiveSize}/${storyMatch[2].replace(/\.jpeg$/i, '.jpg')}`;
    return src;
}

const monthMap = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };

function parseDate(dateStr) {
    const parts = dateStr.replace(',', '').split(' ');
    if (parts.length === 3) {
        return {
            en: dateStr,
            zh: `${parts[2]}年${monthMap[parts[0]]}月${parts[1]}日`
        };
    }
    return { en: dateStr, zh: dateStr };
}

function parseLocation(loc) {
    if (locationMap[loc]) return locationMap[loc];
    // fallback
    if (loc.includes('·')) {
        const [country, detail] = loc.split('·');
        return { enTitle: detail, zhTitle: detail, enSub: country, zhSub: country };
    }
    return { enTitle: loc, zhTitle: loc, enSub: 'SOUTHEAST ASIA', zhSub: '东南亚' };
}

const vaultConfig = {
    encryptedPrivJwk: "9f5ce81234a3bafa397060b4a1740f1234cb6f99f6471d319073b7bab51d63188edaf92ddc51633756ad43f7b0ad6da66040d0b7860fc9d24e8fd25429db39c930d10545033e5b33d204e0472d0870a9dd19cce2486591e85c54d263d9089b0b6126c413cacf6d8390bd106b5266fbd0ce51b9ba70b12a16d81f6bfd9a1d368ecc6b3f98db1338f0a9fbde1fbcc68ee3b4fd9aee30b0a30d792205bf6dba61738b729b9815947ba839fd64d5b59b7bbf",
    privIv: "d8b84888136c194455aa8956",
    privTag: "4acd02907a0c8b961b08a25ca59f7a81",
    passcodeSalt: "841877dd6b624efd8ea4d312a14547d9",
    ephPubJwk: {
        "kty": "EC",
        "x": "0sIgEMulhBy_edBngdYVsT5GuCCW3N8z6_FOx8GAWNM",
        "y": "WvqwLAltz0clNBIS3bHvT0d-imMD5ZW6oM0T6MUiBxo",
        "crv": "P-256"
    },
    staticPubJwk: {
        "kty": "EC",
        "x": "qHKaf9MJVkFiw7RfxPveWjAmjPbgm7cTSXYvUPoTXbs",
        "y": "eYVh0Jx7-8QI__FfmyEGqNDhGt0ekTBAmR5iFHqlXC0",
        "crv": "P-256"
    },
    encryptedEntries: "a05b",
    entriesIv: "68b9477f7ad0e744f3c455f0",
    entriesTag: "785ce2d5aad4cfaec32ec3bb19cbc661"
};
