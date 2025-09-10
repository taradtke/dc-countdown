const DatabaseFactory = require('../database/DatabaseFactory');
const config = require('../config');

class BaseModel {
  constructor(tableName, fields = {}) {
    this.tableName = tableName;
    this.fields = fields;
    this.db = DatabaseFactory.getInstance();
    this.dbType = config.database.type;
  }

  // Core CRUD Operations

  async findAll(conditions = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map((key, index) => {
          params.push(conditions[key]);
          return this.dbType === 'postgres' ? `${key} = $${index + 1}` : `${key} = ?`;
        })
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    return this.db.all(query, params);
  }

  async findById(id) {
    const query = this.dbType === 'postgres' 
      ? `SELECT * FROM ${this.tableName} WHERE id = $1`
      : `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return this.db.get(query, [id]);
  }

  async findOne(conditions) {
    const results = await this.findAll(conditions, { limit: 1 });
    return results[0] || null;
  }

  async create(data) {
    const filteredData = this.filterFields(data);
    const fields = Object.keys(filteredData);
    const values = Object.values(filteredData);
    
    let query;
    if (this.dbType === 'postgres') {
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING id
      `;
      const result = await this.db.get(query, values);
      return { id: result.id, ...filteredData };
    } else {
      const placeholders = fields.map(() => '?').join(', ');
      query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `;
      await this.db.run(query, values);
      const result = await this.db.get('SELECT last_insert_rowid() as id');
      return { id: result.id, ...filteredData };
    }
  }

  async update(id, data) {
    const filteredData = this.filterFields(data);
    delete filteredData.id; // Remove id from update data
    
    const fields = Object.keys(filteredData);
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const values = [...Object.values(filteredData), id];
    let query;
    
    if (this.dbType === 'postgres') {
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
      `;
    } else {
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
    }

    await this.db.run(query, values);
    return this.findById(id);
  }

  async delete(id) {
    const query = this.dbType === 'postgres'
      ? `DELETE FROM ${this.tableName} WHERE id = $1`
      : `DELETE FROM ${this.tableName} WHERE id = ?`;
    
    const result = await this.db.run(query, [id]);
    
    if (this.dbType === 'postgres') {
      return result.changes > 0;
    } else {
      const changesResult = await this.db.get('SELECT changes() as changes');
      return changesResult.changes > 0;
    }
  }

  async bulkCreate(dataArray) {
    const results = [];
    const transaction = await this.db.beginTransaction();
    
    try {
      for (const data of dataArray) {
        const result = await this.create(data);
        results.push(result);
      }
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async bulkUpdate(updates) {
    const transaction = await this.db.beginTransaction();
    
    try {
      const results = [];
      for (const { id, data } of updates) {
        const result = await this.update(id, data);
        results.push(result);
      }
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Query Builders

  async count(conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map((key, index) => {
          params.push(conditions[key]);
          return this.dbType === 'postgres' ? `${key} = $${index + 1}` : `${key} = ?`;
        })
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await this.db.get(query, params);
    return result.count;
  }

  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  async search(searchTerm, searchFields = []) {
    if (!searchTerm || searchFields.length === 0) {
      return this.findAll();
    }

    const conditions = searchFields
      .map(field => `${field} LIKE ?`)
      .join(' OR ');
    
    const params = searchFields.map(() => `%${searchTerm}%`);
    
    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions}`;
    return this.db.all(query, params);
  }

  // Utility Methods

  filterFields(data) {
    if (!this.fields || Object.keys(this.fields).length === 0) {
      return data;
    }

    const filtered = {};
    Object.keys(this.fields).forEach(field => {
      if (data.hasOwnProperty(field)) {
        filtered[field] = data[field];
      }
    });
    return filtered;
  }

  validateRequired(data, requiredFields = []) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  async transaction(callback) {
    const transaction = await this.db.beginTransaction();
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Custom Query Support

  async query(sql, params = []) {
    return this.db.all(sql, params);
  }

  async queryOne(sql, params = []) {
    return this.db.get(sql, params);
  }

  async execute(sql, params = []) {
    return this.db.run(sql, params);
  }

  // Pagination Support

  async paginate(page = 1, perPage = 50, conditions = {}, options = {}) {
    const offset = (page - 1) * perPage;
    const items = await this.findAll(conditions, {
      ...options,
      limit: perPage,
      offset
    });
    
    const totalCount = await this.count(conditions);
    const totalPages = Math.ceil(totalCount / perPage);

    return {
      items,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Batch Operations

  async updateWhere(conditions, data) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
    `;

    const params = [...Object.values(data), ...Object.values(conditions)];
    return this.db.run(query, params);
  }

  async deleteWhere(conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const query = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    const params = Object.values(conditions);
    
    return this.db.run(query, params);
  }

  // Relationships

  async hasMany(relatedModel, foreignKey, localKey = 'id') {
    return async (parentId) => {
      return relatedModel.findAll({ [foreignKey]: parentId });
    };
  }

  async belongsTo(relatedModel, foreignKey, otherKey = 'id') {
    return async (childRecord) => {
      if (!childRecord[foreignKey]) return null;
      return relatedModel.findById(childRecord[foreignKey]);
    };
  }

  async manyToMany(relatedModel, pivotTable, localKey, foreignKey) {
    return async (parentId) => {
      const query = `
        SELECT r.* FROM ${relatedModel.tableName} r
        JOIN ${pivotTable} p ON p.${foreignKey} = r.id
        WHERE p.${localKey} = ?
      `;
      return this.db.all(query, [parentId]);
    };
  }
}

module.exports = BaseModel;