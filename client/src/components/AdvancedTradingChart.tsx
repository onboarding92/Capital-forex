import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface AdvancedTradingChartProps {
  pair: string;
  currentPrice?: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type Indicator = "RSI" | "MACD" | "BB" | "EMA" | "SMA";

export default function AdvancedTradingChart({ pair, currentPrice }: AdvancedTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>([]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "transparent" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Generate sample data (in production, fetch from API)
    const sampleData = generateSampleCandlestickData(currentPrice || 50000, 100);
    candlestickSeries.setData(sampleData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [currentPrice]);

  // Toggle indicator
  const toggleIndicator = (indicator: Indicator) => {
    setActiveIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    );
  };

  // Apply indicators (simplified for demo)
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    // In production, calculate and render actual indicators
    // For now, just log the active indicators
    console.log("Active indicators:", activeIndicators);
  }, [activeIndicators]);

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Advanced Chart - {pair}
            </CardTitle>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">${currentPrice.toLocaleString()}</span>
                <Badge variant="outline" className="text-green-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +2.5%
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe Selector */}
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 min</SelectItem>
                <SelectItem value="5m">5 min</SelectItem>
                <SelectItem value="15m">15 min</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="1d">1 day</SelectItem>
              </SelectContent>
            </Select>

            {/* Technical Indicators */}
            <div className="flex gap-1">
              {(["RSI", "MACD", "BB", "EMA", "SMA"] as Indicator[]).map((indicator) => (
                <Button
                  key={indicator}
                  variant={activeIndicators.includes(indicator) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleIndicator(indicator)}
                >
                  {indicator}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div ref={chartContainerRef} className="w-full" />

        {/* Indicator Descriptions */}
        {activeIndicators.length > 0 && (
          <div className="mt-4 space-y-2">
            {activeIndicators.includes("RSI") && (
              <div className="text-sm text-muted-foreground">
                <strong>RSI (Relative Strength Index):</strong> Measures momentum, values above 70 indicate overbought, below 30 oversold.
              </div>
            )}
            {activeIndicators.includes("MACD") && (
              <div className="text-sm text-muted-foreground">
                <strong>MACD (Moving Average Convergence Divergence):</strong> Shows relationship between two moving averages, signals trend changes.
              </div>
            )}
            {activeIndicators.includes("BB") && (
              <div className="text-sm text-muted-foreground">
                <strong>Bollinger Bands:</strong> Volatility indicator with upper and lower bands around moving average.
              </div>
            )}
            {activeIndicators.includes("EMA") && (
              <div className="text-sm text-muted-foreground">
                <strong>EMA (Exponential Moving Average):</strong> Weighted moving average giving more importance to recent prices.
              </div>
            )}
            {activeIndicators.includes("SMA") && (
              <div className="text-sm text-muted-foreground">
                <strong>SMA (Simple Moving Average):</strong> Average price over specified period, smooths price data.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Generate sample candlestick data for demonstration
 * In production, fetch real historical data from API
 */
function generateSampleCandlestickData(basePrice: number, count: number): CandlestickData<Time>[] {
  const data: CandlestickData<Time>[] = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = 15 * 60; // 15 minutes

  let currentPrice = basePrice;

  for (let i = count; i >= 0; i--) {
    const time = (now - i * interval) as Time;
    
    // Random price movement
    const change = (Math.random() - 0.5) * (basePrice * 0.02); // ±1% change
    currentPrice += change;

    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * (basePrice * 0.01);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.005);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.005);

    data.push({
      time,
      open,
      high,
      low,
      close,
    });
  }

  return data;
}
