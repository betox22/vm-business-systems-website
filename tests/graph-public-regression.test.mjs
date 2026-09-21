import test from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { comparePublicBoot } from '../scripts/graph-public-regression.mjs';

test('public site.html boots and serves byte-identical HTML before/after the presentation patch', async () => {
  const schema = JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8'));
  const payload = process.env.GRAPH_PUBLIC_PAYLOAD
    ? JSON.parse((await readFile(process.env.GRAPH_PUBLIC_PAYLOAD, 'utf8')).replace(/^\uFEFF/, ''))
    : { site_id: 'qa-public', business_id: 'qa-store', schema, catalog_items: schema.catalog_items };
  const result = await comparePublicBoot(payload);
  if (process.env.GRAPH_PUBLIC_EVIDENCE) await writeFile(process.env.GRAPH_PUBLIC_EVIDENCE, JSON.stringify(result, null, 2));
});
