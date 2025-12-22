import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowUpRight, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { TrustSignals, TrustBanner } from "@/components/TrustSignals";

export default function Withdrawal() {
  const [asset, setAsset] = useState("BTC");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  const { data: withdrawals, refetch } = trpc.withdrawal.list.useQuery();
  const { data: wallets } = trpc.wallet.list.useQuery();
  
  const { data: networks } = trpc.wallet.listNetworks.useQuery(
    { asset },
    { enabled: !!asset }
  );

  // Auto-select first network when networks load
  useEffect(() => {
    if (networks && networks.length > 0 && !network) {
      setNetwork(networks[0].symbol);
    }
  }, [networks, network]);

  const createWithdrawal = trpc.withdrawal.create.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal request created! Awaiting admin approval.");
      setAmount("");
      setAddress("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleWithdraw = () => {
    if (!amount || !address || !network) {
      toast.error("Please select network and enter amount and address");
      return;
    }
    createWithdrawal.mutate({
      asset,
      amount,
      network,
      address,
    });
  };

  const selectedNetworkData = networks?.find(n => n.symbol === network);

  const selectedWallet = wallets?.find(w => w.asset === asset);
  const available = selectedWallet 
    ? parseFloat(selectedWallet.balance) - parseFloat(selectedWallet.locked)
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Withdrawal</h1>
          <p className="text-muted-foreground">Withdraw funds from your account</p>
        </div>

        {/* Trust Banner */}
        <TrustBanner />

        {/* Withdrawal Form */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>New Withdrawal</CardTitle>
            <CardDescription>All withdrawals require admin approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Asset</Label>
                <Select value={asset} onValueChange={(val) => { setAsset(val); setNetwork(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                    <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                    <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                    <SelectItem value="SOL">Solana (SOL)</SelectItem>
                    <SelectItem value="TRX">Tron (TRX)</SelectItem>
                    <SelectItem value="MATIC">Polygon (MATIC)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {available.toFixed(8)} {asset}
                </p>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs mt-1"
                  onClick={() => setAmount(available.toString())}
                >
                  Use max
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Network *</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose network" />
                </SelectTrigger>
                <SelectContent>
                  {networks && networks.length > 0 ? (
                    networks.map((net) => (
                      <SelectItem key={net.id} value={net.symbol}>
                        <div className="flex items-center justify-between w-full">
                          <span>{net.name}</span>
                          <span className="text-xs text-muted-foreground ml-4">
                            Fee: {net.withdrawalFee} {asset} | Min: {net.minWithdrawal} {asset}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No networks available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedNetworkData && (
                <div className="mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    ℹ️ <strong>{selectedNetworkData.name}</strong> - 
                    Withdrawal Fee: {selectedNetworkData.withdrawalFee} {asset} | 
                    Min Withdrawal: {selectedNetworkData.minWithdrawal} {asset} | 
                    Confirmations: {selectedNetworkData.confirmations}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Withdrawal Address *</Label>
              <Input
                placeholder="Enter wallet address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                  ⚠️ <strong>CRITICAL WARNING:</strong> Ensure the address is compatible with <strong>{network || 'the selected network'}</strong>. 
                  Sending to an incompatible address will result in <strong>PERMANENT LOSS</strong> of funds!
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  Transactions cannot be reversed. Double-check the network and address before confirming.
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Important Notice</p>
                <p className="text-muted-foreground">
                  Withdrawals are manually reviewed by our admin team for security. 
                  Your funds will be locked until the request is processed (approved or rejected).
                </p>
              </div>
            </div>

            <Button
              className="w-full gradient-primary"
              onClick={handleWithdraw}
              disabled={createWithdrawal.isPending || available <= 0}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {createWithdrawal.isPending ? "Processing..." : "Request Withdrawal"}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {!withdrawals || withdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No withdrawals yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Asset</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Address</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="border-b border-border/50">
                        <td className="py-3 px-4">{withdrawal.asset}</td>
                        <td className="text-right py-3 px-4">{parseFloat(withdrawal.amount).toFixed(8)}</td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {withdrawal.address.slice(0, 10)}...{withdrawal.address.slice(-8)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(withdrawal.status)}
                            <span className="capitalize">{withdrawal.status}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
