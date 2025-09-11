const BaseModel = require('./BaseModel');

class CarrierCircuit extends BaseModel {
  constructor() {
    super('carrier_circuits', {
      circuit_id: 'string',
      provider: 'string',
      type: 'string',
      bandwidth: 'string',
      location_a: 'string',
      location_z: 'string',
      customer: 'string',
      service: 'string',
      backhaul_vendor: 'string',
      circuit_location: 'string',
      carrier_circuit_id: 'string',
      vlan: 'string',
      starmax_mgmt_ip: 'string',
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

module.exports = CarrierCircuit;
