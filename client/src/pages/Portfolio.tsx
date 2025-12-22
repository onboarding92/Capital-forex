import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, Lock, DollarSign, ArrowUpRight, PlusCircle } from "lucide-react";
import { PortfolioChart } from "@/components/PortfolioChart";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";

export default function Portfolio() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: summaryLoading } = trpc.portfolio.summary.useQuery();
  const { data: profitLoss, isLoading: plLoading } = trpc.portfolio.profitLoss.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.portfolio.history.useQuery();

  const isProfit = (profitLoss?.unrealizedPL || 0) >= 0;

  if (summaryLoading || plLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button onClick={() => setLocation("/deposit")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Funds
          </Button>
          <Button onClick={() => setLocation("/trading")} variant="outline" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Start Trading
          </Button>
        </div>

        {/* Summary Cards with Enhanced Design */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${summary?.totalValue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current market value
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${summary?.availableValue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to trade
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locked in Orders</CardTitle>
              <Lock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${summary?.lockedValue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In orders & staking
              </p>
            </CardContent>
          </Card>

          <Card className={`card-hover border-2 ${isProfit ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit/Loss</CardTitle>
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${isProfit ? "text-green-500" : "text-red-500"}`}>
                {isProfit ? "+" : ""}${profitLoss?.unrealizedPL.toFixed(2) || "0.00"}
              </div>
              <p className={`text-sm font-semibold mt-1 ${isProfit ? "text-green-600" : "text-red-600"}`}>
                {isProfit ? "+" : ""}{profitLoss?.plPercentage.toFixed(2) || "0.00"}% ROI
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Value Chart with Enhanced Design */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Portfolio Performance</CardTitle>
                <CardDescription>30-day value trend and growth analysis</CardDescription>
              </div>
              {isProfit && (
                <div className="flex items-center gap-2 text-green-500 font-semibold">
                  <TrendingUp className="h-5 w-5" />
                  <span>Growing</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : history && history.length > 0 ? (
              <PortfolioChart data={history} />
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-center">
                <DollarSign className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg font-medium">No historical data yet</p>
                <p className="text-sm text-muted-foreground mt-2">Start trading to see your portfolio growth</p>
                <Button onClick={() => setLocation("/deposit")} className="mt-4">
                  Make Your First Deposit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Assets Breakdown with Enhanced Design */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-xl">Asset Allocation</CardTitle>
              <CardDescription>Your crypto holdings breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.assets && summary.assets.length > 0 ? (
                  summary.assets.map(asset => {
                    const percentage = summary.totalValue > 0 
                      ? (asset.value / summary.totalValue) * 100 
                      : 0;
                    
                    return (
                      <div key={asset.asset} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-lg">{asset.asset}</div>
                            <div className="text-sm text-muted-foreground">
                              {parseFloat(asset.balance).toFixed(8)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">${asset.value.toFixed(2)}</div>
                            <div className="text-sm font-semibold text-primary">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300 group-hover:bg-primary/80"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">No assets yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Start building your crypto portfolio today</p>
                    <Button onClick={() => setLocation("/deposit")} className="gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Make First Deposit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* P&L Details with Enhanced Design */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-xl">Investment Summary</CardTitle>
              <CardDescription>Detailed profit & loss breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">Total Deposits</span>
                  <span className="font-bold text-lg">${parseFloat(profitLoss?.totalDeposits || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">Total Withdrawals</span>
                  <span className="font-bold text-lg">${parseFloat(profitLoss?.totalWithdrawals || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">Current Value</span>
                  <span className="font-bold text-lg text-primary">${profitLoss?.currentValue.toFixed(2) || "0.00"}</span>
                </div>
                <div className={`border-2 rounded-lg p-4 ${isProfit ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Unrealized P&L</span>
                    <span className={`font-bold text-2xl ${isProfit ? "text-green-500" : "text-red-500"}`}>
                      {isProfit ? "+" : ""}${profitLoss?.unrealizedPL.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Return on Investment</span>
                    <span className={`font-bold text-lg ${isProfit ? "text-green-500" : "text-red-500"}`}>
                      {isProfit ? "+" : ""}{profitLoss?.plPercentage.toFixed(2) || "0.00"}%
                    </span>
                  </div>
                </div>
                
                {isProfit && profitLoss && profitLoss.unrealizedPL > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-2">💰 Great Performance!</p>
                    <p className="text-xs text-muted-foreground">
                      Your portfolio is up {profitLoss.plPercentage.toFixed(2)}%. Keep investing to maximize your returns!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
