import ApiError from './ApiError.js';
import { assertObjectId } from './query.js';

/**
 * Standard read/write behaviour shared by every module. Domain services extend
 * this and add the rules that make the module interesting.
 */
class BaseService {
  constructor(repository, label = 'Record') {
    this.repository = repository;
    this.label = label;
  }

  async list(query = {}, extraFilter = {}) {
    return this.repository.paginate(query, extraFilter);
  }

  async getById(id) {
    assertObjectId(id, `${this.label} id`);
    const item = await this.repository.findById(id);
    if (!item) throw ApiError.notFound(`${this.label} not found`);
    return item;
  }

  async create(data) {
    return this.repository.create(data);
  }

  async update(id, data) {
    await this.getById(id);
    return this.repository.update(id, data);
  }

  async remove(id) {
    await this.getById(id);
    await this.repository.delete(id);
    return { id };
  }
}

export default BaseService;
