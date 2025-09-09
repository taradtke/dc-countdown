// Use relative URL to work with any protocol and domain
const API_URL = '/api';
let currentTab = 'servers';
let currentEditItem = null;
let currentEditType = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    
    // Check for hash in URL and switch to that tab
    const hash = window.location.hash.substring(1);
    if (hash && document.querySelector(`[data-tab="${hash}"]`)) {
        switchTab(hash);
    } else {
        loadData();
    }
    
    setupEventListeners();
    
    // Handle hash changes
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (newHash && document.querySelector(`[data-tab="${newHash}"]`)) {
            switchTab(newHash);
        }
    });
});

// Helper function to create engineer dropdown
function createEngineerDropdown(currentValue, onchangeFunc) {
    let options = '<option value="">-- Select Engineer --</option>';
    ENGINEERS.forEach(eng => {
        const selected = currentValue === eng.id ? 'selected' : '';
        options += `<option value="${eng.id}" ${selected}>${eng.name}</option>`;
    });
    return `<select class="engineer-dropdown" onchange="${onchangeFunc}">${options}</select>`;
}

// Helper function to create dependency button with badge
function createDependencyButton(type, id, name, depCounts) {
    const depKey = `${type}_${id}`;
    const deps = depCounts[depKey] || { incoming: 0, outgoing: 0 };
    const totalDeps = deps.incoming + deps.outgoing;
    const depBadge = totalDeps > 0 ? `<span class="dep-badge" title="${deps.incoming} incoming, ${deps.outgoing} outgoing">${totalDeps}</span>` : '';
    
    return `<button class="btn btn-sm btn-secondary" onclick="showDependencies('${type}', ${id}, '${(name || '').replace(/'/g, "\\'")}')">
        🔗 ${depBadge}
    </button>`;
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    currentTab = tab;
    window.location.hash = tab;
    loadData();
}

function setupEventListeners() {
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('csv-upload').click();
    });
    
    document.getElementById('export-btn').addEventListener('click', handleExport);
    
    document.getElementById('csv-upload').addEventListener('change', handleFileUpload);
    document.getElementById('refresh-btn').addEventListener('click', loadData);
    document.getElementById('back-to-countdown').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('edit-form').addEventListener('submit', handleFormSubmit);
}

