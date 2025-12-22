/**
 * Seed Swap Rates
 * 
 * Populates the swapRates table with overnight swap fees for each forex pair
 * Swap rates are in pips and applied daily at 00:00 GMT
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const swapRates = [
  // MAJOR PAIRS
  { symbol: "EUR/USD", longSwap: -0.5, shortSwap: 0.2 },
  { symbol: "GBP/USD", longSwap: -0.6, shortSwap: 0.3 },
  { symbol: "USD/JPY", longSwap: 0.4, shortSwap: -0.8 },
  { symbol: "USD/CHF", longSwap: 0.3, shortSwap: -0.7 },
  { symbol: "AUD/USD", longSwap: -0.4, shortSwap: 0.1 },
  { symbol: "USD/CAD", longSwap: 0.2, shortSwap: -0.6 },
  { symbol: "NZD/USD", longSwap: -0.5, shortSwap: 0.2 },

  // MINOR PAIRS
  { symbol: "EUR/GBP", longSwap: -0.7, shortSwap: 0.4 },
  { symbol: "EUR/AUD", longSwap: -0.8, shortSwap: 0.5 },
  { symbol: "EUR/CAD", longSwap: -0.9, shortSwap: 0.6 },
  { symbol: "EUR/CHF", longSwap: -0.6, shortSwap: 0.3 },
  { symbol: "EUR/JPY", longSwap: -0.5, shortSwap: 0.2 },
  { symbol: "EUR/NZD", longSwap: -1.0, shortSwap: 0.7 },
  { symbol: "GBP/JPY", longSwap: -0.8, shortSwap: 0.5 },
  { symbol: "GBP/CHF", longSwap: -0.9, shortSwap: 0.6 },
  { symbol: "GBP/AUD", longSwap: -1.0, shortSwap: 0.7 },
  { symbol: "GBP/CAD", longSwap: -1.1, shortSwap: 0.8 },
  { symbol: "GBP/NZD", longSwap: -1.2, shortSwap: 0.9 },
  { symbol: "AUD/JPY", longSwap: -0.6, shortSwap: 0.3 },
  { symbol: "AUD/CAD", longSwap: -0.7, shortSwap: 0.4 },
  { symbol: "AUD/NZD", longSwap: -0.8, shortSwap: 0.5 },

  // EXOTIC PAIRS (higher swap rates)
  { symbol: "USD/TRY", longSwap: -15.0, shortSwap: 8.0 },
  { symbol: "USD/ZAR", longSwap: -12.0, shortSwap: 6.0 },
  { symbol: "USD/MXN", longSwap: -10.0, shortSwap: 5.0 },
  { symbol: "USD/SGD", longSwap: -2.0, shortSwap: 1.0 },
  { symbol: "USD/HKD", longSwap: -1.5, shortSwap: 0.8 },
  { symbol: "USD/NOK", longSwap: -2.5, shortSwap: 1.2 },
  { symbol: "USD/SEK", longSwap: -2.5, shortSwap: 1.2 },
];

async function seedSwapRates() {
  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    console.log("Connected to database");

    // Clear existing swap rates
    await connection.execute("DELETE FROM swapRates");
    console.log("Cleared existing swap rates");

    // Insert swap rates
    for (const rate of swapRates) {
      await connection.execute(
        `INSERT INTO swapRates (symbol, longSwap, shortSwap) VALUES (?, ?, ?)`,
        [rate.symbol, rate.longSwap, rate.shortSwap]
      );
    }

    console.log(`✅ Successfully seeded ${swapRates.length} swap rates`);
    console.log("\nSwap Rate Information:");
    console.log("- Positive swap: You earn overnight interest");
    console.log("- Negative swap: You pay overnight interest");
    console.log("- Swap is applied daily at 00:00 GMT");
    console.log("- Wednesday swap is triple (3x) to account for weekend");

  } catch (error) {
    console.error("Error seeding swap rates:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedSwapRates();
