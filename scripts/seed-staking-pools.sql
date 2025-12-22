-- Seed Staking Pools
-- Populates stakingPools table with real pools for BTC, ETH, USDT, BNB, SOL

-- BTC Pools
INSERT INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive) VALUES
('BTC', 'flexible', '3.50', '0.001', 0, '0', 1),
('BTC', 'locked', '5.80', '0.001', 30, '0', 1),
('BTC', 'locked', '7.20', '0.001', 90, '0', 1);

-- ETH Pools
INSERT INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive) VALUES
('ETH', 'flexible', '4.20', '0.01', 0, '0', 1),
('ETH', 'locked', '6.50', '0.01', 30, '0', 1),
('ETH', 'locked', '8.80', '0.01', 90, '0', 1);

-- USDT Pools
INSERT INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive) VALUES
('USDT', 'flexible', '5.00', '10', 0, '0', 1),
('USDT', 'locked', '8.50', '10', 30, '0', 1),
('USDT', 'locked', '12.00', '10', 90, '0', 1);

-- BNB Pool
INSERT INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive) VALUES
('BNB', 'locked', '10.50', '0.1', 60, '0', 1);

-- SOL Pool
INSERT INTO stakingPools (asset, type, apy, minAmount, lockPeriod, totalStaked, isActive) VALUES
('SOL', 'flexible', '6.80', '1', 0, '0', 1);
