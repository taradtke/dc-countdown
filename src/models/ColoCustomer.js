const BaseModel = require('./BaseModel');
const customerMatcher = require('../../utils/customerMatcher');

class ColoCustomer extends BaseModel {
  constructor() {
    super('colo_customers', {
      customer_name: 'string',
      rack_location: 'string',
      new_cabinet_number: 'string',
      equipment_count: 'integer',
      power_usage: 'number',
      assigned_engineer: 'string',
      migration_scheduled: 'boolean',
      migration_date: 'date',
      migration_completed: 'boolean',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.findAll({ migration_completed: 1 });
  }

  async getPending() {
    return this.query(`
      SELECT * FROM colo_customers 
      WHERE migration_completed != 1 OR migration_completed IS NULL
      ORDER BY migration_date, customer_name
    `);
  }

  async importFromCSV(data) {
    // First, ensure Unknown customer exists
    await customerMatcher.ensureUnknownCustomer(this.db);
    
    // Extract all customer names for batch processing
    const customerNames = data.map(row => row['Customer Name'] || row.customer_name || '');
    
    // Process all customer names and get mapping
    console.log('Processing customer names for colo customers import...');
    const customerMap = await customerMatcher.processBatch(customerNames, this.db);
    
    // Map the data with matched/created customer IDs
    const mappedData = data.map(row => {
      const customerName = row['Customer Name'] || row.customer_name || '';
      const customerId = customerMap[customerName];
      
      return {
        customer_name: customerName, // Keep the original name
        customer_id: customerId, // Add the matched/created ID
        rack_location: row['Rack Location'] || row.rack_location,
        new_cabinet_number: row['New Cabinet Number'] || row.new_cabinet_number,
        equipment_count: parseInt(row['Equipment Count'] || row.equipment_count) || 0,
        power_usage: parseFloat(row['Power Usage'] || row.power_usage) || 0,
        assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer || null,
        notes: row['Notes'] || row.notes || null
      };
    });

    console.log(`Importing ${mappedData.length} colo customers with matched customers`);
    return this.bulkCreate(mappedData);
  }
}

module.exports = ColoCustomer;