async function loadData() {
    try {
        const stats = await fetch(`${API_URL}/stats`).then(r => r.json());
        updateStats(stats);
        
        switch(currentTab) {
            case 'servers':
                await loadServers();
                break;
            case 'vlans':
                await loadVlans();
                break;
            case 'circuits':
                await loadCarrierCircuits();
                break;
            case 'nnis':
                await loadCarrierNnis();
                break;
            case 'public-networks':
                await loadPublicNetworks();
                break;
            case 'voice':
                await loadVoiceSystems();
                break;
            case 'colo':
                await loadColoCustomers();
                break;
            case 'customers':
                await loadCustomers();
                break;
            case 'critical':
                await loadCriticalItems();
                break;
            case 'leaderboard':
                await loadLeaderboard();
                break;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function updateStats(stats) {
    let total = 0, completed = 0, remaining = 0;
    
    switch(currentTab) {
        case 'servers':
            if (stats.servers) {
                total = stats.servers.total;
                completed = stats.servers.completed;
                remaining = stats.servers.remaining;
            }
            break;
        case 'vlans':
            if (stats.vlans) {
                total = stats.vlans.total;
                completed = stats.vlans.completed;
                remaining = stats.vlans.remaining;
            }
            break;
        case 'circuits':
            if (stats.carrierCircuits) {
                total = stats.carrierCircuits.total;
                completed = stats.carrierCircuits.completed;
                remaining = stats.carrierCircuits.remaining;
            }
            break;
        case 'public-networks':
            if (stats.publicNetworks) {
                total = stats.publicNetworks.total;
                completed = stats.publicNetworks.completed;
                remaining = stats.publicNetworks.remaining;
            }
            break;
        case 'voice':
            if (stats.voiceSystems) {
                total = stats.voiceSystems.total;
                completed = stats.voiceSystems.completed;
                remaining = stats.voiceSystems.remaining;
            }
            break;
        case 'colo':
            if (stats.coloCustomers) {
                total = stats.coloCustomers.total;
                completed = stats.coloCustomers.completed;
                remaining = stats.coloCustomers.remaining;
            }
            break;
    }
    
    document.getElementById('total-items').textContent = total;
    document.getElementById('completed-items').textContent = completed;
    document.getElementById('remaining-items').textContent = remaining;
    
    const progress = total > 0 ? (completed / total * 100).toFixed(1) : 0;
    document.getElementById('progress-percent').textContent = `${progress}%`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
}

async function loadServers() {
    const [servers, depCounts] = await Promise.all([
        fetch(`${API_URL}/servers`).then(r => r.json()),
        fetch(`${API_URL}/dependency-counts`).then(r => r.json())
    ]);
    
    const tbody = document.querySelector('#servers-table tbody');
    tbody.innerHTML = '';
    
    servers.forEach(server => {
        const row = document.createElement('tr');
        const isCompleted = server.customer_notified_successful_cutover;
        if (isCompleted) row.classList.add('completed-row');
        
        const depKey = `server_${server.id}`;
        const deps = depCounts[depKey] || { incoming: 0, outgoing: 0 };
        const totalDeps = deps.incoming + deps.outgoing;
        const depBadge = totalDeps > 0 ? `<span class="dep-badge" title="${deps.incoming} incoming, ${deps.outgoing} outgoing">${totalDeps}</span>` : '';
        
        row.innerHTML = `
            <td>${server.customer || ''}</td>
            <td>${server.vm_name || ''}</td>
            <td>${server.host || ''}</td>
            <td>${server.ip_addresses || ''}</td>
            <td class="checkbox-cell"><input type="checkbox" ${server.customer_contacted ? 'checked' : ''} onchange="updateServer(${server.id}, 'customer_contacted', this.checked)"></td>
            <td><input type="date" class="date-input" value="${server.test_move_date || ''}" onchange="updateServer(${server.id}, 'test_move_date', this.value)"></td>
            <td><input type="date" class="date-input" value="${server.move_date || ''}" onchange="updateServer(${server.id}, 'move_date', this.value)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${server.backups_verified_working_hycu ? 'checked' : ''} onchange="updateServer(${server.id}, 'backups_verified_working_hycu', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${server.backups_setup_verified_working_veeam ? 'checked' : ''} onchange="updateServer(${server.id}, 'backups_setup_verified_working_veeam', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${server.firewall_network_cutover ? 'checked' : ''} onchange="updateServer(${server.id}, 'firewall_network_cutover', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${server.customer_notified_successful_cutover ? 'checked' : ''} onchange="updateServer(${server.id}, 'customer_notified_successful_cutover', this.checked)"></td>
            <td>${createEngineerDropdown(server.engineer_completed_work, `updateServer(${server.id}, 'engineer_completed_work', this.value)`)}</td>
            <td>
                ${createDependencyButton('server', server.id, server.vm_name || server.customer, depCounts)}
                <button class="delete-btn" onclick="deleteItem(${server.id}, 'server', '${(server.vm_name || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadVlans() {
    const [vlans, depCounts] = await Promise.all([
        fetch(`${API_URL}/vlans`).then(r => r.json()),
        fetch(`${API_URL}/dependency-counts`).then(r => r.json())
    ]);
    
    const tbody = document.querySelector('#vlans-table tbody');
    tbody.innerHTML = '';
    
    vlans.forEach(vlan => {
        const row = document.createElement('tr');
        const isCompleted = vlan.migrated && vlan.verified;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td>${vlan.vlan_id || ''}</td>
            <td>${vlan.name || ''}</td>
            <td>${vlan.description || ''}</td>
            <td>${vlan.network || ''}</td>
            <td>${vlan.gateway || ''}</td>
            <td class="checkbox-cell"><input type="checkbox" ${vlan.migrated ? 'checked' : ''} onchange="updateVlan(${vlan.id}, 'migrated', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${vlan.verified ? 'checked' : ''} onchange="updateVlan(${vlan.id}, 'verified', this.checked)"></td>
            <td>${createEngineerDropdown(vlan.engineer_completed_work, `updateVlan(${vlan.id}, 'engineer_completed_work', this.value)`)}</td>
            <td>
                ${createDependencyButton('vlan', vlan.id, `VLAN ${vlan.vlan_id || vlan.name}`, depCounts)}
                <button class="delete-btn" onclick="deleteItem(${vlan.id}, 'vlan', 'VLAN ${vlan.vlan_id || vlan.name || ''}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadCarrierCircuits() {
    const [circuits, depCounts] = await Promise.all([
        fetch(`${API_URL}/carrier-circuits`).then(r => r.json()),
        fetch(`${API_URL}/dependency-counts`).then(r => r.json())
    ]);
    const tbody = document.querySelector('#circuits-table tbody');
    tbody.innerHTML = '';
    
    circuits.forEach(circuit => {
        const row = document.createElement('tr');
        const isCompleted = circuit.cutover_completed;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td>${circuit.customer || ''}</td>
            <td>${circuit.service || ''}</td>
            <td>${circuit.backhaul_vendor || ''}</td>
            <td>${circuit.circuit_location || ''}</td>
            <td title="${circuit.carrier_circuit_id || ''}">${(circuit.carrier_circuit_id || '').substring(0, 20)}${(circuit.carrier_circuit_id || '').length > 20 ? '...' : ''}</td>
            <td>${circuit.vlan || ''}</td>
            <td>${circuit.starmax_mgmt_ip || ''}</td>
            <td class="checkbox-cell"><input type="checkbox" ${circuit.migrated ? 'checked' : ''} onchange="updateCarrierCircuit(${circuit.id}, 'migrated', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${circuit.tested ? 'checked' : ''} onchange="updateCarrierCircuit(${circuit.id}, 'tested', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${circuit.cutover_completed ? 'checked' : ''} onchange="updateCarrierCircuit(${circuit.id}, 'cutover_completed', this.checked)"></td>
            <td>${createEngineerDropdown(circuit.engineer_completed_work, `updateCarrierCircuit(${circuit.id}, 'engineer_completed_work', this.value)`)}</td>
            <td>
                ${createDependencyButton('carrier_circuit', circuit.id, `${circuit.customer} - ${circuit.service}`, depCounts)}
                <button class="delete-btn" onclick="deleteItem(${circuit.id}, 'circuit', '${(circuit.customer || '').replace(/'/g, "\\'")} - ${(circuit.service || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadCarrierNnis() {
    const [nnis, depCounts] = await Promise.all([
        fetch(`${API_URL}/carrier-nnis`).then(r => r.json()),
        fetch(`${API_URL}/dependency-counts`).then(r => r.json())
    ]);
    
    const tbody = document.querySelector('#nnis-table tbody');
    tbody.innerHTML = '';
    
    nnis.forEach(nni => {
        const row = document.createElement('tr');
        const isCompleted = nni.cutover_completed;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td>${nni.carrier_name || ''}</td>
            <td title="${nni.circuit_id || ''}">${(nni.circuit_id || '').substring(0, 15)}${(nni.circuit_id || '').length > 15 ? '...' : ''}</td>
            <td>${nni.interface_type || ''}</td>
            <td>${nni.bandwidth || ''}</td>
            <td>${nni.location || ''}</td>
            <td>${nni.vlan_range || ''}</td>
            <td>${nni.ip_block || ''}</td>
            <td>${nni.current_device || ''}</td>
            <td><input type="text" class="form-control" value="${nni.new_device || ''}" onchange="updateCarrierNni(${nni.id}, 'new_device', this.value)" style="width: 100px;"></td>
            <td>
                <select class="form-control" onchange="updateCarrierNni(${nni.id}, 'migration_status', this.value)" style="width: 100px;">
                    <option value="pending" ${nni.migration_status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in_progress" ${nni.migration_status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${nni.migration_status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td class="checkbox-cell"><input type="checkbox" ${nni.tested ? 'checked' : ''} onchange="updateCarrierNni(${nni.id}, 'tested', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${nni.cutover_completed ? 'checked' : ''} onchange="updateCarrierNni(${nni.id}, 'cutover_completed', this.checked)"></td>
            <td>${createEngineerDropdown(nni.engineer_assigned, `updateCarrierNni(${nni.id}, 'engineer_assigned', this.value)`)}</td>
            <td>
                ${createDependencyButton('carrier_nni', nni.id, `${nni.carrier_name} - ${nni.circuit_id}`, depCounts)}
                <button class="delete-btn" onclick="deleteItem(${nni.id}, 'nni', '${(nni.carrier_name || '').replace(/'/g, "\\'")} - ${(nni.circuit_id || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateCarrierNni(id, field, value) {
    await updateItem('carrier-nnis', id, { [field]: value });
}

async function loadPublicNetworks() {
    const [networks, depCounts] = await Promise.all([
        fetch(`${API_URL}/public-networks`).then(r => r.json()),
        fetch(`${API_URL}/dependency-counts`).then(r => r.json())
    ]);
    const tbody = document.querySelector('#public-networks-table tbody');
    tbody.innerHTML = '';
    
    networks.forEach(network => {
        const row = document.createElement('tr');
        const isCompleted = network.cutover_completed;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td title="${network.network || ''}">${network.network || ''}</td>
            <td>${network.customer || ''}</td>
            <td>${network.action || ''}</td>
            <td><input type="text" class="engineer-input" value="${network.vlan || ''}" onchange="updatePublicNetwork(${network.id}, 'vlan', this.value)" placeholder="VLAN"></td>
            <td><input type="text" class="engineer-input" value="${network.current_devices || ''}" onchange="updatePublicNetwork(${network.id}, 'current_devices', this.value)" placeholder="Devices"></td>
            <td><input type="text" class="engineer-input" value="${network.current_interfaces || ''}" onchange="updatePublicNetwork(${network.id}, 'current_interfaces', this.value)" placeholder="Interfaces"></td>
            <td><input type="text" class="engineer-input" value="${network.new_devices || ''}" onchange="updatePublicNetwork(${network.id}, 'new_devices', this.value)" placeholder="New Devices"></td>
            <td><input type="text" class="engineer-input" value="${network.new_interfaces || ''}" onchange="updatePublicNetwork(${network.id}, 'new_interfaces', this.value)" placeholder="New Interfaces"></td>
            <td class="checkbox-cell"><input type="checkbox" ${network.migrated ? 'checked' : ''} onchange="updatePublicNetwork(${network.id}, 'migrated', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${network.tested ? 'checked' : ''} onchange="updatePublicNetwork(${network.id}, 'tested', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${network.cutover_completed ? 'checked' : ''} onchange="updatePublicNetwork(${network.id}, 'cutover_completed', this.checked)"></td>
            <td>${createEngineerDropdown(network.engineer_completed_work, `updatePublicNetwork(${network.id}, 'engineer_completed_work', this.value)`)}</td>
            <td><button class="btn btn-secondary" onclick="showDependencies('public_network', ${network.id}, '${(network.network || '').replace(/'/g, "\\'")}')">View</button></td>
            <td>
                <button class="delete-btn" onclick="deleteItem(${network.id}, 'public-network', '${(network.network || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadVoiceSystems() {
    const voiceSystems = await fetch(`${API_URL}/voice-systems`).then(r => r.json());
    const tbody = document.querySelector('#voice-table tbody');
    tbody.innerHTML = '';
    
    voiceSystems.forEach(system => {
        const row = document.createElement('tr');
        const isCompleted = system.cutover_completed;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td>${system.customer || ''}</td>
            <td>${system.vm_name || ''}</td>
            <td>${system.system_type || ''}</td>
            <td>${system.extension_count || ''}</td>
            <td class="checkbox-cell"><input type="checkbox" ${system.migrated ? 'checked' : ''} onchange="updateVoiceSystem(${system.id}, 'migrated', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${system.tested ? 'checked' : ''} onchange="updateVoiceSystem(${system.id}, 'tested', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${system.cutover_completed ? 'checked' : ''} onchange="updateVoiceSystem(${system.id}, 'cutover_completed', this.checked)"></td>
            <td>${createEngineerDropdown(system.engineer_completed_work, `updateVoiceSystem(${system.id}, 'engineer_completed_work', this.value)`)}</td>
            <td>
                <button class="delete-btn" onclick="deleteItem(${system.id}, 'voice', '${(system.vm_name || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadColoCustomers() {
    const coloCustomers = await fetch(`${API_URL}/colo-customers`).then(r => r.json());
    const tbody = document.querySelector('#colo-table tbody');
    tbody.innerHTML = '';
    
    coloCustomers.forEach(customer => {
        const row = document.createElement('tr');
        const isCompleted = customer.migration_completed;
        if (isCompleted) row.classList.add('completed-row');
        
        row.innerHTML = `
            <td>${customer.customer_name || ''}</td>
            <td>${customer.rack_location || ''}</td>
            <td><input type="text" class="engineer-input" value="${customer.new_cabinet_number || ''}" onchange="updateColoCustomer(${customer.id}, 'new_cabinet_number', this.value)" placeholder="Cabinet #"></td>
            <td>${customer.equipment_count || ''}</td>
            <td>${customer.power_usage || ''}</td>
            <td class="checkbox-cell"><input type="checkbox" ${customer.contacted ? 'checked' : ''} onchange="updateColoCustomer(${customer.id}, 'contacted', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${customer.migration_scheduled ? 'checked' : ''} onchange="updateColoCustomer(${customer.id}, 'migration_scheduled', this.checked)"></td>
            <td class="checkbox-cell"><input type="checkbox" ${customer.migration_completed ? 'checked' : ''} onchange="updateColoCustomer(${customer.id}, 'migration_completed', this.checked)"></td>
            <td>${createEngineerDropdown(customer.engineer_completed_work, `updateColoCustomer(${customer.id}, 'engineer_completed_work', this.value)`)}</td>
            <td>
                <button class="delete-btn" onclick="deleteItem(${customer.id}, 'colo', '${(customer.customer_name || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadCustomers() {
    const customers = await fetch(`${API_URL}/customers`).then(r => r.json());
    const tbody = document.querySelector('#customers-table tbody');
    tbody.innerHTML = '';
    
    for (const customer of customers) {
        // Fetch migration status for each customer
        const status = await fetch(`${API_URL}/customers/${customer.id}/status`).then(r => r.json());
        
        // Calculate total completed and total assets
        let totalAssets = 0;
        let totalCompleted = 0;
        
        Object.values(status).forEach(assetType => {
            totalAssets += assetType.total;
            totalCompleted += assetType.completed;
        });
        
        const progressPercentage = totalAssets > 0 ? Math.round((totalCompleted / totalAssets) * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <a href="#" onclick="viewCustomerDetails(${customer.id}, '${customer.customer_name}'); return false;">
                    ${customer.customer_name}
                </a>
            </td>
            <td>
                <span class="status-badge ${customer.contact_status || 'not_contacted'}">
                    ${customer.contact_status ? customer.contact_status.replace('_', ' ') : 'Not Contacted'}
                </span>
            </td>
            <td>${customer.primary_contact || '-'}</td>
            <td>${totalAssets}</td>
            <td>${status.servers.total || 0}</td>
            <td>${status.public_networks.total || 0}</td>
            <td>${status.carrier_circuits.total || 0}</td>
            <td>${status.colo_customers.total || 0}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <span>${totalCompleted}/${totalAssets} (${progressPercentage}%)</span>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewCustomerDetails(${customer.id}, '${customer.customer_name}')">View</button>
                <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id}, '${customer.customer_name}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No customers found. Click "Add Customer" to create one.</td></tr>';
    }
}

async function viewCustomerDetails(customerId, customerName) {
    // Create a modal to show customer details
    const assets = await fetch(`${API_URL}/customers/${customerId}/assets`).then(r => r.json());
    const status = await fetch(`${API_URL}/customers/${customerId}/status`).then(r => r.json());
    
    let assetsByType = {
        servers: [],
        public_networks: [],
        carrier_circuits: [],
        colo_customers: []
    };
    
    assets.forEach(asset => {
        if (assetsByType[asset.asset_type]) {
            assetsByType[asset.asset_type].push(asset);
        }
    });
    
    let modalContent = `
        <h3>Customer: ${customerName}</h3>
        <div class="customer-details">
    `;
    
    // Show servers
    if (assetsByType.servers.length > 0) {
        modalContent += `
            <h4>Servers (${status.servers.completed}/${status.servers.total} completed)</h4>
            <ul>
        `;
        assetsByType.servers.forEach(asset => {
            const completedClass = asset.completed ? 'completed' : 'pending';
            modalContent += `<li class="${completedClass}">${asset.asset_name} ${asset.completed ? '✅' : '⏳'}</li>`;
        });
        modalContent += '</ul>';
    }
    
    // Show networks
    if (assetsByType.public_networks.length > 0) {
        modalContent += `
            <h4>Public Networks (${status.public_networks.completed}/${status.public_networks.total} completed)</h4>
            <ul>
        `;
        assetsByType.public_networks.forEach(asset => {
            const completedClass = asset.completed ? 'completed' : 'pending';
            modalContent += `<li class="${completedClass}">${asset.asset_name} ${asset.completed ? '✅' : '⏳'}</li>`;
        });
        modalContent += '</ul>';
    }
    
    // Show circuits
    if (assetsByType.carrier_circuits.length > 0) {
        modalContent += `
            <h4>Carrier Circuits (${status.carrier_circuits.completed}/${status.carrier_circuits.total} completed)</h4>
            <ul>
        `;
        assetsByType.carrier_circuits.forEach(asset => {
            const completedClass = asset.completed ? 'completed' : 'pending';
            modalContent += `<li class="${completedClass}">${asset.asset_name} ${asset.completed ? '✅' : '⏳'}</li>`;
        });
        modalContent += '</ul>';
    }
    
    modalContent += `
        </div>
        <button class="btn btn-secondary" onclick="closeCustomerDetails()">Close</button>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            ${modalContent}
        </div>
    `;
    document.body.appendChild(modal);
}

function closeCustomerDetails() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

async function editCustomer(customerId) {
    const customer = await fetch(`${API_URL}/customers/${customerId}`).then(r => r.json());
    
    // Show edit form in modal
    const modal = document.getElementById('edit-modal');
    const formFields = document.getElementById('form-fields');
    
    formFields.innerHTML = `
        <div class="form-group">
            <label>Customer Name</label>
            <input type="text" id="edit-customer-name" value="${customer.customer_name}" />
        </div>
        <div class="form-group">
            <label>Primary Contact</label>
            <input type="text" id="edit-primary-contact" value="${customer.primary_contact || ''}" />
        </div>
        <div class="form-group">
            <label>Contact Email</label>
            <input type="email" id="edit-contact-email" value="${customer.contact_email || ''}" />
        </div>
        <div class="form-group">
            <label>Contact Phone</label>
            <input type="tel" id="edit-contact-phone" value="${customer.contact_phone || ''}" />
        </div>
        <div class="form-group">
            <label>Contact Status</label>
            <select id="edit-contact-status">
                <option value="not_contacted" ${customer.contact_status === 'not_contacted' ? 'selected' : ''}>Not Contacted</option>
                <option value="initial_contact" ${customer.contact_status === 'initial_contact' ? 'selected' : ''}>Initial Contact</option>
                <option value="scheduling" ${customer.contact_status === 'scheduling' ? 'selected' : ''}>Scheduling</option>
                <option value="scheduled" ${customer.contact_status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                <option value="completed" ${customer.contact_status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>
    `;
    
    currentEditItem = customer;
    currentEditType = 'customers';
    modal.style.display = 'block';
}

async function deleteCustomer(customerId, customerName) {
    if (confirm(`Are you sure you want to delete customer "${customerName}"? This will not delete their assets, but will unlink them.`)) {
        try {
            await fetch(`${API_URL}/customers/${customerId}`, { method: 'DELETE' });
            await loadCustomers();
        } catch (error) {
            alert('Failed to delete customer');
        }
    }
}

async function showAddCustomer() {
    const modal = document.getElementById('edit-modal');
    const formFields = document.getElementById('form-fields');
    
    formFields.innerHTML = `
        <div class="form-group">
            <label>Customer Name</label>
            <input type="text" id="new-customer-name" placeholder="Enter customer name" />
        </div>
        <div class="form-group">
            <label>Primary Contact</label>
            <input type="text" id="new-primary-contact" placeholder="Contact person name" />
        </div>
        <div class="form-group">
            <label>Contact Email</label>
            <input type="email" id="new-contact-email" placeholder="contact@example.com" />
        </div>
        <div class="form-group">
            <label>Contact Phone</label>
            <input type="tel" id="new-contact-phone" placeholder="123-456-7890" />
        </div>
        <div class="form-group">
            <label>Contact Status</label>
            <select id="new-contact-status">
                <option value="not_contacted">Not Contacted</option>
                <option value="initial_contact">Initial Contact</option>
                <option value="scheduling">Scheduling</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
            </select>
        </div>
    `;
    
    currentEditItem = null;
    currentEditType = 'new-customer';
    modal.style.display = 'block';
}

async function loadCriticalItems() {
    const criticalItems = await fetch(`${API_URL}/critical-items`).then(r => r.json());
    const tbody = document.querySelector('#critical-table tbody');
    tbody.innerHTML = '';
    
    criticalItems.forEach(item => {
        const row = document.createElement('tr');
        const isCompleted = item.status === 'completed';
        if (isCompleted) row.classList.add('completed-row');
        
        // Priority colors
        let priorityBadge = '';
        if (item.priority === 'high') {
            priorityBadge = '<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 4px;">HIGH</span>';
        } else if (item.priority === 'medium') {
            priorityBadge = '<span style="background: #ffc107; color: black; padding: 2px 8px; border-radius: 4px;">MEDIUM</span>';
        } else {
            priorityBadge = '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px;">LOW</span>';
        }
        
        // Status colors
        let statusBadge = '';
        if (item.status === 'completed') {
            statusBadge = '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px;">COMPLETED</span>';
        } else if (item.status === 'in_progress') {
            statusBadge = '<span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 4px;">IN PROGRESS</span>';
        } else {
            statusBadge = '<span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 4px;">PENDING</span>';
        }
        
        row.innerHTML = `
            <td>${priorityBadge}</td>
            <td><input type="text" class="form-control" value="${item.title || ''}" onchange="updateCriticalItem(${item.id}, 'title', this.value)" style="min-width: 150px;"></td>
            <td><textarea class="form-control" onchange="updateCriticalItem(${item.id}, 'description', this.value)" rows="2" style="min-width: 200px;">${item.description || ''}</textarea></td>
            <td><textarea class="form-control" onchange="updateCriticalItem(${item.id}, 'success_criteria', this.value)" rows="2" style="min-width: 200px;">${item.success_criteria || ''}</textarea></td>
            <td>
                <select class="form-control" onchange="updateCriticalItem(${item.id}, 'status', this.value)">
                    <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td>${createEngineerDropdown(item.assigned_engineer, `updateCriticalItem(${item.id}, 'assigned_engineer', this.value)`)}</td>
            <td>${item.date_assigned ? new Date(item.date_assigned).toLocaleDateString() : '-'}</td>
            <td>${item.date_completed ? new Date(item.date_completed).toLocaleDateString() : '-'}</td>
            <td><textarea class="form-control" onchange="updateCriticalItem(${item.id}, 'notes', this.value)" rows="1" style="min-width: 150px;">${item.notes || ''}</textarea></td>
            <td>
                <button class="delete-btn" onclick="deleteItem(${item.id}, 'critical', '${(item.title || '').replace(/'/g, "\\'")}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (criticalItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No critical items yet. Click "Add Critical Item" to create one.</td></tr>';
    }
}

async function updateCriticalItem(id, field, value) {
    await updateItem('critical-items', id, { [field]: value });
}

function showAddCriticalItem() {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.minWidth = '500px';
    
    dialog.innerHTML = `
        <h3>Add Critical Item</h3>
        <div style="display: flex; flex-direction: column; gap: 15px; margin: 20px 0;">
            <div>
                <label style="display: block; margin-bottom: 5px;">Title *</label>
                <input type="text" id="critical-title" class="form-control" placeholder="Brief title of the task" style="width: 100%;">
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">Description</label>
                <textarea id="critical-description" class="form-control" placeholder="Detailed description of what needs to be done" rows="3" style="width: 100%;"></textarea>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">Success Criteria</label>
                <textarea id="critical-success" class="form-control" placeholder="What defines completion? What are the acceptance criteria?" rows="3" style="width: 100%;"></textarea>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">Priority</label>
                <select id="critical-priority" class="form-control" style="width: 100%;">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">Assign To</label>
                <select id="critical-engineer" class="form-control" style="width: 100%;">
                    <option value="">-- Select Engineer --</option>
                    ${ENGINEERS.map(eng => `<option value="${eng.id}">${eng.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">Notes</label>
                <textarea id="critical-notes" class="form-control" placeholder="Any additional notes or context" rows="2" style="width: 100%;"></textarea>
            </div>
        </div>
        <div class="confirm-dialog-buttons">
            <button class="btn btn-secondary" onclick="closeAddCriticalDialog()">Cancel</button>
            <button class="btn btn-primary" onclick="addCriticalItem()">Add Item</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Focus on title input
    document.getElementById('critical-title').focus();
}

function closeAddCriticalDialog() {
    document.querySelector('.confirm-dialog-overlay')?.remove();
    document.querySelector('.confirm-dialog')?.remove();
}

async function addCriticalItem() {
    const title = document.getElementById('critical-title').value.trim();
    if (!title) {
        alert('Please enter a title');
        return;
    }
    
    const item = {
        title: title,
        description: document.getElementById('critical-description').value,
        success_criteria: document.getElementById('critical-success').value,
        priority: document.getElementById('critical-priority').value,
        assigned_engineer: document.getElementById('critical-engineer').value,
        notes: document.getElementById('critical-notes').value,
        status: 'pending'
    };
    
    try {
        const response = await fetch(`${API_URL}/critical-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        
        if (response.ok) {
            closeAddCriticalDialog();
            loadCriticalItems();
        } else {
            alert('Failed to add critical item');
        }
    } catch (error) {
        console.error('Error adding critical item:', error);
        alert('Failed to add critical item');
    }
}

async function loadLeaderboard() {
    const leaderboard = await fetch(`${API_URL}/leaderboard`).then(r => r.json());
    const stats = await fetch(`${API_URL}/stats`).then(r => r.json());
    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = '';
    
    // Get engineer names map
    const engineerNames = {};
    ENGINEERS.forEach(eng => {
        engineerNames[eng.id] = eng.name;
    });
    
    // Create charts
    createAssetCompletionChart(stats);
    createEngineerProgressChart(leaderboard, engineerNames);
    createCustomerContactChart(stats);
    createWorkDistributionChart(leaderboard, engineerNames);
    
    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');
        const completionRate = entry.total_assigned > 0 
            ? Math.round((entry.total_completed / entry.total_assigned) * 100) 
            : 0;
        
        // Add special styling for top 3
        if (index === 0) row.classList.add('gold-medal');
        else if (index === 1) row.classList.add('silver-medal');
        else if (index === 2) row.classList.add('bronze-medal');
        
        // Create breakdown details
        const breakdownItems = [];
        const typeNames = {
            'servers': 'Servers',
            'vlans': 'VLANs',
            'carrier_circuits': 'Circuits',
            'public_networks': 'Networks',
            'voice_systems': 'Voice',
            'colo_customers': 'Colo',
            'critical_items': 'Critical'
        };
        
        for (const [type, counts] of Object.entries(entry.by_type || {})) {
            breakdownItems.push(`${typeNames[type]}: ${counts.completed}/${counts.assigned}`);
        }
        
        const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        row.innerHTML = `
            <td>${medalEmoji} ${index + 1}</td>
            <td>${engineerNames[entry.engineer] || entry.engineer}</td>
            <td>${entry.total_assigned}</td>
            <td>${entry.total_planned}</td>
            <td>${entry.total_completed}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${completionRate}%"></div>
                    </div>
                    <span>${completionRate}%</span>
                </div>
            </td>
            <td title="${breakdownItems.join(', ')}">${breakdownItems.length > 0 ? breakdownItems.join(', ') : 'No assignments'}</td>
        `;
        tbody.appendChild(row);
    });
    
    // If no data, show empty message
    if (leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No engineer assignments yet. Start assigning tasks to see the leaderboard!</td></tr>';
    }
}

async function updateServer(id, field, value) {
    await updateItem('servers', id, { [field]: value });
}

async function updateVlan(id, field, value) {
    await updateItem('vlans', id, { [field]: value });
}

async function updateCarrierCircuit(id, field, value) {
    await updateItem('carrier-circuits', id, { [field]: value });
}

async function updatePublicNetwork(id, field, value) {
    await updateItem('public-networks', id, { [field]: value });
}

async function updateVoiceSystem(id, field, value) {
    await updateItem('voice-systems', id, { [field]: value });
}

async function updateColoCustomer(id, field, value) {
    await updateItem('colo-customers', id, { [field]: value });
}

async function updateItem(type, id, data) {
    try {
        await fetch(`${API_URL}/${type}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        loadData();
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item');
    }
}

async function handleExport() {
    let endpoint = '';
    let filename = '';
    
    switch(currentTab) {
        case 'servers': 
            endpoint = 'servers/export';
            filename = 'servers_export.csv';
            break;
        case 'vlans': 
            endpoint = 'vlans/export';
            filename = 'vlans_export.csv';
            break;
        case 'circuits': 
            endpoint = 'carrier-circuits/export';
            filename = 'carrier_circuits_export.csv';
            break;
        case 'nnis': 
            endpoint = 'carrier-nnis/export';
            filename = 'carrier_nnis_export.csv';
            break;
        case 'public-networks': 
            endpoint = 'public-networks/export';
            filename = 'public_networks_export.csv';
            break;
        case 'networks': 
            endpoint = 'networks/export';
            filename = 'networks_export.csv';
            break;
        case 'voice': 
            endpoint = 'voice-systems/export';
            filename = 'voice_systems_export.csv';
            break;
        case 'colo': 
            endpoint = 'colo-customers/export';
            filename = 'colo_customers_export.csv';
            break;
        default:
            alert('Export not available for this tab');
            return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${endpoint}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Failed to export data');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('csv', file);
    
    let endpoint = '';
    switch(currentTab) {
        case 'servers': endpoint = 'servers/import'; break;
        case 'vlans': endpoint = 'vlans/import'; break;
        case 'circuits': endpoint = 'carrier-circuits/import'; break;
        case 'nnis': endpoint = 'carrier-nnis/import'; break;
        case 'public-networks': endpoint = 'public-networks/import'; break;
        case 'voice': endpoint = 'voice-systems/import'; break;
        case 'colo': endpoint = 'colo-customers/import'; break;
        case 'critical': endpoint = 'critical-items/import'; break;
    }
    
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`Successfully imported ${result.count} items`);
            loadData();
        } else {
            alert('Failed to import CSV');
        }
    } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Failed to import CSV');
    }
    
    event.target.value = '';
}

function editItem(id, type) {
    currentEditItem = id;
    currentEditType = type;
    openModal();
}

function openModal() {
    document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
    currentEditItem = null;
    currentEditType = null;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (currentEditType === 'customers') {
        // Update existing customer
        const updatedData = {
            customer_name: document.getElementById('edit-customer-name').value,
            primary_contact: document.getElementById('edit-primary-contact').value,
            contact_email: document.getElementById('edit-contact-email').value,
            contact_phone: document.getElementById('edit-contact-phone').value,
            contact_status: document.getElementById('edit-contact-status').value
        };
        
        try {
            await fetch(`${API_URL}/customers/${currentEditItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            await loadCustomers();
        } catch (error) {
            alert('Failed to update customer');
        }
    } else if (currentEditType === 'new-customer') {
        // Create new customer
        const newCustomer = {
            customer_name: document.getElementById('new-customer-name').value,
            primary_contact: document.getElementById('new-primary-contact').value,
            contact_email: document.getElementById('new-contact-email').value,
            contact_phone: document.getElementById('new-contact-phone').value,
            contact_status: document.getElementById('new-contact-status').value
        };
        
        try {
            await fetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCustomer)
            });
            await loadCustomers();
        } catch (error) {
            alert('Failed to create customer');
        }
    }
    
    closeModal();
}

async function deleteItem(id, type, name) {
    showDeleteConfirmation(id, type, name);
}

function showDeleteConfirmation(id, type, name) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    const typeLabels = {
        'server': 'Server',
        'vlan': 'VLAN',
        'circuit': 'Carrier Circuit',
        'public-network': 'Public Network',
        'voice': 'Voice System',
        'colo': 'Colo Customer'
    };
    
    dialog.innerHTML = `
        <h4>Confirm Deletion</h4>
        <p>Are you sure you want to delete this ${typeLabels[type] || 'item'}?</p>
        <p><strong>${name || 'This item'}</strong></p>
        <p style="color: #666; font-size: 0.9em;">This action cannot be undone.</p>
        <div class="confirm-dialog-buttons">
            <button class="btn btn-secondary" onclick="cancelDelete()">Cancel</button>
            <button class="btn btn-primary" style="background: #dc3545;" onclick="confirmDelete('${id}', '${type}')">Delete</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

function cancelDelete() {
    document.querySelector('.confirm-dialog-overlay')?.remove();
    document.querySelector('.confirm-dialog')?.remove();
}

async function confirmDelete(id, type) {
    cancelDelete();
    
    let endpoint = '';
    switch(type) {
        case 'server': endpoint = 'servers'; break;
        case 'vlan': endpoint = 'vlans'; break;
        case 'circuit': endpoint = 'carrier-circuits'; break;
        case 'public-network': endpoint = 'public-networks'; break;
        case 'voice': endpoint = 'voice-systems'; break;
        case 'colo': endpoint = 'colo-customers'; break;
    }
    
    try {
        const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadData();
        } else {
            const error = await response.json();
            alert(`Failed to delete item: ${error.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
    }
}

window.updateServer = updateServer;
window.updateVlan = updateVlan;
window.updateCarrierCircuit = updateCarrierCircuit;
window.updateCarrierNni = updateCarrierNni;
window.updatePublicNetwork = updatePublicNetwork;
window.updateVoiceSystem = updateVoiceSystem;
window.updateColoCustomer = updateColoCustomer;
async function showDependencies(type, id, name) {
    const [dependencies, allItems] = await Promise.all([
        fetch(`${API_URL}/dependencies/${type}/${id}`).then(r => r.json()),
        fetch(`${API_URL}/all-items`).then(r => r.json())
    ]);
    
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.minWidth = '600px';
    dialog.style.maxWidth = '800px';
    
    // Create a map for quick lookup of item labels
    const itemMap = {};
    allItems.forEach(item => {
        const key = `${item.type}_${item.id}`;
        itemMap[key] = item.label;
    });
    
    let depList = '';
    if (dependencies.length === 0) {
        depList = '<p style="color: #666;">No dependencies configured</p>';
    } else {
        depList = '<ul style="max-height: 300px; overflow-y: auto;">';
        dependencies.forEach(dep => {
            const isSource = dep.source_type === type && dep.source_id == id;
            if (isSource) {
                const targetKey = dep.target_type.replace('_', '-') + 's_' + dep.target_id;
                const targetLabel = itemMap[targetKey] || `${dep.target_type} #${dep.target_id}`;
                depList += `
                    <li style="margin-bottom: 8px;">
                        <strong>Depends on:</strong> ${targetLabel}
                        ${dep.description ? `<br><span style="color: #666; font-size: 0.9em;">${dep.description}</span>` : ''}
                        <button onclick="removeDependency(${dep.id}, '${type}', ${id}, '${name.replace(/'/g, "\\'")}')" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8em;" class="btn btn-danger btn-sm">Remove</button>
                    </li>`;
            } else {
                const sourceKey = dep.source_type.replace('_', '-') + 's_' + dep.source_id;
                const sourceLabel = itemMap[sourceKey] || `${dep.source_type} #${dep.source_id}`;
                depList += `
                    <li style="margin-bottom: 8px;">
                        <strong>Required by:</strong> ${sourceLabel}
                        ${dep.description ? `<br><span style="color: #666; font-size: 0.9em;">${dep.description}</span>` : ''}
                    </li>`;
            }
        });
        depList += '</ul>';
    }
    
    // Filter out the current item from the list
    const currentTypeNormalized = type.replace('_', '-') + 's';
    const availableItems = allItems.filter(item => !(item.type === currentTypeNormalized && item.id == id));
    
    dialog.innerHTML = `
        <h4>Dependencies for ${name}</h4>
        ${depList}
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <h5>Add New Dependency</h5>
            <div style="display: flex; gap: 10px; flex-direction: column;">
                <div style="position: relative;">
                    <input type="text" 
                           id="dep-search" 
                           class="form-control" 
                           placeholder="Type to search for servers, VLANs, circuits, networks..."
                           autocomplete="off"
                           style="width: 100%; padding: 8px; padding-right: 30px;">
                    <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999;">🔍</span>
                </div>
                <div id="dep-search-results" style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; display: none; background: white;"></div>
                <div id="dep-selected" style="padding: 10px; background: #f0f0f0; border-radius: 4px; display: none;">
                    <strong>Selected:</strong> <span id="dep-selected-label"></span>
                    <button onclick="clearDependencySelection()" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8em;">Clear</button>
                </div>
                <input type="hidden" id="dep-target-type">
                <input type="hidden" id="dep-target-id">
                <textarea id="dep-description" 
                          class="form-control" 
                          placeholder="Description (optional)" 
                          rows="2"
                          style="width: 100%; padding: 8px; resize: vertical;"></textarea>
            </div>
        </div>
        <div class="confirm-dialog-buttons">
            <button class="btn btn-secondary" onclick="closeDependencyDialog()">Close</button>
            <button class="btn btn-primary" onclick="addDependency('${type}', ${id})" id="add-dep-btn" disabled>Add Dependency</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Set up search functionality
    setupDependencySearch(availableItems);
}

function setupDependencySearch(availableItems) {
    const searchInput = document.getElementById('dep-search');
    const searchResults = document.getElementById('dep-search-results');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const matches = availableItems.filter(item => 
            item.searchText.includes(query) || item.label.toLowerCase().includes(query)
        );
        
        if (matches.length === 0) {
            searchResults.innerHTML = '<div style="padding: 10px; color: #666;">No matches found</div>';
        } else {
            searchResults.innerHTML = matches.slice(0, 20).map(item => `
                <div class="dep-search-item" 
                     data-type="${item.type}" 
                     data-id="${item.id}"
                     style="padding: 8px; cursor: pointer; border-bottom: 1px solid #f0f0f0;"
                     onmouseover="this.style.background='#f0f0f0'"
                     onmouseout="this.style.background='white'"
                     onclick="selectDependencyItem('${item.type}', ${item.id}, '${item.label.replace(/'/g, "\\'")}')">
                    <strong style="color: #667eea;">${item.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>: ${item.label}
                </div>
            `).join('');
        }
        searchResults.style.display = 'block';
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Focus search input
    searchInput.focus();
}

function selectDependencyItem(type, id, label) {
    document.getElementById('dep-target-type').value = type.replace(/-/g, '_').replace(/s$/, '');
    document.getElementById('dep-target-id').value = id;
    document.getElementById('dep-selected-label').textContent = label;
    document.getElementById('dep-selected').style.display = 'block';
    document.getElementById('dep-search-results').style.display = 'none';
    document.getElementById('dep-search').value = '';
    document.getElementById('add-dep-btn').disabled = false;
}

function clearDependencySelection() {
    document.getElementById('dep-target-type').value = '';
    document.getElementById('dep-target-id').value = '';
    document.getElementById('dep-selected').style.display = 'none';
    document.getElementById('add-dep-btn').disabled = true;
}

function closeDependencyDialog() {
    document.querySelector('.confirm-dialog-overlay')?.remove();
    document.querySelector('.confirm-dialog')?.remove();
}

async function removeDependency(depId, sourceType, sourceId, sourceName) {
    if (!confirm('Are you sure you want to remove this dependency?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/dependencies/${depId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            closeDependencyDialog();
            // Reopen the dialog with updated dependencies
            showDependencies(sourceType, sourceId, sourceName);
        } else {
            alert('Failed to remove dependency');
        }
    } catch (error) {
        console.error('Error removing dependency:', error);
        alert('Failed to remove dependency');
    }
}

async function addDependency(sourceType, sourceId) {
    const targetType = document.getElementById('dep-target-type').value;
    const targetId = document.getElementById('dep-target-id').value;
    const description = document.getElementById('dep-description').value;
    
    if (!targetId) {
        alert('Please select a target item from the search');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceType,
                sourceId,
                targetType,
                targetId,
                dependencyType: 'depends_on',
                description
            })
        });
        
        if (response.ok) {
            closeDependencyDialog();
            alert('Dependency added successfully');
        } else {
            alert('Failed to add dependency');
        }
    } catch (error) {
        console.error('Error adding dependency:', error);
        alert('Failed to add dependency');
    }
}

window.updateServer = updateServer;
window.updateVlan = updateVlan;
window.updateCarrierCircuit = updateCarrierCircuit;
window.updateCarrierNni = updateCarrierNni;
window.updatePublicNetwork = updatePublicNetwork;
window.updateVoiceSystem = updateVoiceSystem;
window.updateColoCustomer = updateColoCustomer;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.cancelDelete = cancelDelete;
window.confirmDelete = confirmDelete;
window.showDependencies = showDependencies;
window.closeDependencyDialog = closeDependencyDialog;
window.addDependency = addDependency;
window.selectDependencyItem = selectDependencyItem;
window.clearDependencySelection = clearDependencySelection;
window.removeDependency = removeDependency;
window.updateCriticalItem = updateCriticalItem;
window.showAddCriticalItem = showAddCriticalItem;
window.closeAddCriticalDialog = closeAddCriticalDialog;
window.addCriticalItem = addCriticalItem;
window.viewCustomerDetails = viewCustomerDetails;
window.closeCustomerDetails = closeCustomerDetails;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.showAddCustomer = showAddCustomer;

// Chart creation functions
let chartInstances = {};

function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

function createAssetCompletionChart(stats) {
    const ctx = document.getElementById('assetCompletionChart');
    if (!ctx) return;
    
    destroyChart('assetCompletionChart');
    
    const assetTypes = [];
    const completed = [];
    const remaining = [];
    
    const assetData = [
        { name: 'Servers', data: stats.servers },
        { name: 'VLANs', data: stats.vlans },
        { name: 'Public Networks', data: stats.networks },
        { name: 'Voice Systems', data: stats.voiceSystems },
        { name: 'Colo Customers', data: stats.coloCustomers },
        { name: 'Carrier Circuits', data: stats.carrierCircuits },
        { name: 'Carrier NNIs', data: stats.carrierNnis }
    ];
    
    assetData.forEach(asset => {
        if (asset.data) {
            assetTypes.push(asset.name);
            completed.push(asset.data.completed || 0);
            remaining.push(asset.data.remaining || 0);
        }
    });
    
    chartInstances['assetCompletionChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: assetTypes,
            datasets: [{
                label: 'Completed',
                data: completed,
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 1
            }, {
                label: 'Remaining',
                data: remaining,
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const total = completed[context.dataIndex] + remaining[context.dataIndex];
                            const percentage = Math.round((completed[context.dataIndex] / total) * 100);
                            return `${percentage}% Complete`;
                        }
                    }
                }
            }
        }
    });
}

function createEngineerProgressChart(leaderboard, engineerNames) {
    const ctx = document.getElementById('engineerProgressChart');
    if (!ctx) return;
    
    destroyChart('engineerProgressChart');
    
    const engineers = [];
    const assignedData = [];
    const completedData = [];
    const plannedData = [];
    
    leaderboard.slice(0, 7).forEach(entry => {
        engineers.push(engineerNames[entry.engineer] || entry.engineer);
        assignedData.push(entry.total_assigned);
        completedData.push(entry.total_completed);
        plannedData.push(entry.total_planned);
    });
    
    chartInstances['engineerProgressChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: engineers,
            datasets: [{
                label: 'Completed',
                data: completedData,
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 1
            }, {
                label: 'Planned/In Progress',
                data: plannedData,
                backgroundColor: '#fbbf24',
                borderColor: '#f59e0b',
                borderWidth: 1
            }, {
                label: 'Assigned (Total)',
                data: assignedData,
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const engineer = leaderboard[context.dataIndex];
                            if (engineer && engineer.total_assigned > 0) {
                                const rate = Math.round((engineer.total_completed / engineer.total_assigned) * 100);
                                return `Completion Rate: ${rate}%`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

function createCustomerContactChart(stats) {
    const ctx = document.getElementById('customerContactChart');
    if (!ctx) return;
    
    destroyChart('customerContactChart');
    
    // Calculate contact percentages from servers and colo customers
    let contacted = 0;
    let notContacted = 0;
    let inProgress = 0;
    
    // This is a simplified calculation - in reality you'd need to fetch customer-specific data
    if (stats.servers) {
        // Estimate based on completion status
        contacted = Math.round(stats.servers.completed * 0.8);
        inProgress = Math.round((stats.servers.total - stats.servers.completed) * 0.3);
        notContacted = stats.servers.total - contacted - inProgress;
    }
    
    chartInstances['customerContactChart'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Contacted & Scheduled', 'Contact In Progress', 'Not Yet Contacted'],
            datasets: [{
                data: [contacted, inProgress, notContacted],
                backgroundColor: ['#10b981', '#fbbf24', '#ef4444'],
                borderColor: ['#059669', '#f59e0b', '#dc2626'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = contacted + inProgress + notContacted;
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createWorkDistributionChart(leaderboard, engineerNames) {
    const ctx = document.getElementById('workDistributionChart');
    if (!ctx) return;
    
    destroyChart('workDistributionChart');
    
    const engineers = [];
    const workloads = [];
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];
    
    leaderboard.forEach(entry => {
        if (entry.total_assigned > 0) {
            engineers.push(engineerNames[entry.engineer] || entry.engineer);
            workloads.push(entry.total_assigned);
        }
    });
    
    chartInstances['workDistributionChart'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: engineers,
            datasets: [{
                data: workloads,
                backgroundColor: colors.slice(0, engineers.length),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = workloads.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} items (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}