// Use relative URL to work with any protocol and domain
const API_URL = '/api';

const migrationItems = [
    { id: 'servers', quantity: 240, unit: 'server' },
    { id: 'vlans', quantity: 136, unit: 'VLAN' },
    { id: 'networks', quantity: 20, unit: 'network' },
    { id: 'firewalls', quantity: 2, unit: 'firewall cluster' },
    { id: 'customers', quantity: 6, unit: 'customer' },
    { id: 'nnis', quantity: 2, unit: 'NNI' },
    { id: 'circuits', quantity: 10, unit: 'circuit' },
    { id: 'nutanix', quantity: 5, unit: 'node' },
    { id: 'voice', quantity: 75, unit: 'voice VM' }
];

async function loadStats() {
    try {
        const stats = await fetch(`${API_URL}/stats`).then(r => r.json());
        updateItemQuantities(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadLeaderboard() {
    try {
        const leaderboard = await fetch(`${API_URL}/leaderboard`).then(r => r.json());
        displayLeaderboard(leaderboard);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard-content');
    if (!container) return;
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<p>No completion data available yet.</p>';
        container.classList.remove('loading');
        return;
    }
    
    // Show top 5 engineers
    const topEngineers = leaderboard.slice(0, 5);
    
    let html = '<div class="leaderboard-list">';
    topEngineers.forEach((engineer, index) => {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
        
        html += `
            <div class="leaderboard-item">
                <span class="position">${position}${medal}</span>
                <span class="engineer-name">${engineer.name}</span>
                <span class="completed-count">${engineer.completedCount} completed</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
    container.classList.remove('loading');
}

function updateItemQuantities(stats) {
    if (stats.servers) {
        migrationItems[0].quantity = stats.servers.remaining;
        const serversCard = document.querySelector('[data-unit="Servers"]');
        if (serversCard) {
            serversCard.dataset.quantity = stats.servers.remaining;
            serversCard.querySelector('.quantity').textContent = `${stats.servers.remaining} remaining`;
        }
    }
    
    if (stats.vlans) {
        migrationItems[1].quantity = stats.vlans.remaining;
        const vlansCard = document.querySelector('[data-unit="VLANs"]');
        if (vlansCard) {
            vlansCard.dataset.quantity = stats.vlans.remaining;
            vlansCard.querySelector('.quantity').textContent = `${stats.vlans.remaining} remaining`;
        }
    }
    
    if (stats.networks) {
        migrationItems[2].quantity = stats.networks.remaining;
        const networksCard = document.querySelector('[data-unit="Public ISP Networks"]');
        if (networksCard) {
            networksCard.dataset.quantity = stats.networks.remaining;
            networksCard.querySelector('.quantity').textContent = `${stats.networks.remaining} remaining`;
        }
    }
    
    if (stats.voiceSystems) {
        migrationItems[8].quantity = stats.voiceSystems.remaining;
        const voiceCard = document.querySelector('[data-unit="Voice System VMs"]');
        if (voiceCard) {
            voiceCard.dataset.quantity = stats.voiceSystems.remaining;
            voiceCard.querySelector('.quantity').textContent = `${stats.voiceSystems.remaining} remaining`;
        }
    }
    
    if (stats.coloCustomers) {
        migrationItems[4].quantity = stats.coloCustomers.remaining;
        const coloCard = document.querySelector('[data-unit="Colo/Shared Customers"]');
        if (coloCard) {
            coloCard.dataset.quantity = stats.coloCustomers.remaining;
            coloCard.querySelector('.quantity').textContent = `${stats.coloCustomers.remaining} remaining`;
        }
    }
    
    if (stats.carrierCircuits) {
        migrationItems[6].quantity = stats.carrierCircuits.remaining;
        const circuitsCard = document.querySelector('[data-unit="Carrier P2P Circuits"]');
        if (circuitsCard) {
            circuitsCard.dataset.quantity = stats.carrierCircuits.remaining;
            circuitsCard.querySelector('.quantity').textContent = `${stats.carrierCircuits.remaining} remaining`;
        }
    }
    
    if (stats.carrierNnis) {
        migrationItems[5].quantity = stats.carrierNnis.remaining;
        const nnisCard = document.querySelector('[data-unit="Carrier NNIs"]');
        if (nnisCard) {
            nnisCard.dataset.quantity = stats.carrierNnis.remaining;
            nnisCard.querySelector('.quantity').textContent = `${stats.carrierNnis.remaining} remaining`;
        }
    }
    
    // Update progress bars and links
    updateProgressBars(stats);
}

function updateProgressBars(stats) {
    // Add progress bars to each item card
    const addProgressBar = (selector, completed, total) => {
        const card = document.querySelector(selector);
        if (card && total > 0) {
            const percentage = Math.round((completed / total) * 100);
            
            // Check if progress bar already exists
            let progressContainer = card.querySelector('.progress-container');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                progressContainer.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text"></span>
                `;
                card.querySelector('.item-stats').appendChild(progressContainer);
            }
            
            // Update progress
            const progressFill = progressContainer.querySelector('.progress-fill');
            const progressText = progressContainer.querySelector('.progress-text');
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${completed}/${total} (${percentage}%)`;
        }
    };
    
    // Add tracking links to each item card
    const addTrackingLink = (selector, tabName) => {
        const card = document.querySelector(selector);
        if (card && !card.querySelector('.tracking-link')) {
            const link = document.createElement('a');
            link.href = `tracking.html#${tabName}`;
            link.className = 'tracking-link';
            link.textContent = 'View Details →';
            link.onclick = function(e) {
                e.preventDefault();
                window.location.href = `tracking.html#${tabName}`;
            };
            card.querySelector('.item-stats').appendChild(link);
        }
    };
    
    // Update progress bars for each item type
    if (stats.servers) {
        addProgressBar('[data-unit="Servers"]', stats.servers.completed, stats.servers.total);
        addTrackingLink('[data-unit="Servers"]', 'servers');
    }
    
    if (stats.vlans) {
        addProgressBar('[data-unit="VLANs"]', stats.vlans.completed, stats.vlans.total);
        addTrackingLink('[data-unit="VLANs"]', 'vlans');
    }
    
    if (stats.networks) {
        addProgressBar('[data-unit="Public ISP Networks"]', stats.networks.completed, stats.networks.total);
        addTrackingLink('[data-unit="Public ISP Networks"]', 'public-networks');
    }
    
    if (stats.voiceSystems) {
        addProgressBar('[data-unit="Voice System VMs"]', stats.voiceSystems.completed, stats.voiceSystems.total);
        addTrackingLink('[data-unit="Voice System VMs"]', 'voice');
    }
    
    if (stats.coloCustomers) {
        addProgressBar('[data-unit="Colo/Shared Customers"]', stats.coloCustomers.completed, stats.coloCustomers.total);
        addTrackingLink('[data-unit="Colo/Shared Customers"]', 'colo');
    }
    
    if (stats.carrierCircuits) {
        addProgressBar('[data-unit="Carrier P2P Circuits"]', stats.carrierCircuits.completed, stats.carrierCircuits.total);
        addTrackingLink('[data-unit="Carrier P2P Circuits"]', 'circuits');
    }
    
    if (stats.carrierNnis) {
        addProgressBar('[data-unit="Carrier NNIs"]', stats.carrierNnis.completed, stats.carrierNnis.total);
        addTrackingLink('[data-unit="Carrier NNIs"]', 'nnis');
    }
}

function formatTimeUnit(value, unit) {
    if (value === 1) return `1 ${unit}`;
    return `${value} ${unit}s`;
}

function calculateCompletionRate(quantity, daysRemaining, hoursRemaining, minutesRemaining) {
    const totalHours = (daysRemaining * 24) + hoursRemaining + (minutesRemaining / 60);
    const totalDays = totalHours / 24;
    
    if (totalDays <= 0) return 'Time expired!';
    
    const ratePerDay = quantity / totalDays;
    const ratePerHour = quantity / totalHours;
    const hoursPerItem = totalHours / quantity;
    const daysPerItem = totalDays / quantity;
    
    if (ratePerDay >= 10) {
        return `${ratePerDay.toFixed(1)} per day`;
    } else if (ratePerDay >= 1) {
        return `${ratePerDay.toFixed(2)} per day`;
    } else if (ratePerHour >= 1) {
        return `${ratePerHour.toFixed(2)} per hour`;
    } else if (hoursPerItem < 24) {
        return `1 every ${hoursPerItem.toFixed(1)} hours`;
    } else {
        return `1 every ${daysPerItem.toFixed(1)} days`;
    }
}

function updateCountdown() {
    const targetDate = new Date('2025-11-20T12:00:00-06:00');
    const now = new Date();
    const difference = targetDate - now;
    
    if (difference <= 0) {
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        
        migrationItems.forEach(item => {
            const rateElement = document.getElementById(`rate-${item.id}`);
            if (rateElement) {
                rateElement.textContent = 'Time expired!';
                rateElement.style.color = '#ef4444';
            }
        });
        return;
    }
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    
    migrationItems.forEach(item => {
        const rateElement = document.getElementById(`rate-${item.id}`);
        if (rateElement) {
            const rate = calculateCompletionRate(item.quantity, days, hours, minutes);
            rateElement.innerHTML = `<strong>Required rate:</strong> ${rate}`;
        }
    });
}

loadStats();
setInterval(loadStats, 30000);

loadLeaderboard();
setInterval(loadLeaderboard, 60000); // Update leaderboard every minute

updateCountdown();
setInterval(updateCountdown, 1000);

document.addEventListener('DOMContentLoaded', function() {
    const timeUnits = document.querySelectorAll('.time-unit');
    timeUnits.forEach((unit, index) => {
        unit.style.animationDelay = `${index * 0.1}s`;
        unit.style.animation = 'fadeInUp 0.8s ease forwards';
        unit.style.opacity = '0';
    });
    
    const itemCards = document.querySelectorAll('.item-card');
    itemCards.forEach((card, index) => {
        card.style.animationDelay = `${(index * 0.05) + 0.5}s`;
        card.style.animation = 'fadeInUp 0.6s ease forwards';
        card.style.opacity = '0';
    });
    
    const trackingLink = document.createElement('a');
    trackingLink.href = 'tracking.html';
    trackingLink.className = 'tracking-link';
    trackingLink.textContent = 'Open Tracking Dashboard';
    trackingLink.style.cssText = `
        display: inline-block;
        margin-top: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: 500;
        transition: transform 0.2s;
    `;
    trackingLink.onmouseover = function() { this.style.transform = 'scale(1.05)'; };
    trackingLink.onmouseout = function() { this.style.transform = 'scale(1)'; };
    
    const mainContainer = document.querySelector('.countdown-container');
    if (mainContainer) {
        mainContainer.appendChild(trackingLink);
    }
});

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);