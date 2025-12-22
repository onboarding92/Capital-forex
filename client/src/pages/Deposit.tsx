import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowDownRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { TrustSignals, TrustBanner } from "@/components/TrustSignals";

const PAYMENT_GATEWAYS = [
  { id: "changenow", name: "ChangeNOW", description: "Fast crypto exchange" },
  { id: "simplex", name: "Simplex", description: "Buy crypto with card" },
  { id: "moonpay", name: "MoonPay", description: "Popular payment gateway" },
  { id: "transak", name: "Transak", description: "Global fiat-to-crypto" },
  { id: "mercuryo", name: "Mercuryo", description: "Instant crypto purchases" },
  { id: "coingate", name: "CoinGate", description: "Multiple payment methods" },
  { id: "changelly", name: "Changelly", description: "Crypto exchange platform" },
  { id: "banxa", name: "Banxa", description: "Regulated payment gateway" },
];

export default function Deposit() {
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [asset, setAsset] = useState("USDT");
  const [network, setNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

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

  const { data: depositAddress, isLoading: loadingAddress } = trpc.wallet.getDepositAddress.useQuery(
    { asset, network },
    { enabled: !!asset && !!network }
  );

  useEffect(() => {
    if (depositAddress?.address) {
      QRCode.toDataURL(depositAddress.address, { width: 256 }).then(setQrCodeUrl);
    }
  }, [depositAddress]);

  const copyAddress = () => {
    if (depositAddress?.address) {
      navigator.clipboard.writeText(depositAddress.address);
      toast.success("Address copied to clipboard");
    }
  };

  const { data: deposits, refetch } = trpc.deposit.list.useQuery();

  const createDeposit = trpc.deposit.create.useMutation({
    onSuccess: () => {
      toast.success("Deposit request created!");
      setAmount("");
      setTxHash("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDeposit = () => {
    if (!selectedGateway || !amount || !network) {
      toast.error("Please select gateway, network and enter amount");
      return;
    }
    createDeposit.mutate({
      asset,
      amount,
      network,
      method: selectedGateway as any,
      txHash: txHash || undefined,
    });
  };

  const selectedNetworkData = networks?.find(n => n.symbol === network);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Deposit</h1>
          <p className="text-muted-foreground">Add funds to your account</p>
        </div>

        {/* Trust Banner */}
        <TrustBanner />

        {/* Crypto Deposit Address */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Deposit via Crypto Transfer</CardTitle>
            <CardDescription>
              Send {asset} directly to your personal wallet address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Cryptocurrency</Label>
                <Select value={asset} onValueChange={(val) => { setAsset(val); setNetwork(""); }}>
                  <SelectTrigger className="w-full">
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
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Select Network</Label>
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
                              Fee: {net.depositFee} {asset} | Min: {net.minDeposit} {asset}
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
                      Deposit Fee: {selectedNetworkData.depositFee} {asset} | 
                      Min Deposit: {selectedNetworkData.minDeposit} {asset} | 
                      Confirmations: {selectedNetworkData.confirmations}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {loadingAddress ? (
              <div className="text-center py-8 text-muted-foreground">Generating wallet address...</div>
            ) : depositAddress ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network</span>
                    <span className="text-sm text-muted-foreground">{depositAddress.network}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Deposit Address</span>
                    <div className="flex items-center gap-2">
                      <Input value={depositAddress.address} readOnly className="font-mono text-xs" />
                      <Button size="icon" variant="outline" onClick={copyAddress}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  {qrCodeUrl && (
                    <div className="flex justify-center pt-4">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ <strong>CRITICAL WARNING:</strong> Only send {asset} to this address using the <strong>{depositAddress.network}</strong> network. 
                    Sending via a different network or sending different assets will result in <strong>PERMANENT LOSS</strong> of your funds!
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
                    Double-check the network before sending. We cannot recover funds sent to the wrong network.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment Gateways */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {PAYMENT_GATEWAYS.map((gateway) => (
              <Card
                key={gateway.id}
                className={`glass cursor-pointer transition-all ${
                  selectedGateway === gateway.id
                    ? "border-primary ring-2 ring-primary"
                    : "border-border/50 hover:border-primary/50"
                }`}
                onClick={() => setSelectedGateway(gateway.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{gateway.name}</CardTitle>
                  <CardDescription className="text-xs">{gateway.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Deposit Form */}
        {selectedGateway && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Deposit Details</CardTitle>
              <CardDescription>
                Complete your deposit using {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Asset</Label>
                  <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      <SelectItem value="USDT">Tether (USDT)</SelectItem>
                      <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                      <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Transaction Hash (Optional)</Label>
                <Input
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you've already sent the transaction, paste the hash here
                </p>
              </div>

              <Button
                className="w-full gradient-primary"
                onClick={handleDeposit}
                disabled={createDeposit.isPending}
              >
                <ArrowDownRight className="mr-2 h-4 w-4" />
                {createDeposit.isPending ? "Processing..." : "Create Deposit Request"}
              </Button>

              <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click "Create Deposit Request" to generate your deposit</li>
                  <li>You'll be redirected to {PAYMENT_GATEWAYS.find(g => g.id === selectedGateway)?.name}</li>
                  <li>Complete the payment process</li>
                  <li>Funds will be credited after confirmation</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deposit History */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Deposit History</CardTitle>
          </CardHeader>
          <CardContent>
            {!deposits || deposits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No deposits yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Asset</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Method</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit) => (
                      <tr key={deposit.id} className="border-b border-border/50">
                        <td className="py-3 px-4">{deposit.asset}</td>
                        <td className="text-right py-3 px-4">{parseFloat(deposit.amount).toFixed(8)}</td>
                        <td className="py-3 px-4 capitalize">{deposit.provider || "-"}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deposit.status)}
                            <span className="capitalize">{deposit.status}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                          {new Date(deposit.createdAt).toLocaleDateString()}
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
