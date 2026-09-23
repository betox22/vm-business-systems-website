export function withSharedShell(schema) {
  const result = structuredClone(schema);
  const home = result.pages.find((page) => page.page_key === 'home');
  const navigation = result.navigation.map(({ label, page_key }) => ({ label, page_key }));
  home.sections.push(
    {
      id: 'shared-header',
      type: 'composed',
      order: -1,
      section_id: 'shared--header',
      copy_bindings: {
        'business.name': result.business.name,
        home_page_key: 'home',
        navigation_label: 'Site navigation',
      },
      list_bindings: { navigation },
      image_bindings: {},
      control_bindings: {
        search: { label: 'Search products' },
        cart: { label: 'Cart' },
        account: { label: 'Account', action: 'modal' },
      },
    },
    {
      id: 'shared-footer',
      type: 'composed',
      order: 1000000,
      section_id: 'shared--footer',
      copy_bindings: {
        'business.name': result.business.name,
        home_page_key: 'home',
        footer_navigation_label: 'Site links',
        footer_text: result.global_components.footer_text,
      },
      list_bindings: { navigation },
      image_bindings: {},
    },
  );
  return result;
}
