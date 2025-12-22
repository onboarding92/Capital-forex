import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";

interface TradingChartProps {
  pair: string;
  currentPrice?: number;
}

export default function TradingChart({ pair, currentPrice }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
      timeScale: {
        borderColor: "#1f2937",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Generate mock historical data (last 100 candles)
    const generateMockData = (basePrice: number) => {
      const data = [];
      const now = Date.now() / 1000;
      let price = basePrice;

      for (let i = 100; i >= 0; i--) {
        const time = now - i * 300; // 5-minute candles
        const open = price;
        const volatility = price * 0.002; // 0.2% volatility
        const change = (Math.random() - 0.5) * volatility * 2;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;

        data.push({
          time: Math.floor(time) as any,
          open,
          high,
          low,
          close,
        });

        price = close;
      }

      return data;
    };

    // Set initial data
    const basePrice = currentPrice || 50000;
    const mockData = generateMockData(basePrice);
    candlestickSeries.setData(mockData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [pair]);

  // Update chart when price changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice) return;

    // Add new candle with current price
    const now = Math.floor(Date.now() / 1000);
    const lastCandle = {
      time: now as any,
      open: currentPrice,
      high: currentPrice * 1.001,
      low: currentPrice * 0.999,
      close: currentPrice,
    };

    candlestickSeriesRef.current.update(lastCandle);
  }, [currentPrice]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{pair} Chart</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80">1m</button>
          <button className="px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground">5m</button>
          <button className="px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80">15m</button>
          <button className="px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80">1h</button>
          <button className="px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80">4h</button>
          <button className="px-3 py-1 text-sm rounded-md bg-muted hover:bg-muted/80">1d</button>
        </div>
      </div>
      <div ref={chartContainerRef} className="rounded-lg border border-border bg-card" />
    </div>
  );
}
