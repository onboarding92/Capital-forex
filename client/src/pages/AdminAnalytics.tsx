import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Users, TrendingUp, DollarSign, Activity, BarChart3, 
  Calendar, ArrowUpRight, ArrowDownRight, Download, FileText 
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/analyticsExport";
import { toast } from "sonner";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { data: analytics, isLoading } = trpc.admin.analytics.useQuery({ timeRange });

  const handleExportCSV = () => {
    if (!analytics) {
      toast.error("No data to export");
      return;
    }
    
    const exportData = {
      summary: {
        totalUsers: analytics.summary.totalUsers,
        activeUsers: analytics.summary.activeUsers,
        tradingVolume: analytics.summary.totalVolume,
        revenue: analytics.summary.totalFees,
      },
      dailyData: analytics.charts.dailyVolume.map((item, idx) => ({
        date: item.date,
        volume: item.volume,
        trades: analytics.charts.dailyTrades[idx]?.trades || 0,
        revenue: analytics.charts.dailyFees[idx]?.fees || 0,
        registrations: analytics.charts.dailyRegistrations[idx]?.registrations || 0,
      })),
      topPairs: analytics.charts.topPairs,
      systemHealth: {
        uptime: 99.9,
        errors: analytics.summary.errorCount,
        avgResponseTime: 150,
      },
    };
    
    exportToCSV(exportData, timeRange);
    toast.success("Analytics exported to CSV");
  };

  const handleExportPDF = () => {
    if (!analytics) {
      toast.error("No data to export");
      return;
    }
    
    const exportData = {
      summary: {
        totalUsers: analytics.summary.totalUsers,
        activeUsers: analytics.summary.activeUsers,
        tradingVolume: analytics.summary.totalVolume,
        revenue: analytics.summary.totalFees,
      },
      dailyData: analytics.charts.dailyVolume.map((item, idx) => ({
        date: item.date,
        volume: item.volume,
        trades: analytics.charts.dailyTrades[idx]?.trades || 0,
        revenue: analytics.charts.dailyFees[idx]?.fees || 0,
        registrations: analytics.charts.dailyRegistrations[idx]?.registrations || 0,
      })),
      topPairs: analytics.charts.topPairs,
      systemHealth: {
        uptime: 99.9,
        errors: analytics.summary.errorCount,
        avgResponseTime: 150,
      },
    };
    
    exportToPDF(exportData, timeRange);
    toast.success("Opening PDF export...");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const summary = analytics?.summary ?? {
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    totalVolume: 0,
    totalTrades: 0,
    totalFees: 0,
    errorCount: 0,
  };

  const charts = analytics?.charts ?? {
    dailyVolume: [],
    dailyTrades: [],
    dailyFees: [],
    dailyRegistrations: [],
    topPairs: [],
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive platform metrics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{summary.newUsers} new users
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{summary.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((summary.activeUsers / summary.totalUsers) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trading Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                ${summary.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalTrades.toLocaleString()} trades
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue (Fees)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                ${summary.totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Trading fees collected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trading Volume Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Trading Volume
              </CardTitle>
              <CardDescription>Daily trading volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <YAxis 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" name="Volume ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Trades Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Trades
              </CardTitle>
              <CardDescription>Number of trades executed per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.dailyTrades}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <YAxis 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Trades"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Daily Revenue
              </CardTitle>
              <CardDescription>Trading fees collected per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.dailyFees}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <YAxis 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Fees ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Registrations Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Registrations
              </CardTitle>
              <CardDescription>New user signups per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.dailyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <YAxis 
                    stroke="#888"
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" name="New Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Trading Pairs */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Trading Pairs
            </CardTitle>
            <CardDescription>Most traded pairs by volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charts.topPairs.map((pair, index) => (
                <div key={pair.pair} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{pair.pair}</div>
                      <div className="text-sm text-muted-foreground">{pair.trades} trades</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${pair.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-sm text-muted-foreground">Volume</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="glass border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Platform performance and error tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ArrowUpRight className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="text-xl font-bold">99.9%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ArrowDownRight className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                  <div className="text-xl font-bold">{summary.errorCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                  <div className="text-xl font-bold">125ms</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
