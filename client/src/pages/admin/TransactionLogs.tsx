import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, RefreshCw, Download, Search } from "lucide-react";

export default function TransactionLogs() {
  const [logType, setLogType] = useState<"all" | "deposits" | "withdrawals" | "trades" | "logins">("all");
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch } = trpc.admin.transactionLogs.useQuery({
    type: logType,
    userId: userId ? parseInt(userId) : undefined,
    limit,
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === "string" && val.includes(",") ? `"${val}"` : val
      ).join(",")
    );
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Transaction Logs</h1>
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

        <Card className="bg-slate-800/90 border-slate-700 p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Filter by User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
                <SelectItem value="500">500 rows</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          <Tabs value={logType} onValueChange={(v: any) => setLogType(v)}>
            <TabsList className="bg-slate-700">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="logins">Logins</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {isLoading ? (
                <div className="text-center text-slate-400 py-8">Loading...</div>
              ) : (
                <>
                  {logs?.deposits && logs.deposits.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Recent Deposits</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToCSV(logs.deposits, "deposits")}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">ID</TableHead>
                            <TableHead className="text-slate-300">User ID</TableHead>
                            <TableHead className="text-slate-300">Asset</TableHead>
                            <TableHead className="text-slate-300">Amount</TableHead>
                            <TableHead className="text-slate-300">Network</TableHead>
                            <TableHead className="text-slate-300">Status</TableHead>
                            <TableHead className="text-slate-300">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.deposits.slice(0, 10).map((deposit: any) => (
                            <TableRow key={deposit.id} className="border-slate-700">
                              <TableCell className="text-white">{deposit.id}</TableCell>
                              <TableCell className="text-white">{deposit.userId}</TableCell>
                              <TableCell className="text-white font-semibold">{deposit.asset}</TableCell>
                              <TableCell className="text-green-400 font-semibold">
                                +{parseFloat(deposit.amount).toFixed(8)}
                              </TableCell>
                              <TableCell className="text-slate-300">{deposit.network || "N/A"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  deposit.status === "completed" 
                                    ? "bg-green-900/50 text-green-300"
                                    : deposit.status === "pending"
                                    ? "bg-yellow-900/50 text-yellow-300"
                                    : "bg-red-900/50 text-red-300"
                                }`}>
                                  {deposit.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {new Date(deposit.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {logs?.withdrawals && logs.withdrawals.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Recent Withdrawals</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToCSV(logs.withdrawals, "withdrawals")}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">ID</TableHead>
                            <TableHead className="text-slate-300">User ID</TableHead>
                            <TableHead className="text-slate-300">Asset</TableHead>
                            <TableHead className="text-slate-300">Amount</TableHead>
                            <TableHead className="text-slate-300">Network</TableHead>
                            <TableHead className="text-slate-300">Status</TableHead>
                            <TableHead className="text-slate-300">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.withdrawals.slice(0, 10).map((withdrawal: any) => (
                            <TableRow key={withdrawal.id} className="border-slate-700">
                              <TableCell className="text-white">{withdrawal.id}</TableCell>
                              <TableCell className="text-white">{withdrawal.userId}</TableCell>
                              <TableCell className="text-white font-semibold">{withdrawal.asset}</TableCell>
                              <TableCell className="text-red-400 font-semibold">
                                -{parseFloat(withdrawal.amount).toFixed(8)}
                              </TableCell>
                              <TableCell className="text-slate-300">{withdrawal.network || "N/A"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  withdrawal.status === "completed" 
                                    ? "bg-green-900/50 text-green-300"
                                    : withdrawal.status === "pending"
                                    ? "bg-yellow-900/50 text-yellow-300"
                                    : "bg-red-900/50 text-red-300"
                                }`}>
                                  {withdrawal.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {new Date(withdrawal.createdAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {logs?.logins && logs.logins.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Recent Logins</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportToCSV(logs.logins, "logins")}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">ID</TableHead>
                            <TableHead className="text-slate-300">User ID</TableHead>
                            <TableHead className="text-slate-300">Email</TableHead>
                            <TableHead className="text-slate-300">IP Address</TableHead>
                            <TableHead className="text-slate-300">Method</TableHead>
                            <TableHead className="text-slate-300">Success</TableHead>
                            <TableHead className="text-slate-300">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.logins.slice(0, 10).map((login: any) => (
                            <TableRow key={login.id} className="border-slate-700">
                              <TableCell className="text-white">{login.id}</TableCell>
                              <TableCell className="text-white">{login.userId || "N/A"}</TableCell>
                              <TableCell className="text-slate-300">{login.email}</TableCell>
                              <TableCell className="text-slate-300 font-mono text-sm">{login.ipAddress}</TableCell>
                              <TableCell className="text-slate-300">{login.method}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  login.success 
                                    ? "bg-green-900/50 text-green-300"
                                    : "bg-red-900/50 text-red-300"
                                }`}>
                                  {login.success ? "Success" : "Failed"}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {new Date(login.timestamp).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="deposits">
              {/* Similar table for deposits only */}
              <div className="text-center text-slate-400 py-8">
                Use "All" tab to view deposits
              </div>
            </TabsContent>

            <TabsContent value="withdrawals">
              {/* Similar table for withdrawals only */}
              <div className="text-center text-slate-400 py-8">
                Use "All" tab to view withdrawals
              </div>
            </TabsContent>

            <TabsContent value="trades">
              {/* Similar table for trades only */}
              <div className="text-center text-slate-400 py-8">
                Trades log coming soon
              </div>
            </TabsContent>

            <TabsContent value="logins">
              {/* Similar table for logins only */}
              <div className="text-center text-slate-400 py-8">
                Use "All" tab to view logins
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
