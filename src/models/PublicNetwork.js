const BaseModel = require('./BaseModel');

class PublicNetwork extends BaseModel {
  constructor() {
    super('public_networks', {
      network_name: 'string',
      network: 'string',
      cidr: 'string',
      provider: 'string',
      gateway: 'string',
      dns_servers: 'text',
      customer: 'string',
      action: 'string',
      vlan: 'string',
      current_devices: 'text',
      current_interfaces: 'text',
      new_devices: 'text',
      new_interfaces: 'text',
      migrated: 'boolean',
      tested: 'boolean',
      assigned_engineer: 'string',
      engineer_completed_work: 'string',
      status: 'string',
      cutover_scheduled: 'boolean',
      cutover_scheduled_date: 'date',
      cutover_date: 'date',
      cutover_completed: 'boolean',
      cutover_completed_date: 'date',
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
