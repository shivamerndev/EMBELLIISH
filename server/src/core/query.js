import mongoose from 'mongoose';
import ApiError from './ApiError.js';

const RESERVED = new Set(['page', 'limit', 'sort', 'search', 'fields', 'populate']);

/**
 * Translates a request query string into a mongoose filter, restricted to fields
 * the module explicitly declared filterable. Anything else is ignored rather than
 * passed through, so callers cannot craft arbitrary queries against the collection.
 *
 * Supports `field=value`, `field=a,b` (in), and `field_gte` / `field_lte` suffixes.
 */
const buildFilter = (query = {}, { filterable = [], searchable = [] } = {}) => {
  const filter = {};
  const allowed = new Set(filterable);

  for (const [rawKey, rawValue] of Object.entries(query)) {
    if (RESERVED.has(rawKey) || rawValue === undefined || rawValue === '') continue;

    const rangeMatch = rawKey.match(/^(.*)_(gte|lte|gt|lt|ne)$/);
    const key = rangeMatch ? rangeMatch[1] : rawKey;
    if (!allowed.has(key)) continue;

    if (rangeMatch) {
      filter[key] = { ...(filter[key] || {}), [`$${rangeMatch[2]}`]: rawValue };
      continue;
    }

    if (typeof rawValue === 'string' && rawValue.includes(',')) {
      filter[key] = { $in: rawValue.split(',').map((v) => v.trim()).filter(Boolean) };
      continue;
    }

    if (rawValue === 'true' || rawValue === 'false') {
      filter[key] = rawValue === 'true';
      continue;
    }

    filter[key] = rawValue;
  }

  if (query.search && searchable.length) {
    const rx = new RegExp(escapeRegex(String(query.search)), 'i');
    filter.$or = searchable.map((field) => ({ [field]: rx }));
  }

  return filter;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPagination = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10);
  // 0 is a legitimate request for "everything" from dashboards; cap the rest.
  const limit = Number.isNaN(rawLimit) ? 25 : Math.min(Math.max(rawLimit, 0), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const buildSort = (query = {}, defaultSort = '-createdAt') => {
  const sort = query.sort || defaultSort;
  return sort.split(',').join(' ');
};

const assertObjectId = (id, label = 'id') => {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest(`Invalid ${label}: ${id}`);
  }
  return id;
};

export { buildFilter, buildPagination, buildSort, assertObjectId, escapeRegex };
