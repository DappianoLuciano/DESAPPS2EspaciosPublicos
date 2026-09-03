export const EVENT_CATEGORIES = [
  'Cultura',
  'Música',
  'Arte',
  'Tecnología',
  'Ciencia',
  'Teatro',
  'Danza',
  'Literatura',
  'Cine',
  'Charlas',
  'Talleres',
  'Juegos',
  'Gastronomía',
  'Infancias',
] as const;

export const FEATURED_CATEGORIES = [
  {
    id: 'musica',
    label: 'Música',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80',
  },
  {
    id: 'arte',
    label: 'Arte',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80',
  },
  {
    id: 'tecnologia',
    label: 'Tecnología',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80',
  },
  {
    id: 'ciencia',
    label: 'Ciencia',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80',
  },
  {
    id: 'teatro',
    label: 'Teatro',
    image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&q=80',
  },
  {
    id: 'charlas',
    label: 'Charlas',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80',
  },
] as const;

export function getCategoryLabel(slug?: string): string {
  if (!slug) {
    return 'Eventos';
  }

  return FEATURED_CATEGORIES.find((category) => category.id === slug)?.label ||
    EVENT_CATEGORIES.find((category) => category.toLocaleLowerCase('es-AR') === slug.toLocaleLowerCase('es-AR')) ||
    'Eventos';
}
