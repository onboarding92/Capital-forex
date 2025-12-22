import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";

export default function MarginTrading() {
  const [currency] = useState("USDT");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState([10]);
  const [marginMode, setMarginMode] = useState<"isolated" | "cross">("isolated");
  const [transferAmount, setTransferAmount] = useState("");

  const { data: marginAccount, refetch: refetchAccount } = trpc.marginTrading.getMarginAccount.useQuery({ currency });
  const { data: openPositions, refetch: refetchPositions } = trpc.marginTrading.getOpenPositions.useQuery();
  const { data: positionHistory } = trpc.marginTrading.getPositionHistory.useQuery({ limit: 20 });

  const transferMutation = trpc.marginTrading.transferToMargin.useMutation({
    onSuccess: () => {
      toast.success("Funds transferred to margin account");
      setTransferAmount("");
      refetchAccount();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setLeverageMutation = trpc.marginTrading.setLeverage.useMutation({
    onSuccess: (data) => {
      toast.success(`Leverage set to ${data.leverage}x`);
      refetchAccount();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const openPositionMutation = trpc.marginTrading.openPosition.useMutation({
    onSuccess: (data) => {
      toast.success(`Position opened: ${side.toUpperCase()} ${size} ${symbol} at ${data.position.entryPrice}`);
      setSize("");
      refetchAccount();
      refetchPositions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const closePositionMutation = trpc.marginTrading.closePosition.useMutation({
    onSuccess: (data) => {
      const pnlColor = data.pnl >= 0 ? "text-green-600" : "text-red-600";
      toast.success(`Position closed. PnL: ${data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(2)} USDT`, {
        className: pnlColor,
      });
      refetchAccount();
      refetchPositions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    transferMutation.mutate({ currency, amount });
  };

  const handleSetLeverage = () => {
    setLeverageMutation.mutate({ currency, leverage: leverage[0] });
  };

  const handleOpenPosition = () => {
    const sizeNum = parseFloat(size);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      toast.error("Invalid position size");
      return;
    }
    openPositionMutation.mutate({ symbol, side, size: sizeNum, marginMode });
  };

  const handleClosePosition = (positionId: number) => {
    closePositionMutation.mutate({ positionId });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Margin Trading</h1>
          <p className="text-muted-foreground">Trade with leverage up to 100x</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <DollarSign className="h-5 w-5 mr-2" />
          Leverage: {marginAccount?.leverage || 1}x
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Margin Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Margin Account</CardTitle>
            <CardDescription>Your margin account balance and leverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold">{marginAccount?.balance || "0"} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="font-semibold text-green-600">{marginAccount?.available || "0"} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Locked</span>
                <span className="font-semibold text-orange-600">{marginAccount?.locked || "0"} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Margin Level</span>
                <span className="font-semibold">{marginAccount?.marginLevel || "0"}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transfer from Spot Wallet</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
                <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
                  Transfer
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Leverage: {leverage[0]}x</Label>
              <Slider
                value={leverage}
                onValueChange={setLeverage}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <Button onClick={handleSetLeverage} disabled={setLeverageMutation.isPending} className="w-full">
                Set Leverage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Open Position */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open Position</CardTitle>
            <CardDescription>Open a leveraged long or short position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                    <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                    <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Margin Mode</Label>
                <Select value={marginMode} onValueChange={(v: "isolated" | "cross") => setMarginMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="isolated">Isolated</SelectItem>
                    <SelectItem value="cross">Cross</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Position Size</Label>
              <Input
                type="number"
                placeholder="Enter size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  setSide("long");
                  handleOpenPosition();
                }}
                disabled={openPositionMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Open Long
              </Button>
              <Button
                onClick={() => {
                  setSide("short");
                  handleOpenPosition();
                }}
                disabled={openPositionMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Open Short
              </Button>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-orange-900 dark:text-orange-100">High Risk Warning</p>
                  <p className="text-orange-700 dark:text-orange-300">
                    Margin trading with leverage can result in significant losses. Your position may be liquidated if the market moves against you.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Open Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openPositions && openPositions.length > 0 ? (
            <div className="space-y-4">
              {openPositions.map((position) => (
                <div key={position.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={position.side === "long" ? "default" : "destructive"}>
                        {position.side.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{position.symbol}</span>
                      <Badge variant="outline">{position.leverage}x</Badge>
                      <Badge variant="secondary">{position.marginMode}</Badge>
                    </div>
                    <Button
                      onClick={() => handleClosePosition(position.id)}
                      disabled={closePositionMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      Close Position
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Size:</span>{" "}
                      <span className="font-medium">{position.size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entry:</span>{" "}
                      <span className="font-medium">{position.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Liquidation:</span>{" "}
                      <span className="font-medium text-red-600">{position.liquidationPrice}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unrealized PnL:</span>{" "}
                      <span className={`font-medium ${parseFloat(position.unrealizedPnL) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(position.unrealizedPnL) >= 0 ? "+" : ""}{position.unrealizedPnL} USDT
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No open positions</p>
          )}
        </CardContent>
      </Card>

      {/* Position History */}
      <Card>
        <CardHeader>
          <CardTitle>Position History</CardTitle>
        </CardHeader>
        <CardContent>
          {positionHistory && positionHistory.length > 0 ? (
            <div className="space-y-2">
              {positionHistory.map((position) => (
                <div key={position.id} className="p-3 border rounded-lg flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={position.side === "long" ? "default" : "destructive"} className="text-xs">
                      {position.side.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{position.symbol}</span>
                    <Badge variant="outline" className="text-xs">{position.leverage}x</Badge>
                    <Badge variant={position.status === "closed" ? "secondary" : position.status === "liquidated" ? "destructive" : "default"} className="text-xs">
                      {position.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Size: {position.size}</span>
                    <span className="text-muted-foreground">Entry: {position.entryPrice}</span>
                    <span className={`font-medium ${parseFloat(position.realizedPnL) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      PnL: {parseFloat(position.realizedPnL) >= 0 ? "+" : ""}{position.realizedPnL} USDT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No position history</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
