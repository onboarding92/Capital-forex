import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Activity,
  RefreshCw,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading, refetch } = trpc.admin.dashboardStats.useQuery({ timeRange: "30d" });
  const { data: matchingEngineStatus } = trpc.admin.matchingEngineStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <Card className="bg-slate-800/90 border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );

  const AlertCard = ({ title, count, action, actionText, color }: any) => (
    <Card className="bg-slate-800/90 border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${color}`}>
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">{title}</p>
            <p className="text-slate-400 text-sm">{count} pending</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={action}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {actionText}
        </Button>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time exchange statistics and alerts</p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() ?? "0"}
            icon={Users}
            color="bg-blue-600"
            subtitle={`${stats?.activeUsers ?? 0} active (7 days)`}
          />
          <StatCard
            title="Daily Volume"
            value={`$${parseFloat(stats?.dailyVolume ?? "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="bg-green-600"
            subtitle="Last 24 hours"
          />
          <StatCard
            title="Weekly Volume"
            value={`$${parseFloat(stats?.weeklyVolume ?? "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={Activity}
            color="bg-purple-600"
            subtitle="Last 7 days"
          />
          <StatCard
            title="Monthly Volume"
            value={`$${parseFloat(stats?.monthlyVolume ?? "0").toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="bg-orange-600"
            subtitle="Last 30 days"
          />
        </div>

        {/* Matching Engine Status */}
        <Card className="bg-slate-800/90 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Matching Engine Status
            </h3>
            <div className="flex items-center gap-2">
              {matchingEngineStatus?.isRunning ? (
                <span className="flex items-center gap-2 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Running
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-400 text-sm">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  Stopped
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Pending Orders
              </div>
              <p className="text-2xl font-bold text-white">
                {matchingEngineStatus?.stats?.pendingOrders ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <BarChart3 className="w-4 h-4" />
                Total Trades
              </div>
              <p className="text-2xl font-bold text-white">
                {matchingEngineStatus?.stats?.totalTrades?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Last 24h Trades
              </div>
              <p className="text-2xl font-bold text-white">
                {matchingEngineStatus?.stats?.last24hTrades?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Matching interval: {matchingEngineStatus?.interval ? `${matchingEngineStatus.interval}ms` : 'N/A'}
          </div>
        </Card>

        {/* Alerts */}
        {(stats?.pendingWithdrawals ?? 0) > 0 || (stats?.pendingKyc ?? 0) > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Pending Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(stats?.pendingWithdrawals ?? 0) > 0 && (
                <AlertCard
                  title="Pending Withdrawals"
                  count={stats?.pendingWithdrawals}
                  action={() => setLocation("/admin/panel")}
                  actionText="Review"
                  color="bg-yellow-600"
                />
              )}
              {(stats?.pendingKyc ?? 0) > 0 && (
                <AlertCard
                  title="Pending KYC Verifications"
                  count={stats?.pendingKyc}
                  action={() => setLocation("/admin/panel")}
                  actionText="Review"
                  color="bg-orange-600"
                />
              )}
            </div>
          </div>
        ) : (
          <Card className="bg-slate-800/90 border-slate-700 p-6">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">All Clear!</p>
                <p className="text-slate-400 text-sm">No pending actions at the moment</p>
              </div>
            </div>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card className="bg-slate-800/90 border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">User Growth (30 Days)</h3>
            {stats?.userGrowth && stats.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                No user growth data available
              </div>
            )}
          </Card>

          {/* Volume Chart */}
          <Card className="bg-slate-800/90 border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trading Volume (30 Days)</h3>
            {stats?.volumeChart && stats.volumeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.volumeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                No volume data available
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-800/90 border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              onClick={() => setLocation("/admin/users")}
              className="bg-slate-700 hover:bg-slate-600 h-20 flex-col gap-2"
            >
              <Users className="w-5 h-5" />
              <span>Manage Users</span>
            </Button>
            <Button
              onClick={() => setLocation("/admin/hot-wallets")}
              className="bg-slate-700 hover:bg-slate-600 h-20 flex-col gap-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>Hot Wallets</span>
            </Button>
            <Button
              onClick={() => setLocation("/admin/logs")}
              className="bg-slate-700 hover:bg-slate-600 h-20 flex-col gap-2"
            >
              <Activity className="w-5 h-5" />
              <span>View Logs</span>
            </Button>
            <Button
              onClick={() => setLocation("/admin/panel")}
              className="bg-slate-700 hover:bg-slate-600 h-20 flex-col gap-2"
            >
              <Clock className="w-5 h-5" />
              <span>Pending Actions</span>
            </Button>
            <Button
              onClick={() => setLocation("/admin/analytics")}
              className="bg-slate-700 hover:bg-slate-600 h-20 flex-col gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
