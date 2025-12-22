import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const plans = [
  { asset: 'BTC', name: 'Bitcoin Flexible', apr: '5.00', lockDays: 0, minAmount: '0.001' },
  { asset: 'BTC', name: 'Bitcoin 30 Days', apr: '8.00', lockDays: 30, minAmount: '0.001' },
  { asset: 'BTC', name: 'Bitcoin 90 Days', apr: '12.00', lockDays: 90, minAmount: '0.001' },
  { asset: 'ETH', name: 'Ethereum Flexible', apr: '6.00', lockDays: 0, minAmount: '0.01' },
  { asset: 'ETH', name: 'Ethereum 30 Days', apr: '10.00', lockDays: 30, minAmount: '0.01' },
  { asset: 'ETH', name: 'Ethereum 90 Days', apr: '15.00', lockDays: 90, minAmount: '0.01' },
  { asset: 'USDT', name: 'USDT Flexible', apr: '4.00', lockDays: 0, minAmount: '100' },
  { asset: 'USDT', name: 'USDT 30 Days', apr: '7.00', lockDays: 30, minAmount: '100' },
  { asset: 'USDT', name: 'USDT 90 Days', apr: '10.00', lockDays: 90, minAmount: '100' },
];

for (const plan of plans) {
  await connection.execute(
    'INSERT INTO stakingPlans (asset, name, apr, lockDays, minAmount, enabled) VALUES (?, ?, ?, ?, ?, 1)',
    [plan.asset, plan.name, plan.apr, plan.lockDays, plan.minAmount]
  );
}

console.log('✅ Seeded', plans.length, 'staking plans');
await connection.end();
