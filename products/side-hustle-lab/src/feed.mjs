const ENTITY_MAP = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
]);

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return ENTITY_MAP.get(entity.toLowerCase()) ?? match;
  });
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';
  const withoutCdata = match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1');
  return decodeEntities(withoutCdata.trim());
}

function cleanText(html) {
  return decodeEntities(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalLink(rawLink) {
  const url = new URL(rawLink);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function sourceId(link, index) {
  const match = link.match(/\/(\d+)\/?$/);
  return match?.[1] ?? `rss-${index + 1}`;
}

export function parseRss(xml, { limit = 50 } = {}) {
  if (typeof xml !== 'string' || xml.trim() === '') {
    throw new TypeError('xml must be a non-empty string');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError('limit must be an integer from 1 to 100');
  }

  const itemBlocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  const seen = new Set();
  const items = [];

  for (const [index, match] of itemBlocks.entries()) {
    const title = cleanText(tagValue(match[1], 'title'));
    const rawLink = tagValue(match[1], 'link');
    if (!title || !rawLink) continue;

    let link;
    try {
      link = canonicalLink(rawLink);
    } catch {
      continue;
    }
    if (!link.startsWith('https://')) continue;
    if (seen.has(link)) continue;
    seen.add(link);

    const description = cleanText(tagValue(match[1], 'description'));
    const publishedAt = tagValue(match[1], 'pubDate');

    items.push({
      sourceId: sourceId(link, index),
      title,
      link,
      publishedAt: publishedAt || null,
      excerpt: description.slice(0, 280),
    });

    if (items.length === limit) break;
  }

  return items;
}

