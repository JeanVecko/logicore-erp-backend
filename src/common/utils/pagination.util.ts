import { PaginatedResult } from '../interfaces/paginated-result.interface';

export function buildPaginatedResult<T>(items: T[], totalItems: number, page: number, limit: number): PaginatedResult<T> {
  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  };
}
