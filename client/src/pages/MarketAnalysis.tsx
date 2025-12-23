import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Activity, BarChart3, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MarketAnalysis() {
  const [selectedPair, setSelectedPair] = useState<string>("EUR/USD");

  const { data: analysis, isLoading } = trpc.forex.getMarketAnalysis.useQuery({
    pair: selectedPair,
  });

  const { data: allAnalysis } = trpc.forex.getAllMarketAnalysis.useQuery();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "bullish": return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "bearish": return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "bullish": return "text-green-600 bg-green-100 dark:bg-green-950";
      case "bearish": return "text-red-600 bg-red-100 dark:bg-red-950";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-950";
    }
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi >= 70) return { label: "Overbought", color: "text-red-600" };
    if (rsi <= 30) return { label: "Oversold", color: "text-green-600" };
    return { label: "Neutral", color: "text-gray-600" };
  };

  const majorPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP"];

  const latestAnalysis = analysis?.[0];

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Market Analysis</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Technical analysis and market trends for major forex pairs
          </p>
        </div>

        {/* Pair Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Select Currency Pair</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {majorPairs.map((pair) => (
                  <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Detailed Analysis */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : latestAnalysis ? (
          <div className="space-y-6">
            {/* Trend Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {selectedPair} - {latestAnalysis.timeframe} Analysis
                </CardTitle>
                <CardDescription>
                  Last updated: {new Date(latestAnalysis.updatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trend & Sentiment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">Market Trend</div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(latestAnalysis.trend)}
                      <span className={`text-xl font-bold ${getTrendColor(latestAnalysis.trend)}`}>
                        {latestAnalysis.trend.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {latestAnalysis.sentiment && (
                    <div className="p-4 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-2">Market Sentiment</div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(latestAnalysis.sentiment)}
                        <span className={`text-xl font-bold ${getTrendColor(latestAnalysis.sentiment)}`}>
                          {latestAnalysis.sentiment.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Support & Resistance */}
                {(latestAnalysis.support || latestAnalysis.resistance) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {latestAnalysis.support && (
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1">Support Level</div>
                        <div className="text-2xl font-bold text-green-600">{latestAnalysis.support}</div>
                      </div>
                    )}
                    {latestAnalysis.resistance && (
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1">Resistance Level</div>
                        <div className="text-2xl font-bold text-red-600">{latestAnalysis.resistance}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Technical Indicators */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Technical Indicators</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {latestAnalysis.rsi && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
                        <div className="text-lg font-bold">{Number(latestAnalysis.rsi).toFixed(2)}</div>
                        <div className={`text-xs ${getRSIStatus(Number(latestAnalysis.rsi)).color}`}>
                          {getRSIStatus(Number(latestAnalysis.rsi)).label}
                        </div>
                      </div>
                    )}

                    {latestAnalysis.macd && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">MACD</div>
                        <div className="text-lg font-bold">{Number(latestAnalysis.macd).toFixed(5)}</div>
                        {latestAnalysis.macdSignal && (
                          <div className="text-xs text-muted-foreground">
                            Signal: {Number(latestAnalysis.macdSignal).toFixed(5)}
                          </div>
                        )}
                      </div>
                    )}

                    {latestAnalysis.ma50 && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">MA 50</div>
                        <div className="text-lg font-bold">{Number(latestAnalysis.ma50).toFixed(5)}</div>
                      </div>
                    )}

                    {latestAnalysis.ma200 && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">MA 200</div>
                        <div className="text-lg font-bold">{Number(latestAnalysis.ma200).toFixed(5)}</div>
                      </div>
                    )}

                    {latestAnalysis.volatility && (
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                        <div className="text-lg font-bold">{Number(latestAnalysis.volatility).toFixed(2)}%</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis Text */}
                {latestAnalysis.analysis && (
                  <div className="p-4 rounded-lg bg-muted">
                    <h3 className="font-semibold mb-2">Market Commentary</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {latestAnalysis.analysis}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No analysis available for {selectedPair} yet
              </p>
            </CardContent>
          </Card>
        )}

        {/* All Pairs Overview */}
        {allAnalysis && allAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                All Pairs Overview
              </CardTitle>
              <CardDescription>
                Latest market trends across major forex pairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allAnalysis.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setSelectedPair(item.pair)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold">{item.pair}</div>
                      <Badge variant="secondary" className="text-xs">{item.timeframe}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(item.trend)}
                      <span className={`text-sm font-medium ${getTrendColor(item.trend)}`}>
                        {item.trend}
                      </span>
                    </div>
                    {item.rsi && (
                      <div className="text-xs text-muted-foreground mt-2">
                        RSI: {Number(item.rsi).toFixed(1)} - {getRSIStatus(Number(item.rsi)).label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
