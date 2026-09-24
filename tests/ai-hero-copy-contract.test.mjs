import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));

async function mergeLockedTemplatePage() {
  const source = await readFile(path.join(root, 'src/ai-builder/index.js'), 'utf8');
  const start = source.indexOf('function mergeLockedTemplatePage(');
  const end = source.indexOf('\nfunction executablePagesForTemplate(', start);
  assert.ok(start > 0 && end > start);
  return runInNewContext(`${source.slice(start, end)}; mergeLockedTemplatePage`, {
    arrayValue: (value) => Array.isArray(value) ? value : [],
    slugify: (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  });
}

test('canonical premium hero retains planner headline, subtitle, and actions over fixed copy', async () => {
  const merge = await mergeLockedTemplatePage();
  const copy = {
    headline: 'Te de origen para cada ritual diario',
    subheadline: 'Mezclas artesanales de te e infusiones a granel.',
    ctaPrimary: 'Explorar tes',
    ctaSecondary: 'Conocer las mezclas',
  };
  const result = merge(
    { page_key: 'home', sections: [{ id: 'premium_hero', type: 'PremiumHero', editable: {
      headline: 'Conoce Bruma', subtitle: 'Una experiencia de producto refinada.',
      primary_button: 'Ver productos', secondary_button: 'Contacto',
    } }] },
    { page_key: 'home', sections: [{ id: 'premium_hero', type: 'PremiumHero', editable: {
      ...copy,
      subtitle: copy.subheadline,
      primary_button: copy.ctaPrimary,
      secondary_button: copy.ctaSecondary,
      copy,
    } }] },
  );

  assert.equal(result.sections[0].editable.headline, copy.headline);
  assert.equal(result.sections[0].editable.subtitle, copy.subheadline);
  assert.equal(result.sections[0].editable.primary_button, copy.ctaPrimary);
  assert.equal(result.sections[0].editable.secondary_button, copy.ctaSecondary);
  assert.deepEqual(JSON.parse(JSON.stringify(result.sections[0].editable.copy)), copy);
});

test('unmapped planner hero cannot silently replace an executable hero', async () => {
  const merge = await mergeLockedTemplatePage();
  const result = merge(
    { page_key: 'home', sections: [{ id: 'premium_hero', type: 'PremiumHero', editable: { headline: 'Conoce Bruma' } }] },
    { page_key: 'home', sections: [{ id: 'home-hero', type: 'PremiumHero', editable: { headline: 'Te artesanal de Bruma' } }] },
  );

  assert.equal(result.sections[0].editable.headline, 'Conoce Bruma');
});
