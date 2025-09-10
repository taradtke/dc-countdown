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

module.exports = CarrierCircuit;
