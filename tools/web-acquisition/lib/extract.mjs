export async function extractRenderedEvidence(page, options = {}) {
  const textLimit = options.textLimit ?? 20_000;
  const linkLimit = options.linkLimit ?? 100;
  const title = (await page.title()).trim();
  const rawText = await page.locator('body').innerText().catch(() => '');
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  const rawLinks = await page.locator('a[href]').evaluateAll((nodes) =>
    nodes.map((node) => node.href).filter(Boolean),
  );

  const links = [...new Set(rawLinks)];
  const textTruncated = normalizedText.length > textLimit;
  const linksTruncated = links.length > linkLimit;
  const warnings = [];
  if (textTruncated) warnings.push('TEXT_TRUNCATED');
  if (linksTruncated) warnings.push('LINKS_TRUNCATED');

  return {
    title,
    text: normalizedText.slice(0, textLimit),
    links: links.slice(0, linkLimit),
    truncated: textTruncated || linksTruncated,
    warnings,
  };
}
