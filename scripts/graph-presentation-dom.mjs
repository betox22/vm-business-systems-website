// Runs inside Chromium on the actual renderer output, including hidden branches.
export function collectPresentation(input) {
  const { root, covered = false, typed = false } = input?.root ? input : { root: input };
  const entries = [];
  const violations = [];
  const textualAttributes = new Set([
    'alt', 'title', 'placeholder', 'aria-label', 'aria-description',
    'aria-valuetext', 'aria-roledescription', 'label', 'summary', 'abbr',
  ]);
  const normalize = (text) => String(text).replace(/\s+/gu, ' ').trim();
  function bindingFor(element, attribute = '') {
    if (!typed || attribute) return null;
    if (element.matches('.contact-list > p > span')) {
      return `contact:${element.parentElement.querySelector('strong')?.textContent}`;
    }
    const product = element.closest('.mega-retail-product[data-graph-product]');
    if (product && element.matches('.mega-retail-product > div:last-child > strong')) return `product:${product.dataset.graphProduct}:price`;
    if (product && element.matches('.graph-product-stock')) return `product:${product.dataset.graphProduct}:stock`;
    const line = element.closest('.kreaton-cart-line[data-cart-line]');
    if (line && element.matches('.kreaton-cart-line-copy > span')) return `product:${line.dataset.cartLine}:price`;
    return null;
  }
  function entry(path, kind, segments) {
    const text = normalize(segments.map(s => s.text).join(kind === 'subtree_spaced' ? ' ' : ''));
    if (text) entries.push({ path, kind, text, segments });
  }
  function walk(element, path) {
    if (!covered && element.matches('[data-open-lead], [data-cart-open], [data-cart-add], [data-account-open]')) {
      violations.push({ path, reason: 'uncovered_interaction_state' });
    }
    if (['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK', 'BASE', 'META'].includes(element.tagName)) {
      violations.push({ path, reason: 'active_or_untracked_content' });
    }
    for (const attribute of element.attributes) {
      const knownImageHandler = covered && element.tagName === 'IMG' && attribute.name === 'onerror' &&
        attribute.value === "this.closest('.image-shell').classList.add('image-failed')";
      if ((!knownImageHandler && /^on/i.test(attribute.name)) || attribute.name === 'srcdoc' || /^(?:javascript|vbscript):/i.test(attribute.value.trim())) {
        violations.push({ path, reason: 'active_attribute' });
      }
      if (textualAttributes.has(attribute.name) ||
          (attribute.name === 'value' && ['INPUT', 'BUTTON', 'OPTION', 'PROGRESS', 'METER'].includes(element.tagName))) {
        const text = normalize(attribute.value);
        if (text) entry(`${path}@${attribute.name}`, 'attribute', [{ text }]);
      }
    }
    const pseudoText = {};
    for (const pseudo of ['::before', '::after', '::marker']) {
      const content = getComputedStyle(element, pseudo).content;
      if (content && !['none', 'normal', '""', "''"].includes(content)) {
        if (/^(?:url|counter|counters)\(/.test(content)) violations.push({ path, reason: 'unresolved_css_content' });
        else {
          pseudoText[pseudo] = normalize(content.replace(/^"|"$/g, ''));
          entry(`${path}${pseudo}`, 'css', [{ text: pseudoText[pseudo] }]);
        }
      }
    }
    const fragments = [{ text: pseudoText['::marker'] || '' }, { text: pseudoText['::before'] || '' }];
    [...element.childNodes].forEach((node, index) => {
      const childPath = `${path}/${node.nodeName.toLowerCase()}[${index}]`;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = normalize(node.textContent);
        const segment = { text: node.textContent, binding: bindingFor(element) };
        if (text) entry(childPath, 'text', [segment]);
        fragments.push(segment);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        fragments.push(...walk(node, childPath));
      }
    });
    fragments.push({ text: pseudoText['::after'] || '' });
    // Both joins detect claims split across inline elements or generated CSS content.
    for (const joiner of ['', ' ']) {
      if (element.children.length || Object.keys(pseudoText).length) entry(path, joiner ? 'subtree_spaced' : 'subtree', fragments);
    }
    if (element.tagName === 'TEMPLATE' || element.shadowRoot) violations.push({ path, reason: 'untracked_subtree' });
    return fragments;
  }
  walk(root, '$');
  return { entries, violations };
}
