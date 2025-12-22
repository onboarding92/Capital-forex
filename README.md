# 💹 Capital Forex - Professional Forex Trading Platform

**High-Leverage Forex Broker with Instant Execution**

Capital Forex is a professional forex trading platform offering high leverage (up to 1:500), instant execution, and comprehensive risk management tools. Built with modern web technologies for speed, security, and reliability.

![Capital Forex](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-blue)

---

## 🌟 Key Features

### 💱 Trading Features
- **28 Forex Pairs** - Major, minor, and exotic currency pairs
- **Instant Execution** - No order book, immediate trade execution at market price
- **High Leverage** - Up to 1:500 on major pairs (EUR/USD, GBP/USD, etc.)
- **Spread-Based Pricing** - Competitive spreads starting from 2 pips
- **Stop Loss & Take Profit** - Automated risk management on every position
- **Swap Rates** - Transparent overnight fees (positive and negative)
- **Real-time P&L** - Live profit/loss updates every 5 seconds

### 📊 Account Types
- **Standard** - 1:100 leverage, 2.0 pip spread, ideal for beginners
- **ECN** - 1:200 leverage, 1.5 pip spread, for active traders
- **Pro** - 1:500 leverage, 1.0 pip spread, for experienced professionals

### 🛡️ Risk Management
- **Margin Call System** - Automatic warnings at 120% margin level
- **Stop Out Protection** - Auto-liquidation at 50% to protect capital
- **Negative Balance Protection** - Account balance cannot go below $0
- **Real-time Margin Monitoring** - Live equity, margin, and free margin updates
- **Position Limits** - Maximum position size controls
- **Daily Loss Limits** - Configurable maximum daily loss

### 🔐 Security & Compliance
- **KYC Verification** - Secure identity verification process
- **Two-Factor Authentication** - Google Authenticator support
- **WebAuthn Support** - Biometric authentication (Face ID, Touch ID, Windows Hello)
- **SSL/TLS Encryption** - All communications encrypted
- **Session Management** - Secure JWT-based authentication
- **Login History** - Track all login attempts

---

## 📈 Supported Forex Pairs (28 Total)

### Major Pairs (7)
`EUR/USD` `GBP/USD` `USD/JPY` `USD/CHF` `AUD/USD` `USD/CAD` `NZD/USD`

### Minor Pairs (14)
`EUR/GBP` `EUR/AUD` `EUR/CAD` `EUR/CHF` `EUR/JPY` `EUR/NZD` `GBP/JPY` `GBP/CHF` `GBP/AUD` `GBP/CAD` `GBP/NZD` `AUD/JPY` `AUD/CAD` `AUD/NZD`

### Exotic Pairs (7)
`USD/TRY` `USD/ZAR` `USD/MXN` `USD/SGD` `USD/HKD` `USD/NOK` `USD/SEK`

---

## 🏗️ Technology Stack

### Frontend
- **React 19** - Modern UI framework with concurrent features
- **Tailwind CSS 4** - Utility-first styling with JIT compiler
- **shadcn/ui** - High-quality, accessible UI components
- **Wouter** - Lightweight client-side routing
- **TanStack Query** - Powerful data fetching and caching
- **tRPC** - End-to-end type safety

### Backend
- **Node.js 22** - JavaScript runtime
- **Express 4** - Minimal web framework
- **tRPC 11** - Type-safe API layer
- **Drizzle ORM** - Type-safe SQL queries
- **MySQL 8** - Relational database
- **JWT** - Secure authentication tokens

