const BaseModel = require('./BaseModel');

class PublicNetwork extends BaseModel {
  constructor() {
    super('public_networks', {
      network_name: 'string',
      cidr: 'string',
      provider: 'string',
      gateway: 'string',
      assigned_engineer: 'string',
      cutover_scheduled: 'boolean',
      cutover_date: 'date',
      cutover_completed: 'boolean',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.findAll({ cutover_completed: 1 });
  }
}

module.exports = PublicNetwork;
