import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const sectionsDir = path.join(root, 'templates/sections');
const image = (name) => `https://images.example.test/${name}.png`;
const navigation = {
  'business.name': 'ElectroHub',
  home_page_key: 'home',
  navigation_label: 'Navegación principal',
  footer_navigation_label: 'Enlaces del sitio',
  footer_text: 'ElectroHub · Información de contacto y productos',
};
const navigationItems = [
  { label: 'Inicio', page_key: 'home' },
  { label: 'Productos', page_key: 'catalog' },
  { label: 'Contacto', page_key: 'contact' },
];

const cases = [
  {
    id: 'mega-retail-store--home--hero', archetype: 'retail', heading: 'Herramientas para construir',
    copy: {
      headline: 'Herramientas para construir', subtitle: 'Explora el catálogo de ElectroHub',
      primary_button: 'Ver productos', primary_page_key: 'catalog',
      category_1: 'Herramientas', category_2: 'Iluminación',
      image_1_alt: 'Herramientas de trabajo', image_2_alt: 'Taladros', image_3_alt: 'Lámparas',
    },
    images: { image_1: image('retail-hero'), image_2: image('tools'), image_3: image('lighting') },
  },
  {
    id: 'local-services-pro-plus--home--home-service-hero', archetype: 'services', heading: 'Instalación a medida',
    copy: {
      headline: 'Instalación a medida', subtitle: 'Conoce nuestros servicios de instalación',
      primary_button: 'Ver servicios', primary_page_key: 'services',
      secondary_button: 'Contactar', secondary_page_key: 'contact', image_alt: 'Equipo instalando iluminación',
    },
    images: { image_1: image('service') },
  },
  {
    id: 'restaurant-food-business--home--restaurant-hero', archetype: 'restaurant', heading: 'Cocina de temporada',
    copy: {
      headline: 'Cocina de temporada', subtitle: 'Consulta el menú del restaurante',
      primary_button: 'Ver menú', primary_page_key: 'menu',
      secondary_button: 'Contacto', secondary_page_key: 'contact', image_alt: 'Plato de temporada',
    },
    images: { image_1: image('restaurant') },
  },
  {
    id: 'luxury-high-ticket-pro--home--luxury-hero', archetype: 'premium_luxury', heading: 'Piezas seleccionadas',
    copy: {
      headline: 'Piezas seleccionadas', subtitle: 'Conoce la colección del estudio',
      primary_button: 'Ver colección', primary_page_key: 'collection',
      secondary_button: 'Contactar', secondary_page_key: 'contact', image_alt: 'Objeto de la colección',
    },
    images: { image_1: image('luxury') },
  },
  {
    id: 'booking-appointment-pro--home--booking-hero', archetype: 'booking', heading: 'Reserva tu sesión',
    copy: {
      service_category: 'Cuidado personal', headline: 'Reserva tu sesión', subtitle: 'Elige el servicio adecuado',
      primary_button: 'Ver horarios', primary_page_key: 'booking', secondary_button: 'Consultar',
      secondary_page_key: 'contact', image_alt: 'Sala de atención',
    },
    images: { image_1: image('booking') },
  },
  {
    id: 'corporate-company-pro--home--corporate-hero', archetype: 'corporate', heading: 'Soluciones para empresas',
    copy: {
      industry: 'Consultoría', headline: 'Soluciones para empresas', subtitle: 'Conoce nuestro enfoque',
      primary_button: 'Servicios', primary_page_key: 'services', secondary_button: 'Contacto',
      secondary_page_key: 'contact', image_alt: 'Equipo de consultoría',
    },
    images: { image_1: image('corporate') },
  },
  {
    id: 'home-services-premium--home--home-service-hero', archetype: 'services', heading: 'Mejora tu espacio',
    copy: {
      service_category: 'Servicios del hogar', headline: 'Mejora tu espacio', subtitle: 'Explora las opciones disponibles',
      primary_button: 'Ver servicios', primary_page_key: 'services', secondary_button: 'Contacto',
      secondary_page_key: 'contact', image_alt: 'Profesional trabajando en una vivienda',
    },
    images: { image_1: image('home-service') },
  },
  {
    id: 'lead-funnel-pro--home--funnel-hero', archetype: 'lead_generation', heading: 'Hablemos de tu proyecto',
    copy: {
      industry: 'Diseño', headline: 'Hablemos de tu proyecto', subtitle: 'Cuéntanos qué necesitas',
      primary_button: 'Iniciar consulta', primary_page_key: 'contact', secondary_button: 'Conocer el proceso',
      secondary_page_key: 'process', image_alt: 'Proceso de diseño',
    },
    images: { image_1: image('funnel') },
  },
  {
    id: 'listing-marketplace-pro--home--hero', archetype: 'marketplace', heading: 'Explora propiedades',
    copy: {
      category: 'Viviendas', headline: 'Explora propiedades', subtitle: 'Encuentra opciones para tu búsqueda',
      primary_button: 'Ver listados', primary_page_key: 'listings', secondary_button: 'Contacto',
      secondary_page_key: 'contact', image_alt: 'Interior de una vivienda',
    },
    images: { image_1: image('listing') },
  },
  {
    id: 'shared--header', archetype: null, heading: 'ElectroHub',
    copy: Object.fromEntries(Object.entries(navigation).filter(([key]) => key !== 'footer_navigation_label' && key !== 'footer_text')),
    lists: { navigation: navigationItems },
    images: {},
  },
  {
    id: 'shared--footer', archetype: null, heading: 'ElectroHub',
    copy: Object.fromEntries(Object.entries(navigation).filter(([key]) => key !== 'navigation_label')),
    lists: { navigation: navigationItems },
    images: {},
  },
];

