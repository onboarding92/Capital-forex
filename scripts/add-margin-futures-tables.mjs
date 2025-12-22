import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

async function runMigration() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Creating margin trading and futures tables...");

    // Create marginAccounts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS marginAccounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        currency VARCHAR(20) NOT NULL,
        balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        available DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        locked DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        leverage INT DEFAULT 1 NOT NULL,
        marginLevel DECIMAL(10, 4) DEFAULT 0 NOT NULL,
        totalDebt DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_currency (currency)
      )
    `);
    console.log("✓ marginAccounts table created");

    // Create positions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        contractType ENUM('spot', 'perpetual', 'futures') DEFAULT 'spot' NOT NULL,
        side ENUM('long', 'short') NOT NULL,
        size DECIMAL(20, 8) NOT NULL,
        entryPrice DECIMAL(20, 8) NOT NULL,
        markPrice DECIMAL(20, 8) NOT NULL,
        liquidationPrice DECIMAL(20, 8) NOT NULL,
        leverage INT NOT NULL,
        marginMode ENUM('isolated', 'cross') DEFAULT 'isolated' NOT NULL,
        margin DECIMAL(20, 8) NOT NULL,
        unrealizedPnL DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        realizedPnL DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        fundingFee DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        status ENUM('open', 'closed', 'liquidated') DEFAULT 'open' NOT NULL,
        openedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        closedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_symbol (symbol),
        INDEX idx_status (status)
      )
    `);
    console.log("✓ positions table created");

    // Create futuresContracts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS futuresContracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        baseAsset VARCHAR(20) NOT NULL,
        quoteAsset VARCHAR(20) NOT NULL,
        contractType ENUM('perpetual', 'quarterly', 'bi-quarterly') DEFAULT 'perpetual' NOT NULL,
        fundingRate DECIMAL(10, 8) DEFAULT 0 NOT NULL,
        fundingInterval INT DEFAULT 28800 NOT NULL,
        nextFundingTime TIMESTAMP NOT NULL,
        markPrice DECIMAL(20, 8) NOT NULL,
        indexPrice DECIMAL(20, 8) NOT NULL,
        lastPrice DECIMAL(20, 8) NOT NULL,
        volume24h DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        openInterest DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        maxLeverage INT DEFAULT 100 NOT NULL,
        maintenanceMarginRate DECIMAL(5, 4) DEFAULT 0.005 NOT NULL,
        takerFeeRate DECIMAL(5, 4) DEFAULT 0.0006 NOT NULL,
        makerFeeRate DECIMAL(5, 4) DEFAULT 0.0002 NOT NULL,
        isActive BOOLEAN DEFAULT TRUE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_symbol (symbol),
        INDEX idx_isActive (isActive)
      )
    `);
    console.log("✓ futuresContracts table created");

    // Create fundingHistory table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fundingHistory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contractId INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        fundingRate DECIMAL(10, 8) NOT NULL,
        fundingTime TIMESTAMP NOT NULL,
        totalFunding DECIMAL(20, 8) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_contractId (contractId),
        INDEX idx_symbol (symbol),
        INDEX idx_fundingTime (fundingTime)
      )
    `);
    console.log("✓ fundingHistory table created");

    // Create liquidationQueue table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS liquidationQueue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        positionId INT NOT NULL,
        userId INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        side ENUM('long', 'short') NOT NULL,
        size DECIMAL(20, 8) NOT NULL,
        entryPrice DECIMAL(20, 8) NOT NULL,
        liquidationPrice DECIMAL(20, 8) NOT NULL,
        currentPrice DECIMAL(20, 8) NOT NULL,
        leverage INT NOT NULL,
        status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued' NOT NULL,
        queuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        processedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_positionId (positionId),
        INDEX idx_userId (userId),
        INDEX idx_status (status)
      )
    `);
    console.log("✓ liquidationQueue table created");

    // Create insuranceFund table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS insuranceFund (
        id INT AUTO_INCREMENT PRIMARY KEY,
        currency VARCHAR(20) NOT NULL UNIQUE,
        balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        totalContributions DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        totalPayouts DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_currency (currency)
      )
    `);
    console.log("✓ insuranceFund table created");

    // Insert default perpetual contracts
    await connection.execute(`
      INSERT IGNORE INTO futuresContracts (
        symbol, baseAsset, quoteAsset, contractType, fundingRate, fundingInterval,
        nextFundingTime, markPrice, indexPrice, lastPrice, maxLeverage,
        maintenanceMarginRate, takerFeeRate, makerFeeRate, isActive
      ) VALUES
        ('BTCUSDT', 'BTC', 'USDT', 'perpetual', 0.0001, 28800, 
         DATE_ADD(NOW(), INTERVAL 8 HOUR), 50000, 50000, 50000, 100, 0.005, 0.0006, 0.0002, TRUE),
        ('ETHUSDT', 'ETH', 'USDT', 'perpetual', 0.0001, 28800,
         DATE_ADD(NOW(), INTERVAL 8 HOUR), 3000, 3000, 3000, 100, 0.005, 0.0006, 0.0002, TRUE),
        ('BNBUSDT', 'BNB', 'USDT', 'perpetual', 0.0001, 28800,
         DATE_ADD(NOW(), INTERVAL 8 HOUR), 400, 400, 400, 75, 0.005, 0.0006, 0.0002, TRUE)
    `);
    console.log("✓ Default perpetual contracts inserted");

    // Initialize insurance fund
    await connection.execute(`
      INSERT IGNORE INTO insuranceFund (currency, balance, totalContributions, totalPayouts)
      VALUES ('USDT', 10000, 10000, 0)
    `);
    console.log("✓ Insurance fund initialized");

    console.log("\n✅ All margin trading and futures tables created successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