### Infrastructure
- **Docker** - Containerization for easy deployment
- **Nginx** - High-performance reverse proxy
- **PM2** - Production process manager
- **Let's Encrypt** - Free SSL certificates

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- MySQL 8.0+
- pnpm 10+ (recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/onboarding92/Capital-forex.git
cd capital-forex

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
pnpm db:push

# Seed forex pairs and swap rates
node scripts/seed-forex-pairs.mjs
node scripts/seed-swap-rates.mjs

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to access the platform.

---

## 📖 Trading Documentation

### How Instant Execution Works

Unlike crypto exchanges with order books, forex brokers use **instant execution**:

1. **User submits order** - Market order to buy/sell EUR/USD
2. **System fetches price** - Current bid/ask from price feed
3. **Spread applied** - Broker's spread added (e.g., 2 pips)
4. **Margin check** - Verify sufficient free margin
5. **Position opened** - Instant execution, no waiting
6. **Real-time updates** - P&L updated every 5 seconds

### Margin Calculation Formula

```
Required Margin = (Volume × Contract Size × Price) / Leverage
```

**Example:**
- **Volume:** 1.0 lot (standard lot)
- **Contract Size:** 100,000 units
- **Price:** 1.0850 (EUR/USD)
- **Leverage:** 1:100

**Required Margin** = (1.0 × 100,000 × 1.0850) / 100 = **$1,085**

### Profit/Loss Calculation

```
Profit = (Close Price - Open Price) × Volume × Contract Size × Direction
```

**Direction:** +1 for buy (long), -1 for sell (short)

**Example (Buy EUR/USD):**
- **Open Price:** 1.0850
- **Close Price:** 1.0900
- **Volume:** 1.0 lot
- **Profit:** (1.0900 - 1.0850) × 1.0 × 100,000 = **$500**

### Margin Level Thresholds

| Margin Level | Status | Action |
|-------------|--------|--------|
| > 200% | ✅ Healthy | Safe to trade |
| 120-200% | ⚠️ Warning | Monitor closely |
| < 120% | 🚨 Margin Call | Add funds or close positions |
| < 50% | 💥 Stop Out | Automatic liquidation |

---

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/capital_forex

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@capitalforex.com
SENDGRID_FROM_NAME=Capital Forex

# OAuth (Manus)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=your-app-id

# Server
PORT=3000
NODE_ENV=production
DOMAIN=capitalforex.com
```

### Customizing Account Types

Edit `server/forexTradingEngine.ts`:

```typescript
const accountTypes = {
  standard: { leverage: 100, spread: 2.0 },
  ecn: { leverage: 200, spread: 1.5 },
  pro: { leverage: 500, spread: 1.0 },
};
```

---

## 🔐 Security Features

### Authentication Methods
- ✅ Email/password with bcrypt hashing (cost factor: 10)
- ✅ OAuth integration (Manus platform)
- ✅ Two-factor authentication (TOTP via speakeasy)
- ✅ WebAuthn biometric authentication (Face ID, Touch ID, Windows Hello)

### Risk Management
- ✅ Margin call system (120% threshold)
- ✅ Stop out level (50% threshold)
- ✅ Negative balance protection
- ✅ Maximum position size limits
- ✅ Daily loss limits
- ✅ Real-time margin monitoring

### Data Protection
- ✅ SSL/TLS encryption (Let's Encrypt)
- ✅ Secure session management (JWT with httpOnly cookies)
- ✅ IP whitelisting (admin only)
- ✅ Anti-phishing codes
- ✅ Login history tracking
- ✅ Encrypted password storage

---

## 📊 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `tradingAccounts` | Forex trading accounts with leverage |
| `forexPairs` | Available currency pairs (28 pairs) |
| `forexPositions` | Open and closed trading positions |
| `orders` | Order history (market, limit, stop) |
| `trades` | Trade execution history |
| `swapRates` | Overnight swap fees per pair |
| `marginCalls` | Margin call history and alerts |
| `transactions` | Deposits and withdrawals |
| `kycDocuments` | KYC verification documents |
| `supportTickets` | Customer support tickets |
| `notifications` | User notifications |

See [drizzle/schema.ts](./drizzle/schema.ts) for complete schema.

---

## 🚢 Deployment

### Docker Deployment (Recommended)

```bash
# Build Docker image
docker build -t capital-forex .

# Run container
docker run -d -p 3000:3000 \
  --env-file .env \
  --name capital-forex \
  capital-forex
```

### VPS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed VPS deployment guide including:
- Nginx configuration
- SSL certificate setup
- PM2 process management
- Database optimization
- Security hardening

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/forexTradingEngine.test.ts

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test:watch
```

---

## 📁 Project Structure

```
capital-forex/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   └── lib/              # Utilities and tRPC client
│   └── public/               # Static assets
├── server/                   # Backend Express + tRPC
│   ├── routers.ts           # tRPC API routes
│   ├── db.ts                # Database helpers
│   ├── forexTradingEngine.ts # Instant execution engine
│   ├── marginEngine.ts      # Margin call & liquidation
│   └── email.ts             # SendGrid email templates
├── drizzle/                 # Database schema
│   └── schema.ts            # Drizzle ORM schema
├── scripts/                 # Utility scripts
│   ├── seed-forex-pairs.mjs # Seed 28 forex pairs
│   └── seed-swap-rates.mjs  # Seed swap rates
└── docs/                    # Documentation
```

---

## 🎯 Roadmap

### ✅ Phase 1 (Completed)
- Core trading engine with instant execution
- 28 forex pairs (major, minor, exotic)
- Margin management system
- Risk management (margin call, stop out)
- Database schema and migrations

### 🚧 Phase 2 (In Progress)
- [ ] Real-time price feed integration (Alpha Vantage, Twelve Data)
- [ ] Economic calendar (Forex Factory API)
- [ ] News feed integration
- [ ] Advanced charting (TradingView widgets)
- [ ] Admin panel for forex management

### 📅 Phase 3 (Planned)
- [ ] Mobile app (React Native)
- [ ] Copy trading functionality
- [ ] Social trading features
- [ ] Trading signals
- [ ] Automated trading (EA support)
- [ ] Multi-language support

---

## ⚠️ Risk Disclaimer

**Forex trading involves significant risk of loss and is not suitable for all investors.**

- ⚠️ Leverage can magnify both profits and losses
- ⚠️ Past performance is not indicative of future results
- ⚠️ Only trade with money you can afford to lose
- ⚠️ Seek independent financial advice if necessary

**Capital Forex is a demo platform for educational purposes. Real trading involves financial risk.**

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🆘 Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/onboarding92/Capital-forex/issues)
- **Email:** support@capitalforex.com

---

## 📞 Contact

**Capital Forex Team**

- Website: https://capitalforex.com
- Email: info@capitalforex.com
- GitHub: https://github.com/onboarding92/Capital-forex

---

**Built with ❤️ for professional forex traders**
