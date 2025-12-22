/**
 * Admin Wallet Management Dashboard
 * 
 * Manages cold/hot wallet system:
 * - View cold wallet addresses and balances
 * - Monitor hot wallet health status
 * - Manual sweep operations (hot → cold, cold → hot)
 * - Configure balance thresholds
 * - View sweep history
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Wallet, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";

export default function WalletManagement() {
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [sweepAmount, setSweepAmount] = useState("");
  const [refillAmount, setRefillAmount] = useState("");
  
  // Queries
  const { data: coldWallets, isLoading: loadingCold, refetch: refetchCold } = trpc.admin.coldWallets.useQuery();
  const { data: hotWalletStatus, isLoading: loadingHot, refetch: refetchHot } = trpc.admin.hotWalletStatus.useQuery();
  const { data: coldStorageValue } = trpc.admin.coldStorageValue.useQuery();
  const { data: sweepHistory } = trpc.admin.sweepHistory.useQuery({ limit: 50 });
  const { data: thresholds } = trpc.admin.walletThresholds.useQuery();
  
  // Mutations
  const verifyColdBalance = trpc.admin.verifyColdWalletBalance.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Balance verified: ${data.balance}`);
        refetchCold();
      } else {
        toast.error(`Verification failed: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to verify balance: ${error.message}`);
    },
  });
  
  const sweepHotToCold = trpc.admin.sweepHotToCold.useMutation({
    onSuccess: () => {
      toast.success("Sweep initiated successfully");
      setSweepAmount("");
      setSelectedNetwork("");
      refetchHot();
    },
    onError: (error: any) => {
      toast.error(`Sweep failed: ${error.message}`);
    },
  });
  
  const refillHotWallet = trpc.admin.refillHotWallet.useMutation({
    onSuccess: () => {
      toast.success("Refill request created. Check your email for instructions.");
      setRefillAmount("");
      setSelectedNetwork("");
    },
    onError: (error: any) => {
      toast.error(`Refill request failed: ${error.message}`);
    },
  });
  
  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "low": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "high": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "critical": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };
  
  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="w-4 h-4" />;
      case "low": return <TrendingDown className="w-4 h-4" />;
      case "high": return <TrendingUp className="w-4 h-4" />;
      case "critical": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };
  
  const getSweepStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Wallet Management</h1>
          <p className="text-gray-400">Manage cold storage and hot wallet system</p>
        </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cold">Cold Wallets</TabsTrigger>
          <TabsTrigger value="hot">Hot Wallets</TabsTrigger>
          <TabsTrigger value="sweep">Sweep Operations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Cold Storage Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${coldStorageValue?.totalValue.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-gray-400 mt-1">95% of total funds</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-400" />
                  Hot Wallets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hotWalletStatus?.length || 0}
                </div>
                <p className="text-xs text-gray-400 mt-1">Active hot wallets</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  Recent Sweeps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sweepHistory?.filter((s: any) => s.status === "completed").length || 0}
                </div>
                <p className="text-xs text-gray-400 mt-1">Completed today</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Hot Wallet Health Status */}
          <Card>
            <CardHeader>
              <CardTitle>Hot Wallet Health Status</CardTitle>
              <CardDescription>Real-time monitoring of hot wallet balances</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHot ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : hotWalletStatus && hotWalletStatus.length > 0 ? (
                <div className="space-y-3">
                  {hotWalletStatus.map((wallet: any) => (
                    <div
                      key={wallet.network}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold">{wallet.network}</div>
                          <div className={`px-2 py-1 rounded-md border text-xs font-medium flex items-center gap-1 ${getHealthColor(wallet.healthStatus)}`}>
                            {getHealthIcon(wallet.healthStatus)}
                            <span className="capitalize">{wallet.healthStatus}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">{wallet.asset}</div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Current</div>
                          <div className="font-medium">{wallet.currentBalance.toFixed(8)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Target</div>
                          <div className="font-medium">{wallet.targetBalance.toFixed(8)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Min</div>
                          <div className="font-medium">{wallet.minBalance.toFixed(8)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Max</div>
                          <div className="font-medium">{wallet.maxBalance.toFixed(8)}</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              wallet.healthStatus === "critical" ? "bg-red-500" :
                              wallet.healthStatus === "low" ? "bg-yellow-500" :
                              wallet.healthStatus === "high" ? "bg-blue-500" :
                              "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(wallet.percentOfTarget, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {wallet.percentOfTarget.toFixed(1)}% of target balance
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No hot wallets configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Cold Wallets Tab */}
        <TabsContent value="cold" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cold Storage Wallets</CardTitle>
              <CardDescription>Offline hardware wallets (95% of funds)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCold ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : coldWallets && coldWallets.length > 0 ? (
                <div className="space-y-3">
                  {coldWallets.map((wallet: any) => (
                    <div
                      key={wallet.id}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold">{wallet.network}</div>
                          <div className="text-sm text-gray-400">{wallet.asset}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyColdBalance.mutate({ network: wallet.network })}
                          disabled={verifyColdBalance.isPending}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${verifyColdBalance.isPending ? "animate-spin" : ""}`} />
                          Verify Balance
                        </Button>
                      </div>
                      
                      <div className="text-xs font-mono text-gray-400 mb-2">{wallet.address}</div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-400">Balance</div>
                          <div className="text-lg font-semibold">{wallet.balance} {wallet.asset}</div>
                        </div>
                        {wallet.lastVerifiedAt && (
                          <div className="text-xs text-gray-400">
                            Last verified: {new Date(wallet.lastVerifiedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      {wallet.notes && (
                        <div className="mt-2 text-sm text-gray-400 italic">{wallet.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No cold wallets configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Hot Wallets Tab */}
        <TabsContent value="hot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hot Wallet Status</CardTitle>
              <CardDescription>Online wallets for automatic withdrawals (5% of funds)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHot ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : hotWalletStatus && hotWalletStatus.length > 0 ? (
                <div className="space-y-4">
                  {hotWalletStatus.map((wallet: any) => (
                    <div
                      key={wallet.network}
                      className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-lg font-semibold">{wallet.network}</div>
                          <div className="text-sm text-gray-400">{wallet.asset}</div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-md border text-sm font-medium flex items-center gap-2 ${getHealthColor(wallet.healthStatus)}`}>
                          {getHealthIcon(wallet.healthStatus)}
                          <span className="capitalize">{wallet.healthStatus}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-400">Current Balance</div>
                          <div className="text-sm font-semibold">{wallet.currentBalance.toFixed(8)} {wallet.asset}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Target Balance</div>
                          <div className="text-sm font-semibold">{wallet.targetBalance.toFixed(8)} {wallet.asset}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Min Threshold</div>
                          <div className="text-sm font-semibold">{wallet.minBalance.toFixed(8)} {wallet.asset}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Max Threshold</div>
                          <div className="text-sm font-semibold">{wallet.maxBalance.toFixed(8)} {wallet.asset}</div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {wallet.healthStatus === "low" || wallet.healthStatus === "critical" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/10"
                            onClick={() => setSelectedNetwork(wallet.network)}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Refill from Cold Storage
                          </Button>
                        ) : null}
                        
                        {wallet.healthStatus === "high" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                            onClick={() => setSelectedNetwork(wallet.network)}
                          >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Sweep to Cold Storage
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No hot wallets configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sweep Operations Tab */}
        <TabsContent value="sweep" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sweep Hot to Cold */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-blue-400" />
                  Sweep to Cold Storage
                </CardTitle>
                <CardDescription>Move excess funds from hot wallet to cold storage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Network</Label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
                  >
                    <option value="">Select network</option>
                    {hotWalletStatus?.map((wallet: any) => (
                      <option key={wallet.network} value={wallet.network}>
                        {wallet.network} ({wallet.currentBalance.toFixed(4)} {wallet.asset})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={sweepAmount}
                    onChange={(e) => setSweepAmount(e.target.value)}
                  />
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!selectedNetwork || !sweepAmount) {
                      toast.error("Please select network and enter amount");
                      return;
                    }
                    sweepHotToCold.mutate({ network: selectedNetwork, amount: sweepAmount });
                  }}
                  disabled={sweepHotToCold.isPending}
                >
                  {sweepHotToCold.isPending ? "Processing..." : "Sweep to Cold Storage"}
                </Button>
              </CardContent>
            </Card>
            
            {/* Refill Hot Wallet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  Refill Hot Wallet
                </CardTitle>
                <CardDescription>Request manual transfer from cold storage to hot wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Network</Label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100"
                  >
                    <option value="">Select network</option>
                    {hotWalletStatus?.map((wallet: any) => (
                      <option key={wallet.network} value={wallet.network}>
                        {wallet.network} ({wallet.currentBalance.toFixed(4)} {wallet.asset})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(e.target.value)}
                  />
                </div>
                
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400">
                    ⚠️ This creates a manual refill request. You'll receive an email with instructions
                    to transfer funds from cold storage using your hardware wallet.
                  </p>
                </div>
                
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    if (!selectedNetwork || !refillAmount) {
                      toast.error("Please select network and enter amount");
                      return;
                    }
                    refillHotWallet.mutate({ network: selectedNetwork, amount: refillAmount });
                  }}
                  disabled={refillHotWallet.isPending}
                >
                  {refillHotWallet.isPending ? "Creating Request..." : "Create Refill Request"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sweep Transaction History</CardTitle>
              <CardDescription>All fund movements between wallets</CardDescription>
            </CardHeader>
            <CardContent>
              {sweepHistory && sweepHistory.length > 0 ? (
                <div className="space-y-2">
                  {sweepHistory.map((sweep: any) => (
                    <div
                      key={sweep.id}
                      className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSweepStatusIcon(sweep.status)}
                          <span className="font-medium capitalize">{sweep.type.replace(/_/g, " ")}</span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {new Date(sweep.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Network</div>
                          <div>{sweep.network}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Amount</div>
                          <div>{sweep.amount} {sweep.asset}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Status</div>
                          <div className="capitalize">{sweep.status}</div>
                        </div>
                      </div>
                      
                      {sweep.txHash && (
                        <div className="mt-2 text-xs font-mono text-gray-400">
                          TxHash: {sweep.txHash}
                        </div>
                      )}
                      
                      {sweep.errorMessage && (
                        <div className="mt-2 text-xs text-red-400">
                          Error: {sweep.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No sweep transactions yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
