export interface ProductCategoryOption {
  id: string;
  label: string;
}

/** Both labels and request values come directly from the catalog API. */
export function getProductCategoryOptions(categories: string[]): ProductCategoryOption[] {
  const unique = [...new Set(categories.filter((category) => typeof category === 'string' && category.trim()))];
  return [
    { id: '', label: 'Tout' },
    ...unique.sort((a, b) => a.localeCompare(b, 'fr')).map((category) => ({
      id: category,
      label: category,
    })),
  ];
}
