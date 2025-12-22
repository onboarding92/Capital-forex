/**
 * Seed Forex Pairs
 * 
 * Populates the forexPairs table with 28 major, minor, and exotic pairs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const forexPairs = [
  // MAJOR PAIRS (7)
  { symbol: "EUR/USD", base: "EUR", quote: "USD", spread: 2.0, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "GBP/USD", base: "GBP", quote: "USD", spread: 2.5, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "USD/JPY", base: "USD", quote: "JPY", spread: 2.0, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "USD/CHF", base: "USD", quote: "CHF", spread: 2.5, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "AUD/USD", base: "AUD", quote: "USD", spread: 2.5, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "USD/CAD", base: "USD", quote: "CAD", spread: 2.5, minVol: 0.01, maxVol: 100, maxLev: 500 },
  { symbol: "NZD/USD", base: "NZD", quote: "USD", spread: 3.0, minVol: 0.01, maxVol: 100, maxLev: 500 },

  // MINOR PAIRS (14)
  { symbol: "EUR/GBP", base: "EUR", quote: "GBP", spread: 3.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "EUR/AUD", base: "EUR", quote: "AUD", spread: 3.5, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "EUR/CAD", base: "EUR", quote: "CAD", spread: 3.5, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "EUR/CHF", base: "EUR", quote: "CHF", spread: 3.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "EUR/JPY", base: "EUR", quote: "JPY", spread: 3.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "EUR/NZD", base: "EUR", quote: "NZD", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "GBP/JPY", base: "GBP", quote: "JPY", spread: 3.5, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "GBP/CHF", base: "GBP", quote: "CHF", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "GBP/AUD", base: "GBP", quote: "AUD", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "GBP/CAD", base: "GBP", quote: "CAD", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "GBP/NZD", base: "GBP", quote: "NZD", spread: 4.5, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "AUD/JPY", base: "AUD", quote: "JPY", spread: 3.5, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "AUD/CAD", base: "AUD", quote: "CAD", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },
  { symbol: "AUD/NZD", base: "AUD", quote: "NZD", spread: 4.0, minVol: 0.01, maxVol: 100, maxLev: 400 },

  // EXOTIC PAIRS (7)
  { symbol: "USD/TRY", base: "USD", quote: "TRY", spread: 15.0, minVol: 0.01, maxVol: 50, maxLev: 100 },
  { symbol: "USD/ZAR", base: "USD", quote: "ZAR", spread: 12.0, minVol: 0.01, maxVol: 50, maxLev: 100 },
  { symbol: "USD/MXN", base: "USD", quote: "MXN", spread: 10.0, minVol: 0.01, maxVol: 50, maxLev: 100 },
  { symbol: "USD/SGD", base: "USD", quote: "SGD", spread: 5.0, minVol: 0.01, maxVol: 50, maxLev: 200 },
  { symbol: "USD/HKD", base: "USD", quote: "HKD", spread: 4.0, minVol: 0.01, maxVol: 50, maxLev: 200 },
  { symbol: "USD/NOK", base: "USD", quote: "NOK", spread: 6.0, minVol: 0.01, maxVol: 50, maxLev: 200 },
  { symbol: "USD/SEK", base: "USD", quote: "SEK", spread: 6.0, minVol: 0.01, maxVol: 50, maxLev: 200 },
];

async function seedForexPairs() {
  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    console.log("Connected to database");

    // Clear existing pairs
    await connection.execute("DELETE FROM forexPairs");
    console.log("Cleared existing forex pairs");

    // Insert pairs
    for (const pair of forexPairs) {
      await connection.execute(
        `INSERT INTO forexPairs (symbol, baseCurrency, quoteCurrency, spread, minVolume, maxVolume, maxLeverage, enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pair.symbol, pair.base, pair.quote, pair.spread, pair.minVol, pair.maxVol, pair.maxLev, true]
      );
    }

    console.log(`✅ Successfully seeded ${forexPairs.length} forex pairs`);
    console.log("\nPairs by category:");
    console.log("- Major pairs: 7");
    console.log("- Minor pairs: 14");
    console.log("- Exotic pairs: 7");
    console.log("- Total: 28 pairs");

  } catch (error) {
    console.error("Error seeding forex pairs:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedForexPairs();
