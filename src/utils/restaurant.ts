import { Restaurant } from '../types';

/**
 * A restaurant's categories, tolerating both shapes.
 *
 * Shops can now pick up to two categories, stored in `categories`. Documents
 * created before that hold a single `category` string, and those records are
 * still live in Firestore — so every read goes through here rather than
 * touching either field directly.
 */
export function restaurantCategories(restaurant?: Pick<Restaurant, 'categories' | 'category'>): string[] {
  if (!restaurant) return [];
  if (restaurant.categories?.length) return restaurant.categories;
  if (restaurant.category) return [restaurant.category];
  return [];
}

/** The category that drives a card's colour and icon. */
export function primaryCategory(
  restaurant?: Pick<Restaurant, 'categories' | 'category'>
): string | undefined {
  return restaurantCategories(restaurant)[0];
}

/** e.g. "한식 · 분식" for display. */
export function formatCategories(
  restaurant?: Pick<Restaurant, 'categories' | 'category'>
): string {
  return restaurantCategories(restaurant).join(' · ');
}
