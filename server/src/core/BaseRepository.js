import { buildFilter, buildPagination, buildSort } from './query.js';

/**
 * Adds an `id` alongside `_id` on lean results.
 *
 * `.lean()` skips the schema's toJSON transform, so a list would answer with
 * `_id` while a single saved document answers with `id`. Normalising here means
 * the API has exactly one identifier shape, including on populated references.
 */
const withId = (value) => {
  if (Array.isArray(value)) return value.map(withId);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  // Leave ObjectIds and other BSON values alone.
  if (typeof value.toHexString === 'function') return value;

  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = withId(entry);
  }
  if (out._id !== undefined && out.id === undefined) out.id = String(out._id);
  return out;
};

/**
 * Thin data-access layer over a mongoose model. Services own business rules;
 * repositories only know how to read and write documents.
 */
class BaseRepository {
  constructor(model, { filterable = [], searchable = [], populate = [], defaultSort = '-createdAt' } = {}) {
    this.model = model;
    this.filterable = filterable;
    this.searchable = searchable;
    this.populate = populate;
    this.defaultSort = defaultSort;
  }

  /** Paginated list driven by a request query string. */
  async paginate(query = {}, extraFilter = {}) {
    const filter = { ...buildFilter(query, { filterable: this.filterable, searchable: this.searchable }), ...extraFilter };
    const { page, limit, skip } = buildPagination(query);
    const sort = buildSort(query, this.defaultSort);

    let cursor = this.model.find(filter).sort(sort).skip(skip);
    if (limit > 0) cursor = cursor.limit(limit);
    if (this.populate.length) cursor = cursor.populate(this.populate);

    const [items, total] = await Promise.all([cursor.lean(), this.model.countDocuments(filter)]);

    return {
      items: withId(items),
      pagination: {
        page,
        limit,
        total,
        pages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  }

  async find(filter = {}, { sort, populate, lean = true } = {}) {
    let cursor = this.model.find(filter).sort(sort || this.defaultSort);
    const pop = populate ?? this.populate;
    if (pop && pop.length) cursor = cursor.populate(pop);
    return lean ? withId(await cursor.lean()) : cursor;
  }

  async findById(id, { populate, lean = true } = {}) {
    let cursor = this.model.findById(id);
    const pop = populate ?? this.populate;
    if (pop && pop.length) cursor = cursor.populate(pop);
    return lean ? withId(await cursor.lean()) : cursor;
  }

  async findOne(filter, { populate, lean = true } = {}) {
    let cursor = this.model.findOne(filter);
    const pop = populate ?? this.populate;
    if (pop && pop.length) cursor = cursor.populate(pop);
    return lean ? withId(await cursor.lean()) : cursor;
  }

  async create(data) {
    const doc = await this.model.create(data);
    return doc.toJSON();
  }

  async insertMany(docs) {
    const created = await this.model.insertMany(docs);
    return created.map((d) => d.toJSON());
  }

  async update(id, data) {
    const updated = await this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate(this.populate)
      .lean();
    return withId(updated);
  }

  async delete(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async deleteMany(filter) {
    return this.model.deleteMany(filter);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter) {
    return Boolean(await this.model.exists(filter));
  }

  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }
}

export default BaseRepository;
