import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const published = path.join(root, 'public-dist');

async function javascriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(target));
    else if (entry.name.endsWith('.js')) files.push(target);
  }
  return files;
}

test('published viewers and all staged JavaScript resolve dependencies inside the public build', async () => {
  execFileSync(process.execPath, ['scripts/stage-public-site.mjs'], { cwd: root, stdio: 'pipe' });
  assert.equal(
    await readFile(path.join(published, 'src/ai-builder/mega-retail-policy.js'), 'utf8'),
    await readFile(path.join(root, 'src/ai-builder/mega-retail-policy.js'), 'utf8'),
  );
  assert.equal(
    await readFile(path.join(published, 'composed-sections.js'), 'utf8'),
    await readFile(path.join(root, 'composed-sections.js'), 'utf8'),
  );
  for (const name of ['manifest.json', 'section.html', 'section.css']) {
    const relative = path.join('templates', 'sections', 'corporate-company-pro--home--corporate-hero', name);
    assert.equal(await readFile(path.join(published, relative), 'utf8'), await readFile(path.join(root, relative), 'utf8'));
  }
  await assert.rejects(readFile(path.join(published, 'templates/sections/quote-upload--custom-order/manifest.json')), { code: 'ENOENT' });
  const entries = await javascriptFiles(published);
  const result = await build({
    entryPoints: entries, bundle: true, write: false, metafile: true,
    outdir: path.join(published, '__dependency_check__'), logLevel: 'silent',
    plugins: [{
      name: 'published-browser-paths',
      setup(builder) {
        builder.onResolve({ filter: /^\// }, (args) => ({
          path: path.join(published, args.path.split(/[?#]/)[0]),
        }));
      },
    }],
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    const relative = path.relative(published, path.resolve(input.split(/[?#]/)[0]));
    assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative),
      `Dependency escaped the published build: ${input}`);
  }
});
