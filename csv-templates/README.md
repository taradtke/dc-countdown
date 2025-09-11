# CSV Import Templates

This directory contains sample CSV templates for importing data into the DC Migration System. Each template includes all supported columns with example data.

## Usage

1. Download the appropriate template for your data type
2. Fill in your data following the format shown in the examples
3. Save as CSV (UTF-8 encoding recommended)
4. Import via the web interface under the respective tab

## Templates Available

### servers.csv
For importing server infrastructure data
- Boolean fields: Use `true`/`false`, `1`/`0`, or leave empty for false
- Dates: Use YYYY-MM-DD format

### vlans.csv
For importing VLAN configurations
- VLAN ID: Numeric value
- Boolean fields for migration status

### carrier-circuits.csv
For importing carrier circuit information
- Includes customer and service details
- Supports migration tracking fields

### carrier-nnis.csv
For importing carrier NNI (Network-to-Network Interface) data
- Includes VLAN ranges and IP blocks
- Migration status tracking

### public-networks.csv
For importing public network configurations
- Supports multiple DNS servers (semicolon-separated)
- Includes device and interface mapping

### voice-systems.csv
For importing voice/telephony systems
- Extension count as numeric value
- SIP provider and delivery method fields

### colo-customers.csv
For importing colocation customer data
- Power usage in kW
- Equipment count tracking

### networks.csv
For importing general network infrastructure
- Supports migration waves
- DNS server configuration

### critical-items.csv
For importing high-priority migration tasks
- Priority levels: high, medium, low
- Status tracking: pending, in_progress, completed

## Field Guidelines

### Boolean Fields
Accept any of the following:
- `true`, `false`
- `1`, `0`
- Empty field defaults to false

### Date Fields
- Format: YYYY-MM-DD
- Example: 2025-02-15

### Engineer Assignment
- Use full name as it appears in the system
- Leave empty if unassigned

### Notes Field
- Free text field
- Avoid using commas unless properly quoted
- Maximum recommended length: 500 characters

## Tips for Successful Import

1. **Column Headers**: Must match exactly (case-sensitive)
2. **Required Fields**: While most fields are optional, include key identifiers
3. **Encoding**: Save as UTF-8 to preserve special characters
4. **Validation**: The system will validate data types on import
5. **Duplicates**: The system will create new records; it does not update existing ones via CSV import

## Error Handling

If an import fails:
1. Check the error message for specific field issues
2. Verify column headers match the template
3. Ensure boolean and date fields use correct format
4. Check for unescaped special characters in text fields

## Support

For issues with CSV imports, check:
- File encoding (should be UTF-8)
- Column header spelling and capitalization
- Date format (YYYY-MM-DD)
- Boolean values (true/false or 1/0)