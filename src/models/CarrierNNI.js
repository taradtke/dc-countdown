const BaseModel = require('./BaseModel');

class CarrierNNI extends BaseModel {
  constructor() {
    super('carrier_nnis', {
      nni_id: 'string',
      provider: 'string',
      type: 'string',
      bandwidth: 'string',
      location: 'string',
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

module.exports = CarrierNNI;