test('certified heroes and shared shell render with real bindings and shared color tokens', async (context) => {
  const tokens = JSON.parse(await readFile(path.join(sectionsDir, 'shared-color-tokens.json'), 'utf8'));
  const certifiedIds = JSON.parse(await readFile(path.join(sectionsDir, 'certified-section-ids.json'), 'utf8'));
  assert.deepEqual(new Set(certifiedIds), new Set(cases.map((fixture) => fixture.id)));
  assert.equal(tokens.version, 1);
  const allowedColors = new Set(Object.values(tokens.tokens));
  const bundle = await build({ absWorkingDir: root, entryPoints: ['composed-sections.js'],
    bundle: true, write: false, format: 'iife', globalName: 'CertifiedSections', logLevel: 'silent' });
  const browser = await chromium.launch();
  try {
    for (const fixture of cases) {
      await context.test(fixture.id, async () => {
        const manifest = JSON.parse(await readFile(path.join(sectionsDir, fixture.id, 'manifest.json'), 'utf8'));
        const html = await readFile(path.join(sectionsDir, fixture.id, 'section.html'), 'utf8');
        const css = await readFile(path.join(sectionsDir, fixture.id, 'section.css'), 'utf8');
        assert.equal(manifest.id, fixture.id);
        assert.equal(manifest.eligibility.requires_archetype, fixture.archetype);
        assert.deepEqual(new Set(manifest.required_copy_fields), new Set(Object.keys(fixture.copy)));
        assert.deepEqual(Object.keys(manifest.collection_bindings || {}), Object.keys(fixture.lists || {}));
        assert.deepEqual(new Set(manifest.image_slots.map((slot) => slot.slot_id)), new Set(Object.keys(fixture.images)));
        assert.ok(manifest.image_slots.every((slot) => slot.min === 1 && slot.max === 1));
        assert.doesNotMatch(html, /sample category|section_product_name|brand mark|lorem ipsum|data-inline-edit-path|template-[a-z-]+|<!--/i);
        assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\/\*/i);
        for (const match of css.matchAll(/var\((--site-[a-z-]+)/g)) {
          assert.ok(allowedColors.has(match[1]) || ['--site-heading', '--site-body'].includes(match[1]), match[1]);
        }
        const page = await browser.newPage();
        try {
          await page.route('https://sections.test/**', async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<main id="mount"></main>' });
            const match = /^\/templates\/sections\/([a-z0-9-]+)\/(manifest\.json|section\.html|section\.css)$/.exec(pathname);
            if (!match) return route.abort();
            const body = await readFile(path.join(sectionsDir, match[1], match[2]), 'utf8');
            return route.fulfill({ contentType: match[2].endsWith('json') ? 'application/json' : 'text/plain', body });
          });
          await page.goto('https://sections.test/');
          await page.evaluate(bundle.outputFiles[0].text);
          const result = await page.evaluate(async ({ id, copy, images, lists }) => {
            const section = { type: 'composed', section_id: id, copy_bindings: copy, image_bindings: images, list_bindings: lists };
            await CertifiedSections.preloadComposedSections({ pages: [{ sections: [section] }] });
            const rendered = CertifiedSections.renderComposedSection(section);
            document.querySelector('#mount').innerHTML = rendered;
            const root = document.querySelector('div[data-composed-section]');
            const missing = { ...copy };
            delete missing[Object.keys(missing)[0]];
            return {
              rendered, text: root?.textContent || '',
              textFragments: [...(root?.querySelectorAll('*') || [])]
                .filter((element) => element.children.length === 0 && element.textContent.trim())
                .map((element) => element.textContent.trim()),
              links: [...(root?.querySelectorAll('a[data-page-link]') || [])].map((link) => ({
                href: link.getAttribute('href'), pageKey: link.dataset.pageLink,
              })),
              images: [...(root?.querySelectorAll('img') || [])].map((item) => ({
                src: item.getAttribute('src'), alt: item.getAttribute('alt'),
              })),
              rejectsMissing: CertifiedSections.renderComposedSection({ ...section, copy_bindings: missing }) === '',
              css: document.querySelector(`style[data-composed-section="${id}"]`)?.textContent || '',
            };
          }, { id: fixture.id, copy: fixture.copy, images: fixture.images, lists: fixture.lists });
          assert.ok(result.rendered);
          assert.ok(result.text.includes(fixture.heading));
          if (!fixture.lists) {
            assert.ok(result.textFragments.every((fragment) => Object.values(fixture.copy).includes(fragment)), fixture.id);
          }
          for (const [field, value] of Object.entries(fixture.copy)) {
            if (!field.endsWith('page_key') && !field.endsWith('_alt') && !field.endsWith('navigation_label')) {
              assert.ok(result.text.includes(value), `${fixture.id}: ${field}`);
            }
          }
          assert.doesNotMatch(result.rendered, /\{\{[^{}]+\}\}|sample category|section_product_name|brand mark|lorem ipsum|fast shipping|licensed and insured|fast local response|pickup \/ delivery|verified provenance|limited selection/i);
          assert.deepEqual(new Set(result.images.map((item) => item.src)), new Set(Object.values(fixture.images)));
          assert.ok(result.images.every((item) => item.alt && Object.values(fixture.copy).includes(item.alt)));
          assert.ok(result.links.length >= 1);
          assert.ok(result.links.every((link) => link.href === `#${link.pageKey}` && link.pageKey));
          assert.equal(result.rejectsMissing, true);
          if (fixture.lists) {
            assert.deepEqual(result.links.slice(1).map((link) => link.pageKey), navigationItems.map((item) => item.page_key));
          }
          assert.match(result.css, /@scope/);
          await page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
