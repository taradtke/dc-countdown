const BaseModel = require('./BaseModel');

class CriticalItem extends BaseModel {
  constructor() {
    super('critical_items', {
      title: 'string',
      description: 'text',
      success_criteria: 'text',
      priority: 'string',
      status: 'string',
      assigned_engineer: 'string',
      deadline: 'date',
      completed_date: 'date',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getByPriority(priority) {
    return this.findAll({ priority }, { orderBy: 'deadline ASC' });
  }

  async getOverdue() {
    return this.query(`
      SELECT * FROM critical_items 
      WHERE status != 'completed' 
        AND deadline < date('now')
      ORDER BY priority DESC, deadline ASC
    `);
  }

  async markAsCompleted(id) {
    return this.update(id, {
      status: 'completed',
      completed_date: new Date().toISOString()
    });
  }
}

module.exports = CriticalItem;
