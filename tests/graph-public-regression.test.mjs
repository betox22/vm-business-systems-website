import test from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { verifyPublicBoot } from '../scripts/graph-public-regression.mjs';
import { withSharedShell } from './fixtures/graph-presentation-shell.mjs';

test('public site.html boots with the shared shell at desktop and mobile widths', async () => {
  const schema = withSharedShell(JSON.parse(await readFile(new URL('./fixtures/graph-presentation.json', import.meta.url), 'utf8')));
  const payload = process.env.GRAPH_PUBLIC_PAYLOAD
    ? JSON.parse((await readFile(process.env.GRAPH_PUBLIC_PAYLOAD, 'utf8')).replace(/^\uFEFF/, ''))
    : { site_id: 'qa-public', business_id: 'qa-store', schema, catalog_items: schema.catalog_items };
  const result = await verifyPublicBoot(payload);
  if (process.env.GRAPH_PUBLIC_EVIDENCE) await writeFile(process.env.GRAPH_PUBLIC_EVIDENCE, JSON.stringify(result, null, 2));
});
