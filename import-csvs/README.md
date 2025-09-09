# CSV Import Templates

This directory contains template CSV files for importing data into the DC Migration Tracking System.

## Important Notes

1. **UTF-8 Encoding**: Save all CSV files in UTF-8 encoding
2. **Excel Warning**: If using Excel, it may add a BOM character - the system handles this automatically
3. **Pipe Separator for Multiple IPs**: Use ` | ` (space-pipe-space) to separate multiple IP addresses
4. **Empty Fields**: Leave fields blank if data is not available
5. **No Quotes Needed**: The system handles commas in data automatically

## File Templates

### servers-template.csv
- **Customer**: Company/customer name
- **VM Name**: Virtual machine name
- **Host**: Nutanix or VMWare
- **IP Addresses**: Single IP or multiple separated by ` | `
- **Cores**: Number of CPU cores (integer)
- **Memory Capacity**: RAM in GB (integer)
- **Storage Used (GiB)**: Used storage in GiB (decimal)
- **Storage Provisioned (GiB)**: Allocated storage in GiB (decimal)

### vlans-template.csv
- **VLAN ID**: Numeric VLAN identifier
- **Name**: VLAN name
- **Description**: VLAN description
- **Network**: Network in CIDR notation (e.g., 192.168.1.0/24)
- **Gateway**: Gateway IP address

### networks-template.csv
- **Network Name**: Descriptive name
- **Provider**: ISP or carrier name
- **Circuit ID**: Provider's circuit identifier
- **Bandwidth**: Connection speed (e.g., "1000 Mbps", "1 Gbps")

### voice-systems-template.csv
- **Customer**: Company/customer name
- **VM Name**: Voice system VM name
- **System Type**: PBX type (e.g., Asterisk, 3CX, FreePBX)
- **Extension Count**: Number of extensions (integer)
- **SIP Provider**: SIP trunk provider (Thinq, CenturyLink)
- **SIP Delivery Method**: SIP delivery method (Direct, Ingate01, Ingate02)

### colo-customers-template.csv
- **Customer Name**: Company name
- **Rack Location**: Current rack location
- **New Cabinet Number**: Target cabinet number
- **Equipment Count**: Number of devices (integer)
- **Power Usage**: Power consumption (e.g., "2.5 kW")

### carrier-circuits-template.csv
- **Circuit ID**: Circuit identifier
- **Provider**: Carrier name
- **Type**: Circuit type (MPLS, P2P, Internet, etc.)
- **Bandwidth**: Circuit speed
- **Location A**: A-side location
- **Location Z**: Z-side location

### public-networks-template.csv
- **Network Name**: Descriptive name
- **CIDR**: Network in CIDR notation
- **Provider**: ISP name
- **Gateway**: Gateway IP address

### carrier-nnis-template.csv
- **NNI ID**: NNI identifier
- **Provider**: Carrier name
- **Type**: Connection type (e.g., "10G Ethernet")
- **Bandwidth**: Connection speed
- **Location**: Physical location

## Import Process

1. Use the appropriate template for your data type
2. Fill in the data following the format shown
3. Save as CSV (UTF-8 encoding preferred)
4. Go to the Tracking Dashboard
5. Select the appropriate tab
6. Click "Import CSV"
7. Select your file and upload

## Troubleshooting

- **Import fails**: Check that column headers match exactly (case-sensitive)
- **Customer data missing**: Ensure no extra spaces or special characters
- **Numbers not importing**: Remove any currency symbols or units from numeric fields
- **Dates not working**: Use format: YYYY-MM-DD

## Data Validation

The system will:
- Convert numeric strings to numbers automatically
- Handle empty/missing values gracefully
- Strip BOM characters from Excel exports
- Process pipe-separated IP addresses correctly