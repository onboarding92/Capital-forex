/**
 * Advanced Analytics Dashboard
 * 
 * Features:
 * - PnL tracking chart (daily/weekly/monthly)
 * - Win rate trends chart
 * - Position history table with filters
 * - Portfolio performance chart
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Award } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdvancedAnalytics() {
  const [pnlPeriod, setPnlPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [winRatePeriod, setWinRatePeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [portfolioPeriod, setPortfolioPeriod] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [positionFilter, setPositionFilter] = useState<"all" | "open" | "filled" | "cancelled">("all");

  // Fetch analytics data
  const { data: pnlData = [] } = trpc.analytics.getPnLTracking.useQuery({ period: pnlPeriod, limit: 30 });
  const { data: winRateData = [] } = trpc.analytics.getWinRateTrends.useQuery({ period: winRatePeriod, limit: 12 });
  const { data: positions = [] } = trpc.analytics.getPositionHistory.useQuery({ status: positionFilter, limit: 50 });
  const { data: portfolio } = trpc.analytics.getPortfolioPerformance.useQuery({ period: portfolioPeriod });
  const { data: stats } = trpc.analytics.getTradingStats.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">Comprehensive trading performance analysis</p>
        </div>

        {/* Trading Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalTrades || 0} trades executed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated PnL</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${parseFloat(stats?.estimatedPnL || "0") >= 0 ? "text-green-500" : "text-red-500"}`}>
                {parseFloat(stats?.estimatedPnL || "0") >= 0 ? "+" : ""}{stats?.estimatedPnL || "0"} USDT
              </div>
              <p className="text-xs text-muted-foreground">
                Buy: {stats?.buyVolume || "0"} | Sell: {stats?.sellVolume || "0"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.winRate || "0"}%</div>
              <p className="text-xs text-muted-foreground">
                Sell ratio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Size</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgOrderSize || "0"}</div>
              <p className="text-xs text-muted-foreground">
                USDT per order
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="pnl" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pnl">PnL Tracking</TabsTrigger>
            <TabsTrigger value="winrate">Win Rate Trends</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio Performance</TabsTrigger>
            <TabsTrigger value="positions">Position History</TabsTrigger>
          </TabsList>

          {/* PnL Tracking Chart */}
          <TabsContent value="pnl" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>PnL Tracking</CardTitle>
                    <CardDescription>Trading volume over time</CardDescription>
                  </div>
                  <Select value={pnlPeriod} onValueChange={(value: any) => setPnlPeriod(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={pnlData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="volume" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Volume (USDT)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Win Rate Trends Chart */}
          <TabsContent value="winrate" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Win Rate Trends</CardTitle>
                    <CardDescription>Success rate over time</CardDescription>
                  </div>
                  <Select value={winRatePeriod} onValueChange={(value: any) => setWinRatePeriod(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={winRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} name="Win Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Performance */}
          <TabsContent value="portfolio" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Portfolio Metrics</CardTitle>
                      <CardDescription>Overall performance</CardDescription>
                    </div>
                    <Select value={portfolioPeriod} onValueChange={(value: any) => setPortfolioPeriod(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                        <SelectItem value="90d">90 Days</SelectItem>
                        <SelectItem value="1y">1 Year</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">{portfolio?.totalValue || "0"} USDT</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated PnL</p>
                    <p className={`text-2xl font-bold ${parseFloat(portfolio?.estimatedPnL || "0") >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {parseFloat(portfolio?.estimatedPnL || "0") >= 0 ? "+" : ""}{portfolio?.estimatedPnL || "0"} USDT
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className={`text-2xl font-bold ${parseFloat(portfolio?.roi || "0") >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {parseFloat(portfolio?.roi || "0") >= 0 ? "+" : ""}{portfolio?.roi || "0"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{portfolio?.totalOrders || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>Portfolio distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={portfolio?.assetAllocation || []}
                        dataKey="percentage"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.asset} (${entry.percentage}%)`}
                      >
                        {(portfolio?.assetAllocation || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Position History Table */}
          <TabsContent value="positions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Position History</CardTitle>
                    <CardDescription>All your trading positions</CardDescription>
                  </div>
                  <Select value={positionFilter} onValueChange={(value: any) => setPositionFilter(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="filled">Filled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No positions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      positions.map((position: any) => (
                        <TableRow key={position.id}>
                          <TableCell>{new Date(position.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{position.pair}</TableCell>
                          <TableCell>
                            <Badge variant={position.side === "buy" ? "default" : "destructive"}>
                              {position.side.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{parseFloat(position.price).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(position.amount).toFixed(4)}</TableCell>
                          <TableCell>{parseFloat(position.filledAmount || "0").toFixed(4)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              position.status === "filled" ? "default" :
                              position.status === "open" ? "secondary" :
                              "outline"
                            }>
                              {position.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
