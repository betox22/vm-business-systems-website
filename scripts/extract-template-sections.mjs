import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, "templates", "sections");
const certifiedSectionIds = new Set(JSON.parse(await readFile(join(outputRoot, "certified-section-ids.json"), "utf8")));
const source = await readFile(join(root, "backend", "app", "agents.py"), "utf8");
const catalogSource = source.split("TEMPLATE_CATALOG:")[1].split("\n\ndef template_catalog_for_state")[0];
const catalogEntries = [...catalogSource.matchAll(/^    "([a-z][a-z0-9-]+)": \{\s*"name": "([^"]+)"/gm)];
const templateIds = catalogEntries.map((match) => match[1]);
const templateNames = Object.fromEntries(catalogEntries.map((match) => [match[1], match[2]]));
const css = await readFile(join(root, "ai-builder.css"), "utf8");
const injection = 'window.__extractPages = (id) => { const copy = instantLocaleCopy("en"); const pages = executablePagesForTemplate(id, "", copy, "SECTION_BUSINESS_NAME", "SECTION_BUSINESS_DESCRIPTION", { selectedLanguage: "en", assets: [], photoUrls: [] }); return pages.length ? pages : buildDefaultInstantPages(copy, "SECTION_BUSINESS_NAME", "SECTION_BUSINESS_DESCRIPTION", { assets: [] }); };';
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ["src/ai-builder/renderers.js"],
  alias: { "@kreaton/shared-commerce-cart": join(root, "shared-commerce-cart.js") },
  bundle: true,
  format: "iife",
  globalName: "SectionRenderer",
  platform: "browser",
  write: false,
  plugins: [{
    name: "expose-template-pages",
    setup(plugin) {
      plugin.onLoad({ filter: /[\\/]src[\\/]ai-builder[\\/]index\.js$/ }, async (args) => ({
        contents: `${await readFile(args.path, "utf8")}\n${injection}`,
        loader: "js",
      }));
    },
  }],
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  page.on("pageerror", (error) => process.stderr.write(`Bundle error: ${error.message}\n`));
  await page.route("http://localhost:8765/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
  await page.goto("http://localhost:8765/");
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => { window.__extractRender = window.SectionRenderer.renderWebsite; });
  const result = await page.evaluate(({ ids, names }) => {
    const entries = [];
    const failures = [];
    const seen = new Set();
    const slug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const typeOf = (type) => {
      const text = String(type || "").toLowerCase();
      if (/hero|bento/.test(text)) return "hero";
      if (/catalog|product|collection|menu|deal|listing|pricing|program|service|course/.test(text)) return "catalog";
      if (/quote|rfq|upload/.test(text)) return "quote_upload";
      if (/process|path|step|supply|module/.test(text)) return "process";
      if (/about|story|provenance|team|instructor|proof|trust|certif|result|outcome/.test(text)) return "about";
      if (/footer/.test(text)) return "footer";
      if (/header|nav/.test(text)) return "header";
      if (/contact|consult|demo|book|enroll|order|access/.test(text)) return "contact";
      if (/gallery|lookbook|portfolio|video/.test(text)) return "gallery";
      if (/faq/.test(text)) return "faq";
      return "feature";
    };
    const cssFor = (element, site) => {
      const matches = (selector) => {
        try {
          const clean = selector.replace(/::?[a-z-]+(?:\([^)]*\))?/gi, "");
          const found = document.querySelectorAll(clean);
          return [...found].some((node) => node === site || node === element || element.contains(node));
        } catch {
          return false;
        }
      };
      const collect = (rules) => [...rules].flatMap((rule) => {
        if (rule.type === CSSRule.STYLE_RULE) {
          return rule.selectorText.split(/,(?![^()]*\))/).some(matches) ? [rule.cssText] : [];
        }
        if (rule.cssRules) {
          const inside = collect(rule.cssRules);
          return inside.length ? [`${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{\n${inside.join("\n")}\n}`] : [];
        }
        return [];
      });
      return [...document.styleSheets].flatMap((sheet) => collect(sheet.cssRules)).join("\n\n");
    };
    const imageRole = (type, image, index) => {
      if (type === "hero") return index === 0 ? "hero_candidate" : "product_card";
      if (type === "catalog") return "product_card";
      if (type === "process") return "process_shot";
      if (type === "about" && /team|portrait|instructor/i.test(image.closest("section, article")?.className || "")) return "portrait";
      return "texture_atmosphere";
    };
    const add = (templateId, pageKey, section, element, site, typeName) => {
      const id = `${templateId}--${slug(pageKey)}--${slug(section?.id || typeName)}`;
      if (seen.has(id)) return;
      seen.add(id);
      const sectionType = typeOf(typeName);
      const imageElements = [...element.querySelectorAll("img")];
      const fragment = element.cloneNode(true);
      [...fragment.querySelectorAll("img")].forEach((image, index) => image.setAttribute("src", `{{image_${index + 1}}}`));
      const copy = Object.entries(section?.editable || {})
        .filter(([key, value]) => typeof value === "string" && !/image|url|media|query/i.test(key))
        .map(([key]) => key);
      let partial = fragment.outerHTML;
      for (const key of copy) {
        const value = section.editable[key];
        if (value) partial = partial.replaceAll(value, `{{${key}}}`);
      }
      partial = partial
        .replaceAll("SECTION_BUSINESS_NAME", "{{business.name}}")
        .replaceAll("SECTION_BUSINESS_DESCRIPTION", "{{business.description}}")
        .replaceAll("SECTION_PRODUCT_NAME", "{{product.name}}")
        .replaceAll("SECTION_PRODUCT_DESCRIPTION", "{{product.description}}")
        .replaceAll("SECTION_PRODUCT_PRICE", "{{product.price_label}}")
        .replaceAll("SECTION_FOOTER_TEXT", "{{footer_text}}")
        .replaceAll("Sample industry", "{{business.industry}}")
        .replaceAll("Sample tone", "{{business.tone}}")
        .replaceAll("Sample category", "{{product.category}}")
        .replace(/SECTION_COPY_([a-z0-9-]+)_([a-z0-9_]+)/g, "{{source.$1.$2}}");
      const usedCopy = [
        ...copy.filter((key) => partial.includes(`{{${key}}}`)),
        ...[...partial.matchAll(/\{\{(source\.[^.}]+\.[^}]+)\}\}/g)].map((match) => match[1]),
      ];
      partial = `<div class="rendered-site template-${templateId}">${partial}</div>`;
      const images = imageElements.map((image, index) => ({
        slot_id: `image_${index + 1}`,
        image_role: imageRole(sectionType, image, index),
        min: 0,
        max: 1,
      }));
      entries.push({
        id,
        section_type: sectionType,
        source_template: names[templateId],
        eligibility: { requires_archetype: null },
        required_copy_fields: usedCopy,
        image_slots: images,
        animation_profile: section?.motion?.preset || section?.motion?.type || "none",
        html_partial: `${id}/section.html`,
        css_partial: `${id}/section.css`,
        html: partial,
        css: cssFor(element, site),
      });
    };
    for (const templateId of ids) {
      let pages;
      try {
        pages = window.__extractPages(templateId);
      } catch (error) {
        failures.push(`${templateId}: pages: ${error.message}`);
        continue;
      }
      if (!pages?.length) {
        failures.push(`${templateId}: no pages`);
        continue;
      }
      for (const item of pages) {
        for (const section of item.sections || []) {
          for (const [key, value] of Object.entries(section.editable || {})) {
            if (key === "image_url" && !value) {
              section.editable[key] = "/images/product-placeholder.svg";
              continue;
            }
            if (typeof value === "string" && !/image|url|media|query/i.test(key)) {
              section.editable[key] = `SECTION_COPY_${slug(section.id || section.type)}_${key}`;
            }
          }
        }
      }
      for (const current of pages) {
        const sections = current.sections || [];
        const schema = {
          business: { name: "SECTION_BUSINESS_NAME", description: "SECTION_BUSINESS_DESCRIPTION", industry: "Sample industry", tone: "Sample tone", selectedLanguage: "en" },
          pages,
          navigation: pages.map((item) => ({ page_key: item.page_key, label: item.title || item.page_key })),
          selected_template: { id: templateId },
          active_template: { id: templateId },
          layout_mode: { id: "standard" },
          catalog_items: [{ id: "sample-product", name: "SECTION_PRODUCT_NAME", description: "SECTION_PRODUCT_DESCRIPTION", category: "Sample category", price_label: "SECTION_PRODUCT_PRICE", image_url: "/images/product-placeholder.svg", is_active: true }],
          products_services: [],
          global_components: { footer_text: "SECTION_FOOTER_TEXT" },
          brand: {},
          theme: {},
          contact: {},
        };
        let html;
        try {
          html = window.__extractRender(schema, current.page_key, { isClientPreviewMode: true });
        } catch (error) {
          failures.push(`${templateId}/${current.page_key}: render: ${error.message}`);
          continue;
        }
        const mount = document.createElement("div");
        mount.innerHTML = html;
        document.body.replaceChildren(mount);
        const site = mount.querySelector(".rendered-site");
        if (!site) {
          failures.push(`${templateId}/${current.page_key}: missing site`);
          continue;
        }
        if (current === pages[0]) {
          const header = site.querySelector("header");
          const footer = site.querySelector("footer");
          if (header) add(templateId, "global", { id: "header" }, header, site, "header");
          if (footer) add(templateId, "global", { id: "footer", editable: { footer_text: "" } }, footer, site, "footer");
        }
        const dedicated = templateId === "mega-retail-store"
          ? [[".mega-retail-bento", "hero", "MarketplaceHero"], [".mega-retail-deals", "catalog", "DealRow"], [".mega-retail-trust", "trust", "TrustStrip"]]
          : templateId === "b2b-saas-enterprise-pro"
            ? [[".b2b-saas-hero", "hero", "EnterpriseHero"], [".b2b-saas-logo-row", "proof", "EnterpriseProof"], [".b2b-saas-features", "solutions", "EnterpriseSolutions"], [".b2b-saas-pricing", "pricing", "EnterprisePricing"], [".b2b-saas-cta", "demo", "EnterpriseDemo"]]
            : [];
        for (const [selector, name, sourceType] of dedicated) {
          const element = site.querySelector(selector);
          if (element) add(templateId, current.page_key, { ...(sections.find((section) => section.type === sourceType) || {}), id: name }, element, site, name);
        }
        for (const section of sections) {
          const element = [...site.querySelectorAll("[data-studio-section]")]
            .find((node) => node.getAttribute("data-studio-section") === section.id);
          if (element) add(templateId, current.page_key, section, element, site, section.type);
        }
      }
    }
    return { entries, failures };
  }, { ids: templateIds, names: templateNames });

  if (result.failures.length) throw new Error(result.failures.join("\n"));
  await mkdir(outputRoot, { recursive: true });
  for (const entry of result.entries) {
    if (certifiedSectionIds.has(entry.id)) continue;
    const { html, css: sectionCss, ...manifest } = entry;
    const directory = join(outputRoot, entry.id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(join(directory, "section.html"), `${html}\n`);
    await writeFile(join(directory, "section.css"), `${sectionCss}\n`);
  }
  process.stdout.write(`${templateIds.length} templates, ${result.entries.length} sections\n`);
} finally {
  await browser.close();
}
