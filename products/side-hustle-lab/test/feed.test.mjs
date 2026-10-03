import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRss } from '../src/feed.mjs';

const fixture = await readFile(new URL('./fixtures/naver-rss.xml', import.meta.url), 'utf8');

test('RSS에서 최소 후보 필드만 추출한다', () => {
  const items = parseRss(fixture);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    sourceId: '224378846258',
    title: '블루오션 & 자동 부업',
    link: 'https://blog.naver.com/jyyjyy86/224378846258',
    publishedAt: 'Fri, 14 Aug 2026 20:27:09 +0900',
    excerpt: '공개 설명 링크',
  });
});

test('중복 링크와 HTTPS가 아닌 링크를 제외한다', () => {
  const duplicated = fixture.replace('</channel>', `
    <item><title>중복</title><link>https://blog.naver.com/jyyjyy86/224378846258</link></item>
    <item><title>비보안</title><link>http://example.com/1</link></item>
  </channel>`);
  assert.equal(parseRss(duplicated).length, 2);
});

test('빈 XML과 과도한 limit을 거부한다', () => {
  assert.throws(() => parseRss(''), /non-empty string/);
  assert.throws(() => parseRss(fixture, { limit: 101 }), /1 to 100/);
});
