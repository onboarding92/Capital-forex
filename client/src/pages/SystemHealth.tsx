import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { AlertCircle, CheckCircle, XCircle, Clock, Activity, Database, Zap, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import DashboardLayout from "../components/DashboardLayout";

export default function SystemHealth() {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  
  const { data: healthData, isLoading, refetch, isFetching } = trpc.admin.systemHealth.useQuery({ timeRange });
  const { data: errors } = trpc.admin.recentErrors.useQuery({ limit: 10 });
  const { data: alerts } = trpc.admin.activeAlerts.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, apiStats, exchangeStats, systemStatus } = healthData || {};

  // Helper function to get status color
  const getStatusColor = (isHealthy: boolean) => isHealthy ? "text-green-500" : "text-red-500";
  const getStatusBgColor = (isHealthy: boolean) => isHealthy ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950";
  
  // Helper function to get performance color
  const getPerformanceColor = (value: number, thresholds: { good: number; medium: number }) => {
    if (value < thresholds.good) return "text-green-500";
    if (value < thresholds.medium) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-end gap-2">
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="icon"
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Active Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {alert.alertType.replace(/_/g, " ").toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">{alert.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap self-start sm:self-center ${
                    alert.severity === "critical" ? "bg-red-500 text-white" :
                    alert.severity === "high" ? "bg-orange-500 text-white" :
                    alert.severity === "medium" ? "bg-yellow-500 text-white" :
                    "bg-blue-500 text-white"
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={systemStatus?.isHealthy ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {systemStatus?.isHealthy ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div className={`text-2xl font-bold ${getStatusColor(systemStatus?.isHealthy || false)}`}>
                {systemStatus?.isHealthy ? "Healthy" : "Degraded"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">
                Uptime: {systemStatus?.uptime || "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics?.avgResponseTime || 0, { good: 200, medium: 500 })}`}>
              {metrics?.avgResponseTime || 0}ms
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(metrics?.avgResponseTime ?? 0) < 200 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Excellent</p>
                </>
              ) : (metrics?.avgResponseTime ?? 0) < 500 ? (
                <>
                  <Activity className="h-3 w-3 text-yellow-500" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Good</p>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Slow</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(Number(metrics?.errorRate) || 0, { good: 1, medium: 5 })}`}>
              {metrics?.errorRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.totalErrors || 0} errors in {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card className={metrics?.dbHealthy ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {metrics?.dbHealthy ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div className={`text-2xl font-bold ${getStatusColor(metrics?.dbHealthy || false)}`}>
                {metrics?.dbHealthy ? "Connected" : "Disconnected"}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Avg query: {metrics?.avgDbQueryTime || 0}ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            API Response Times
          </CardTitle>
          <CardDescription>Average and maximum response time over {timeRange}</CardDescription>
        </CardHeader>
        <CardContent>
          {apiStats?.responseTimeData && apiStats.responseTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={apiStats.responseTimeData}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff7300" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  label={{ value: "ms", angle: -90, position: "insideLeft" }}
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="avgResponseTime" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorAvg)" 
                  name="Avg Response Time" 
                />
                <Area 
                  type="monotone" 
                  dataKey="maxResponseTime" 
                  stroke="#ff7300" 
                  fillOpacity={1} 
                  fill="url(#colorMax)" 
                  name="Max Response Time" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Activity className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No response time data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Request Stats & Exchange Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Requests</CardTitle>
            <CardDescription>Request volume over {timeRange}</CardDescription>
          </CardHeader>
          <CardContent>
            {apiStats?.requestData && apiStats.requestData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={apiStats.requestData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#8884d8" name="Total Requests" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="errors" fill="#ff7300" name="Errors" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <BarChart className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No request data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchange API Health</CardTitle>
            <CardDescription>External API call success rate</CardDescription>
          </CardHeader>
          <CardContent>
            {exchangeStats && exchangeStats.length > 0 ? (
              <div className="space-y-4">
                {exchangeStats.map((exchange: any) => (
                  <div key={exchange.exchange} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{exchange.exchange}</span>
                      <span className={`text-sm font-medium ${
                        exchange.successRate >= 95 ? "text-green-600 dark:text-green-400" :
                        exchange.successRate >= 80 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        {exchange.successRate}% success
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          exchange.successRate >= 95 ? "bg-green-500" :
                          exchange.successRate >= 80 ? "bg-yellow-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${exchange.successRate}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{exchange.totalCalls} calls</span>
                      <span>Avg: {Number(exchange.avgDuration)}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Database className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No exchange API data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recent Errors
          </CardTitle>
          <CardDescription>Last 10 errors logged in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {errors && errors.length > 0 ? (
            <div className="space-y-2">
              {errors.map((error: any) => (
                <div
                  key={error.id}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{error.errorType}</div>
                      <div className="text-sm text-muted-foreground mt-1 break-words">{error.message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(error.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap self-start ${
                      error.severity === "critical" ? "bg-red-500 text-white" :
                      error.severity === "high" ? "bg-orange-500 text-white" :
                      error.severity === "medium" ? "bg-yellow-500 text-white" :
                      "bg-blue-500 text-white"
                    }`}>
                      {error.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2 text-green-500 opacity-50" />
              <p className="text-sm font-medium">No errors logged recently</p>
              <p className="text-xs mt-1">System is running smoothly</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
