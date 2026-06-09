export type TemplateCategory = "ecommerce" | "landing" | "services";

export type TemplateSection = {
  type: string;
  enabled?: boolean;
  fields: Record<string, any>;
};

export type CatalogModel = {
  catalogType: string;
  productCardStyle: string;
  collectionLayout: string;
  filters: string[];
  productDetailModel: string;
  upsellModel: string;
  customerFeeling: string;
};

export type TemplatePage = {
  name: string;
  purpose: string;
  usesSections?: string[];
  catalogType?: string;
  layout?: string;
  filters?: string[];
  upsell?: string;
};

export type ClientSelectionCard = {
  title: string;
  category: TemplateCategory;
  bestForLabel: string;
  difference: string;
  previewTags: string[];
};

export type SiteTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  bestFor: string[];
  visualDifference: string;
  catalogModel: CatalogModel;
  clientSelectionCard: ClientSelectionCard;
  pages: TemplatePage[];
  style: {
    tone: string;
    layoutDensity: string;
    imageStyle: string;
    defaultColors: {
      background: string;
      surface: string;
      primary: string;
      secondary: string;
      accent: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
  sections: TemplateSection[];
  aiPrompt: string;
};
