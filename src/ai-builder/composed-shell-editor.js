import { escapeAttribute, escapeHtml } from './utils.js';

function field(label, path, value) {
  return `<label>${escapeHtml(label)}<input type="text" data-section-path="${escapeAttribute(path)}" value="${escapeAttribute(value)}"></label>`;
}

export function renderComposedShellEditor(section, index, pageIndex) {
  if (section.type !== 'composed' || !['shared--header', 'shared--footer'].includes(section.section_id)) return '';
  const base = `pages.${pageIndex}.sections.${index}`;
  const copy = section.copy_bindings || {};
  const controls = section.control_bindings || {};
  const navigation = section.list_bindings?.navigation || [];
  const fields = [];
  if (section.section_id === 'shared--header') {
    fields.push(field('Navigation label', `${base}.copy_bindings.navigation_label`, copy.navigation_label || ''));
    for (const key of ['search', 'cart', 'account', 'departments', 'primary_action']) {
      if (controls[key]) fields.push(field(`${key.replace('_', ' ')} label`, `${base}.control_bindings.${key}.label`, controls[key].label || ''));
    }
    controls.departments?.items?.forEach((item, itemIndex) => {
      fields.push(field(`Department ${itemIndex + 1}`, `${base}.control_bindings.departments.items.${itemIndex}.label`, item.label || ''));
    });
  } else {
    fields.push(field('Footer text', `${base}.copy_bindings.footer_text`, copy.footer_text || ''));
    fields.push(field('Footer navigation label', `${base}.copy_bindings.footer_navigation_label`, copy.footer_navigation_label || ''));
    if (controls.newsletter) {
      for (const key of ['title', 'text', 'button_label']) {
        fields.push(field(`Newsletter ${key.replace('_', ' ')}`, `${base}.control_bindings.newsletter.${key}`, controls.newsletter[key] || ''));
      }
    }
    for (const key of ['help_links', 'social_links']) {
      controls[key]?.forEach((item, itemIndex) => {
        fields.push(field(`${key.replace('_', ' ')} ${itemIndex + 1}`, `${base}.control_bindings.${key}.${itemIndex}.label`, item.label || ''));
        if (key === 'social_links') fields.push(field(`Social URL ${itemIndex + 1}`, `${base}.control_bindings.social_links.${itemIndex}.url`, item.url || ''));
      });
    }
  }
  navigation.forEach((item, itemIndex) => {
    fields.push(field(`Navigation ${itemIndex + 1}`, `${base}.list_bindings.navigation.${itemIndex}.label`, item.label || ''));
  });
  return `<div class="editor-group" data-editor-section="${escapeAttribute(section.id || section.section_id)}"><h4>${escapeHtml(section.section_id === 'shared--header' ? 'Header' : 'Footer')}</h4><div class="control-grid">${fields.join('')}</div></div>`;
}
