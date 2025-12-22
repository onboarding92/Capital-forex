-- Seed networks table with common crypto networks
-- This enables deposit/withdrawal functionality

INSERT INTO networks (name, symbol, chainId, type, asset, isActive, depositFee, withdrawalFee, minDeposit, minWithdrawal, confirmations) VALUES
-- Bitcoin networks
('Bitcoin', 'BTC', NULL, 'mainnet', 'BTC', 1, '0.00000000', '0.0005', '0.0001', '0.001', 3),
('Bitcoin Lightning', 'BTC-LN', NULL, 'lightning', 'BTC', 1, '0.00000000', '0.00001', '0.00001', '0.0001', 1),

-- Ethereum networks
('Ethereum', 'ETH', '1', 'mainnet', 'ETH', 1, '0.00000000', '0.005', '0.01', '0.01', 12),
('Ethereum', 'ETH', '1', 'mainnet', 'USDT', 1, '0.00000000', '5.00', '10.00', '20.00', 12),
('Ethereum', 'ETH', '1', 'mainnet', 'USDC', 1, '0.00000000', '5.00', '10.00', '20.00', 12),

-- Binance Smart Chain
('BNB Smart Chain', 'BSC', '56', 'mainnet', 'BNB', 1, '0.00000000', '0.001', '0.01', '0.01', 15),
('BNB Smart Chain', 'BSC', '56', 'mainnet', 'USDT', 1, '0.00000000', '1.00', '10.00', '20.00', 15),
('BNB Smart Chain', 'BSC', '56', 'mainnet', 'USDC', 1, '0.00000000', '1.00', '10.00', '20.00', 15),

-- Tron network
('Tron', 'TRX', NULL, 'mainnet', 'TRX', 1, '0.00000000', '1.00', '10.00', '20.00', 19),
('Tron (TRC20)', 'TRC20', NULL, 'trc20', 'USDT', 1, '0.00000000', '1.00', '10.00', '20.00', 19),
('Tron (TRC20)', 'TRC20', NULL, 'trc20', 'USDC', 1, '0.00000000', '1.00', '10.00', '20.00', 19),

-- Solana network
('Solana', 'SOL', NULL, 'mainnet', 'SOL', 1, '0.00000000', '0.01', '0.1', '0.1', 32),
('Solana', 'SOL', NULL, 'mainnet', 'USDT', 1, '0.00000000', '0.50', '10.00', '20.00', 32),
('Solana', 'SOL', NULL, 'mainnet', 'USDC', 1, '0.00000000', '0.50', '10.00', '20.00', 32),

-- Polygon network
('Polygon', 'MATIC', '137', 'mainnet', 'MATIC', 1, '0.00000000', '0.1', '1.00', '5.00', 128),
('Polygon', 'MATIC', '137', 'mainnet', 'USDT', 1, '0.00000000', '0.50', '10.00', '20.00', 128),
('Polygon', 'MATIC', '137', 'mainnet', 'USDC', 1, '0.00000000', '0.50', '10.00', '20.00', 128);
