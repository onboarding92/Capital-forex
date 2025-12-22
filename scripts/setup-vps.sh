#!/bin/bash

###############################################################################
# BitChange Pro - VPS Environment Setup Script
# 
# This script sets up a fresh Ubuntu 22.04 VPS with all required dependencies:
# - Node.js 22.x
# - pnpm package manager
# - PM2 process manager
# - Nginx web server
# - Certbot for SSL certificates
# - MySQL client tools
# - System security hardening
# 
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-repo/bitchange-pro/main/scripts/setup-vps.sh | bash
#   or
#   ./scripts/setup-vps.sh
# 
# Prerequisites:
#   - Fresh Ubuntu 22.04 LTS VPS
#   - Root or sudo access
#   - Internet connection
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo privileges"
        exit 1
    fi
}

update_system() {
    log_info "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    log_success "System updated"
}

install_nodejs() {
    log_info "Installing Node.js 22.x..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 22 ]; then
            log_info "Node.js $NODE_VERSION is already installed"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    
    log_success "Node.js installed: $(node --version)"
}

install_pnpm() {
    log_info "Installing pnpm..."
    
    if command -v pnpm &> /dev/null; then
        log_info "pnpm is already installed: $(pnpm --version)"
        return
    fi
    
    npm install -g pnpm
    
    log_success "pnpm installed: $(pnpm --version)"
}

install_pm2() {
    log_info "Installing PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2 is already installed: $(pm2 --version)"
        return
    fi
    
    npm install -g pm2
    
    log_success "PM2 installed: $(pm2 --version)"
}

install_nginx() {
    log_info "Installing Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx is already installed: $(nginx -v 2>&1 | cut -d'/' -f2)"
        return
    fi
    
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    log_success "Nginx installed and started"
}

install_certbot() {
    log_info "Installing Certbot..."
    
    if command -v certbot &> /dev/null; then
        log_info "Certbot is already installed"
        return
    fi
    
    sudo apt install -y certbot python3-certbot-nginx
    
    log_success "Certbot installed"
}

install_mysql_client() {
    log_info "Installing MySQL client tools..."
    
    if command -v mysql &> /dev/null; then
        log_info "MySQL client is already installed"
        return
    fi
    
    sudo apt install -y mysql-client
    
    log_success "MySQL client installed"
}

install_utilities() {
    log_info "Installing system utilities..."
    
    sudo apt install -y \
        curl \
        wget \
        git \
        unzip \
        htop \
        net-tools \
        ufw \
        fail2ban \
        logrotate
    
    log_success "Utilities installed"
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    if sudo ufw status | grep -q "Status: active"; then
        log_info "Firewall is already active"
        return
    fi
    
    # Allow SSH
    sudo ufw allow OpenSSH
    
    # Allow HTTP and HTTPS
    sudo ufw allow 'Nginx Full'
    
    # Enable firewall
    sudo ufw --force enable
    
    log_success "Firewall configured"
}

setup_fail2ban() {
    log_info "Configuring Fail2ban..."
    
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    # Create jail.local if it doesn't exist
    if [ ! -f /etc/fail2ban/jail.local ]; then
        sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
EOF
        
        sudo systemctl restart fail2ban
    fi
    
    log_success "Fail2ban configured"
}

setup_swap() {
    log_info "Setting up swap space..."
    
    if swapon --show | grep -q "/swapfile"; then
        log_info "Swap is already configured"
        return
    fi
    
    # Create 2GB swap file
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Make swap permanent
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    
    # Configure swappiness
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    
    log_success "Swap configured (2GB)"
}

setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/bitchange-pro > /dev/null <<EOF
/var/log/bitchange-pro/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

optimize_system() {
    log_info "Optimizing system settings..."
    
    # Increase file descriptors limit
    if ! grep -q "ubuntu.*nofile" /etc/security/limits.conf; then
        sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
ubuntu soft nofile 65536
ubuntu hard nofile 65536
EOF
    fi
    
    # Optimize network settings
    sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Network optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
EOF
    
    sudo sysctl -p
    
    log_success "System optimized"
}

create_project_structure() {
    log_info "Creating project structure..."
    
    sudo mkdir -p /var/www/bitchange-pro
    sudo mkdir -p /var/log/bitchange-pro
    sudo mkdir -p /var/backups/bitchange-pro
    
    sudo chown -R $USER:$USER /var/www/bitchange-pro
    sudo chown -R $USER:$USER /var/log/bitchange-pro
    sudo chown -R $USER:$USER /var/backups/bitchange-pro
    
    log_success "Project structure created"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "  🎉 VPS Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Installed Components:"
    echo "  ✅ Node.js $(node --version)"
    echo "  ✅ pnpm $(pnpm --version)"
    echo "  ✅ PM2 $(pm2 --version)"
    echo "  ✅ Nginx $(nginx -v 2>&1 | cut -d'/' -f2)"
    echo "  ✅ Certbot"
    echo "  ✅ MySQL Client"
    echo "  ✅ Firewall (UFW)"
    echo "  ✅ Fail2ban"
    echo "  ✅ 2GB Swap"
    echo ""
    echo "Project Directories:"
    echo "  📁 /var/www/bitchange-pro"
    echo "  📁 /var/log/bitchange-pro"
    echo "  📁 /var/backups/bitchange-pro"
    echo ""
    echo "Next Steps:"
    echo "  1. Upload your project files to /var/www/bitchange-pro"
    echo "  2. Create .env file with your configuration"
    echo "  3. Run: cd /var/www/bitchange-pro && ./scripts/deploy.sh"
    echo ""
    echo "Security Notes:"
    echo "  ⚠️  Change SSH port (optional but recommended)"
    echo "  ⚠️  Disable root login via SSH"
    echo "  ⚠️  Setup SSH key authentication"
    echo "  ⚠️  Configure domain DNS before SSL setup"
    echo ""
    echo "=========================================="
}

# Main setup flow
main() {
    log_info "Starting VPS setup for BitChange Pro..."
    echo ""
    
    check_root
    update_system
    install_utilities
    install_nodejs
    install_pnpm
    install_pm2
    install_nginx
    install_certbot
    install_mysql_client
    setup_firewall
    setup_fail2ban
    setup_swap
    setup_log_rotation
    optimize_system
    create_project_structure
    print_summary
    
    log_success "VPS setup completed successfully!"
}

# Run main function
main "$@"
