const BaseModel = require('./BaseModel');
const customerMatcher = require('../../utils/customerMatcher');

class VoiceSystem extends BaseModel {
  constructor() {
    super('voice_systems', {
      customer: 'string',
      vm_name: 'string',
      system_type: 'string',
      extension_count: 'integer',
      assigned_engineer: 'string',
      cutover_scheduled: 'boolean',
      cutover_date: 'date',
      cutover_completed: 'boolean',
      testing_status: 'string',
      notes: 'text',
      created_at: 'datetime',
      updated_at: 'datetime'
    });
  }

  async getCompleted() {
    return this.findAll({ cutover_completed: 1 });
  }

  async getPending() {
    return this.query(`
      SELECT * FROM voice_systems 
      WHERE cutover_completed != 1 OR cutover_completed IS NULL
      ORDER BY cutover_date, customer
    `);
  }

  async importFromCSV(data) {
    // First, ensure Unknown customer exists
    await customerMatcher.ensureUnknownCustomer(this.db);
    
    // Extract all customer names for batch processing
    const customerNames = data.map(row => row['Customer'] || row.customer || '');
    
    // Process all customer names and get mapping
    console.log('Processing customer names for voice systems import...');
    const customerMap = await customerMatcher.processBatch(customerNames, this.db);
    
    // Map the data with matched/created customer IDs
    const mappedData = data.map(row => {
      const customerName = row['Customer'] || row.customer || '';
      const customerId = customerMap[customerName];
      
      return {
        customer: customerName, // Keep the original name
        customer_id: customerId, // Add the matched/created ID
        vm_name: row['VM Name'] || row.vm_name,
        system_type: row['System Type'] || row.system_type,
        extension_count: parseInt(row['Extension Count'] || row.extension_count) || 0,
        assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer || null,
        notes: row['Notes'] || row.notes || null
      };
    });

    console.log(`Importing ${mappedData.length} voice systems with matched customers`);
    return this.bulkCreate(mappedData);
  }
}

module.exports = VoiceSystem;
