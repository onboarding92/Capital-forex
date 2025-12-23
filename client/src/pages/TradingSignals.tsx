import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Award, BarChart3, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function TradingSignals() {
  const [pairFilter, setPairFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed" | "expired">("active");

  const { data: signals, isLoading } = trpc.forex.getTradingSignals.useQuery({
    pair: pairFilter === "all" ? undefined : pairFilter,
    status: statusFilter,
    limit: 50,
  });

  const { data: performance } = trpc.forex.getSignalPerformance.useQuery();

  const getSignalTypeColor = (type: string) => {
    switch (type) {
      case "buy": return "bg-green-600 text-white";
      case "sell": return "bg-red-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const getSignalTypeIcon = (type: string) => {
    switch (type) {
      case "buy": return <TrendingUp className="h-4 w-4" />;
      case "sell": return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong": return "text-green-600";
      case "moderate": return "text-yellow-600";
      case "weak": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const majorPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD"];

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Trading Signals</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Professional forex signals based on technical analysis
          </p>
        </div>

        {/* Performance Stats */}
        {performance && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm text-muted-foreground">Total Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{performance.totalSignals}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-green-600">{performance.winRate}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm text-muted-foreground">Total Pips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl md:text-2xl font-bold ${performance.totalPips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.totalPips >= 0 ? '+' : ''}{performance.totalPips.toFixed(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm text-muted-foreground">Avg Pips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl md:text-2xl font-bold ${performance.avgPips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.avgPips >= 0 ? '+' : ''}{performance.avgPips.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm text-muted-foreground">Profitable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-green-600">{performance.profitableSignals}</div>
                <div className="text-xs text-muted-foreground">/ {performance.losingSignals} losses</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency Pair</label>
                <Select value={pairFilter} onValueChange={setPairFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pairs</SelectItem>
                    {majorPairs.map((pair) => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Signals</SelectItem>
                    <SelectItem value="closed">Closed Signals</SelectItem>
                    <SelectItem value="expired">Expired Signals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signals List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {statusFilter === "active" ? "Active" : statusFilter === "closed" ? "Closed" : "Expired"} Signals
            </CardTitle>
            <CardDescription>
              Professional trading signals with entry, stop loss, and take profit levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : signals && signals.length > 0 ? (
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getSignalTypeColor(signal.signalType)}>
                            {getSignalTypeIcon(signal.signalType)}
                            <span className="ml-1">{signal.signalType.toUpperCase()}</span>
                          </Badge>
                          <span className="text-lg font-bold">{signal.pair}</span>
                          <Badge variant="outline" className={getStrengthColor(signal.strength)}>
                            {signal.strength}
                          </Badge>
                          <Badge variant="secondary">{signal.timeframe}</Badge>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {format(new Date(signal.createdAt), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>

                      {/* Description */}
                      {signal.description && (
                        <p className="text-sm text-muted-foreground">{signal.description}</p>
                      )}

                      {/* Price Levels */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Entry:</span>
                          <span className="ml-2 font-bold">{signal.entryPrice}</span>
                        </div>
                        {signal.stopLoss && (
                          <div>
                            <span className="text-muted-foreground">Stop Loss:</span>
                            <span className="ml-2 font-bold text-red-600">{signal.stopLoss}</span>
                          </div>
                        )}
                        {signal.takeProfit && (
                          <div>
                            <span className="text-muted-foreground">Take Profit:</span>
                            <span className="ml-2 font-bold text-green-600">{signal.takeProfit}</span>
                          </div>
                        )}
                        {signal.pips !== null && signal.status === "closed" && (
                          <div>
                            <span className="text-muted-foreground">Result:</span>
                            <span className={`ml-2 font-bold ${Number(signal.pips) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Number(signal.pips) >= 0 ? '+' : ''}{Number(signal.pips).toFixed(1)} pips
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      {signal.status !== "active" && (
                        <div className="flex items-center gap-2">
                          <Badge variant={signal.result === "profit" ? "default" : signal.result === "loss" ? "destructive" : "secondary"}>
                            {signal.status.toUpperCase()} - {signal.result?.toUpperCase()}
                          </Badge>
                          {signal.closedAt && (
                            <span className="text-xs text-muted-foreground">
                              Closed: {format(new Date(signal.closedAt), "MMM dd, HH:mm")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No signals found for the selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Trading Signals Disclaimer</p>
                <p className="text-xs text-muted-foreground">
                  Trading signals are for educational purposes only. Past performance does not guarantee future results. Always use proper risk management and only trade with capital you can afford to lose.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
