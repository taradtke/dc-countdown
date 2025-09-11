const BaseModel = require('./BaseModel');

class CarrierNNI extends BaseModel {
  constructor() {
    super('carrier_nnis', {
      nni_id: 'string',
      provider: 'string',
      type: 'string',
      bandwidth: 'string',
      location: 'string',
      carrier_name: 'string',
      circuit_id: 'string',
      interface_type: 'string',
      vlan_range: 'string',
      ip_block: 'string',
      current_device: 'string',
      new_device: 'string',
      migration_status: 'string',
      tested: 'boolean',
      engineer_assigned: 'string',
      peer_as: 'integer',
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

module.exports = CarrierNNI;
