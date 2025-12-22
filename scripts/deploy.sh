#!/bin/bash

###############################################################################
# BitChange Pro - Automated VPS Deployment Script
# 
# This script automates the deployment of BitChange Pro to a production VPS.
# It handles:
# - Environment setup
# - Database migration
# - Application build
# - PM2 process management
# - Nginx configuration
# - SSL certificate setup
# 
# Usage:
#   ./scripts/deploy.sh [environment]
# 
# Environments:
#   production (default) - Deploy to production with SSL
#   staging - Deploy to staging environment
# 
# Prerequisites:
#   - Ubuntu 22.04 LTS VPS
#   - Root or sudo access
#   - Domain pointing to VPS IP
#   - .env file configured
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
PROJECT_NAME="bitchange-pro"
PROJECT_DIR="/var/www/${PROJECT_NAME}"
LOG_DIR="/var/log/${PROJECT_NAME}"
BACKUP_DIR="/var/backups/${PROJECT_NAME}"
NODE_VERSION="22"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Run setup-vps.sh first."
        exit 1
    fi
    
    NODE_INSTALLED_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_INSTALLED_VERSION" -lt "$NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION or higher is required (found v$NODE_INSTALLED_VERSION)"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Run setup-vps.sh first."
        exit 1
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Run setup-vps.sh first."
        exit 1
    fi
    
    # Check .env file
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please create it before deploying."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

create_directories() {
    log_info "Creating project directories..."
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo mkdir -p "$LOG_DIR"
    sudo mkdir -p "$BACKUP_DIR"
    
    # Set ownership
    sudo chown -R $USER:$USER "$PROJECT_DIR"
    sudo chown -R $USER:$USER "$LOG_DIR"
    sudo chown -R $USER:$USER "$BACKUP_DIR"
    
    log_success "Directories created"
}

backup_existing() {
    if [ -d "$PROJECT_DIR" ] && [ "$(ls -A $PROJECT_DIR)" ]; then
        log_info "Backing up existing deployment..."
        
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$BACKUP_FILE" -C "$PROJECT_DIR" . 2>/dev/null || true
        
        log_success "Backup created: $BACKUP_FILE"
    fi
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    pnpm install --frozen-lockfile
    
    log_success "Dependencies installed"
}

run_database_migration() {
    log_info "Running database migration..."
    
    cd "$PROJECT_DIR"
    
    if [ -f "scripts/apply-wallet-migration.mjs" ]; then
        node scripts/apply-wallet-migration.mjs
        log_success "Database migration completed"
    else
        log_warning "Migration script not found, skipping..."
    fi
}

build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_DIR"
    
    # Build frontend
    pnpm build
    
    log_success "Application built successfully"
}

setup_pm2() {
    log_info "Setting up PM2..."
    
    cd "$PROJECT_DIR"
    
    # Stop existing process if running
    pm2 delete "$PROJECT_NAME" 2>/dev/null || true
    
    # Start application
    pm2 start server/_core/index.ts \
        --name "$PROJECT_NAME" \
        --interpreter tsx \
        --env "$ENVIRONMENT"
    
    # Save PM2 process list
    pm2 save
    
    # Setup PM2 startup script (only once)
    if ! pm2 startup | grep -q "already"; then
        pm2 startup systemd -u $USER --hp $HOME
    fi
    
    log_success "PM2 configured and application started"
}

setup_nginx() {
    log_info "Setting up Nginx..."
    
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx not installed, skipping configuration"
        return
    fi
    
    # Create Nginx config from template
    if [ -f "scripts/nginx-template.conf" ]; then
        sudo cp scripts/nginx-template.conf "/etc/nginx/sites-available/$PROJECT_NAME"
        sudo ln -sf "/etc/nginx/sites-available/$PROJECT_NAME" "/etc/nginx/sites-enabled/$PROJECT_NAME"
        
        # Test Nginx configuration
        sudo nginx -t
        
        # Reload Nginx
        sudo systemctl reload nginx
        
        log_success "Nginx configured"
    else
        log_warning "Nginx template not found, skipping..."
    fi
}

setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    if ! command -v certbot &> /dev/null; then
        log_warning "Certbot not installed, skipping SSL setup"
        return
    fi
    
    # Read domain from .env
    DOMAIN=$(grep VITE_APP_DOMAIN .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$DOMAIN" ]; then
        log_warning "VITE_APP_DOMAIN not set in .env, skipping SSL setup"
        return
    fi
    
    log_info "Setting up SSL for domain: $DOMAIN"
    
    # Run certbot
    sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
        log_warning "SSL setup failed, continuing without SSL"
        return
    }
    
    log_success "SSL certificate installed"
}

setup_cron_jobs() {
    log_info "Setting up cron jobs..."
    
    cd "$PROJECT_DIR"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "sweep-monitor-cron.mjs"; then
        log_info "Cron job already exists, skipping..."
        return
    fi
    
    # Add cron job for sweep monitoring
    (crontab -l 2>/dev/null; echo "*/10 * * * * cd $PROJECT_DIR && /usr/bin/node scripts/sweep-monitor-cron.mjs >> $LOG_DIR/sweep-monitor.log 2>&1") | crontab -
    
    log_success "Cron jobs configured"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check PM2 status
    if ! pm2 list | grep -q "$PROJECT_NAME.*online"; then
        log_error "Application is not running"
        pm2 logs "$PROJECT_NAME" --lines 50
        exit 1
    fi
    
    # Check if port 3000 is listening
    if ! netstat -tuln | grep -q ":3000"; then
        log_error "Application is not listening on port 3000"
        exit 1
    fi
    
    # Check database connection
    cd "$PROJECT_DIR"
    if ! node -e "require('mysql2/promise').createConnection(process.env.DATABASE_URL).then(() => console.log('OK')).catch(() => process.exit(1))" 2>/dev/null; then
        log_warning "Database connection test failed"
    fi
    
    log_success "Deployment verified"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "  🎉 Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Directory: $PROJECT_DIR"
    echo "Logs: $LOG_DIR"
    echo ""
    echo "Next Steps:"
    echo "  1. Configure cold wallet addresses (Admin Panel)"
    echo "  2. Setup alert emails (Admin Panel → Wallet Management)"
    echo "  3. Test WebAuthn on HTTPS domain"
    echo "  4. Monitor logs: pm2 logs $PROJECT_NAME"
    echo "  5. Monitor sweep: tail -f $LOG_DIR/sweep-monitor.log"
    echo ""
    echo "Useful Commands:"
    echo "  pm2 status          - Check application status"
    echo "  pm2 logs $PROJECT_NAME  - View application logs"
    echo "  pm2 restart $PROJECT_NAME - Restart application"
    echo "  pm2 monit           - Monitor resources"
    echo ""
    echo "=========================================="
}

# Main deployment flow
main() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    echo ""
    
    check_root
    check_prerequisites
    create_directories
    backup_existing
    
    # Copy files to project directory if not already there
    if [ "$(pwd)" != "$PROJECT_DIR" ]; then
        log_info "Copying files to $PROJECT_DIR..."
        rsync -av --exclude 'node_modules' --exclude '.git' . "$PROJECT_DIR/"
    fi
    
    install_dependencies
    run_database_migration
    build_application
    setup_pm2
    setup_nginx
    
    if [ "$ENVIRONMENT" = "production" ]; then
        setup_ssl
    fi
    
    setup_cron_jobs
    verify_deployment
    print_summary
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
