import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

async function runMigration() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Creating staking and social trading tables...");

    // Create stakingPools table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stakingPools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset VARCHAR(20) NOT NULL,
        type ENUM('flexible', 'locked') NOT NULL,
        apy DECIMAL(5, 2) NOT NULL,
        minAmount DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        lockPeriod INT DEFAULT 0 NOT NULL,
        totalStaked DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        isActive BOOLEAN DEFAULT TRUE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_asset (asset),
        INDEX idx_type (type),
        INDEX idx_isActive (isActive)
      )
    `);
    console.log("✓ stakingPools table created");

    // Create userStakes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS userStakes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        poolId INT NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        startDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        endDate TIMESTAMP NULL,
        status ENUM('active', 'completed', 'withdrawn') DEFAULT 'active' NOT NULL,
        accumulatedRewards DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        lastRewardCalculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        autoCompound BOOLEAN DEFAULT FALSE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_poolId (poolId),
        INDEX idx_status (status)
      )
    `);
    console.log("✓ userStakes table created");

    // Create stakingRewards table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stakingRewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stakeId INT NOT NULL,
        userId INT NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        type ENUM('daily', 'compound', 'withdrawal') NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_stakeId (stakeId),
        INDEX idx_userId (userId),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log("✓ stakingRewards table created");

    // Create liquidityPools table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS liquidityPools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pair VARCHAR(20) NOT NULL UNIQUE,
        token0 VARCHAR(20) NOT NULL,
        token1 VARCHAR(20) NOT NULL,
        totalLiquidity DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        token0Reserve DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        token1Reserve DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        apy DECIMAL(5, 2) DEFAULT 0 NOT NULL,
        fees24h DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        volume24h DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        isActive BOOLEAN DEFAULT TRUE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_pair (pair),
        INDEX idx_isActive (isActive)
      )
    `);
    console.log("✓ liquidityPools table created");

    // Create userLiquidityPositions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS userLiquidityPositions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        poolId INT NOT NULL,
        token0Amount DECIMAL(20, 8) NOT NULL,
        token1Amount DECIMAL(20, 8) NOT NULL,
        lpTokens DECIMAL(20, 8) NOT NULL,
        rewards DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        impermanentLoss DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        status ENUM('active', 'withdrawn') DEFAULT 'active' NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_poolId (poolId),
        INDEX idx_status (status)
      )
    `);
    console.log("✓ userLiquidityPositions table created");

    // Create leaderboard table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL UNIQUE,
        \`rank\` INT DEFAULT 0 NOT NULL,
        totalPnL DECIMAL(20, 8) DEFAULT 0 NOT NULL,
        winRate DECIMAL(5, 2) DEFAULT 0 NOT NULL,
        totalTrades INT DEFAULT 0 NOT NULL,
        followers INT DEFAULT 0 NOT NULL,
        points INT DEFAULT 0 NOT NULL,
        streak INT DEFAULT 0 NOT NULL,
        tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze' NOT NULL,
        verified BOOLEAN DEFAULT FALSE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_rank (\`rank\`),
        INDEX idx_tier (tier)
      )
    `);
    console.log("✓ leaderboard table created");

    // Create achievements table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        achievementType VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        points INT DEFAULT 0 NOT NULL,
        metadata TEXT,
        earnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_achievementType (achievementType)
      )
    `);
    console.log("✓ achievements table created");

    // Create socialFeed table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS socialFeed (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        type ENUM('post', 'trade_share', 'achievement', 'milestone') NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        likes INT DEFAULT 0 NOT NULL,
        comments INT DEFAULT 0 NOT NULL,
        shares INT DEFAULT 0 NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_userId (userId),
        INDEX idx_type (type),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log("✓ socialFeed table created");

    // Create profitSharing table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profitSharing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        traderId INT NOT NULL,
        followerId INT NOT NULL,
        tradeId INT NOT NULL,
        originalProfit DECIMAL(20, 8) NOT NULL,
        sharedProfit DECIMAL(20, 8) NOT NULL,
        percentage DECIMAL(5, 2) DEFAULT 10 NOT NULL,
        status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending' NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_traderId (traderId),
        INDEX idx_followerId (followerId),
        INDEX idx_status (status)
      )
    `);
    console.log("✓ profitSharing table created");

    // Insert default staking pools
    await connection.execute(`
      INSERT IGNORE INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive)
      VALUES
        ('BTC', 'flexible', 5.00, 0.001, 0, 0, TRUE),
        ('BTC', 'locked', 8.00, 0.001, 30, 0, TRUE),
        ('BTC', 'locked', 12.00, 0.001, 90, 0, TRUE),
        ('ETH', 'flexible', 6.00, 0.01, 0, 0, TRUE),
        ('ETH', 'locked', 10.00, 0.01, 30, 0, TRUE),
        ('ETH', 'locked', 15.00, 0.01, 90, 0, TRUE),
        ('USDT', 'flexible', 8.00, 10, 0, 0, TRUE),
        ('USDT', 'locked', 12.00, 10, 30, 0, TRUE),
        ('USDT', 'locked', 18.00, 10, 90, 0, TRUE)
    `);
    console.log("✓ Default staking pools inserted");

    // Insert default liquidity pools
    await connection.execute(`
      INSERT IGNORE INTO liquidityPools (pair, token0, token1, totalLiquidity, token0Reserve, token1Reserve, apy, fees24h, volume24h, isActive)
      VALUES
        ('BTC/USDT', 'BTC', 'USDT', 0, 0, 0, 25.00, 0, 0, TRUE),
        ('ETH/USDT', 'ETH', 'USDT', 0, 0, 0, 30.00, 0, 0, TRUE),
        ('BNB/USDT', 'BNB', 'USDT', 0, 0, 0, 35.00, 0, 0, TRUE)
    `);
    console.log("✓ Default liquidity pools inserted");

    console.log("\n✅ All staking and social trading tables created successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
