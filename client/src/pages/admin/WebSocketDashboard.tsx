import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Wifi, WifiOff, Send, Users, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function WebSocketDashboard() {
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"info" | "warning" | "error" | "success">("info");
  
  // Fetch WebSocket stats with auto-refresh
  const { data: wsStats, refetch } = trpc.businessMetrics.websocketStats.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const broadcastMutation = trpc.businessMetrics.broadcast.useMutation({
    onSuccess: (data) => {
      toast.success("Broadcast sent successfully", {
        description: `Sent to ${data.sentCount} connection(s)`,
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
    },
    onError: (error) => {
      toast.error("Failed to send broadcast", {
        description: error.message,
      });
    },
  });

  const handleBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    broadcastMutation.mutate({
      title: broadcastTitle,
      message: broadcastMessage,
      type: broadcastType,
    });
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WebSocket Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time connection monitoring and broadcast management
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wsStats?.stats.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users with active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wsStats?.stats.totalConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active WebSocket connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Connections/User</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wsStats?.stats.averageConnectionsPerUser || 0}</div>
            <p className="text-xs text-muted-foreground">
              Average connections per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast Form */}
      <Card>
        <CardHeader>
          <CardTitle>Broadcast Message</CardTitle>
          <CardDescription>
            Send a notification to all connected users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Notification title"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              disabled={broadcastMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Notification message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={3}
              disabled={broadcastMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={broadcastType}
              onChange={(e) => setBroadcastType(e.target.value as typeof broadcastType)}
              disabled={broadcastMutation.isPending}
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <Button
            onClick={handleBroadcast}
            className="w-full"
            disabled={broadcastMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {broadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
          </Button>
        </CardContent>
      </Card>

      {/* Active Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
          <CardDescription>
            Real-time list of all active WebSocket connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wsStats?.activeConnections && wsStats.activeConnections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Connection ID</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wsStats.activeConnections.map((conn: { userId: number; connectionId: string; connectedAt: Date; lastActivity: Date }) => (
                  <TableRow key={conn.connectionId}>
                    <TableCell className="font-medium">{conn.userId}</TableCell>
                    <TableCell className="font-mono text-xs">{conn.connectionId}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(conn.connectedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(conn.lastActivity), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Wifi className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <WifiOff className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No active connections</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
