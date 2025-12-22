import { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { ArrowUpDown, TrendingUp, TrendingDown, Clock, DollarSign, Activity, BarChart3 } from "lucide-react";

export default function Trade() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");

  // Queries
  const { data: tradingPairs } = trpc.trade.tradingPairs.useQuery();
  const { data: orderBook, refetch: refetchOrderBook } = trpc.trade.orderBook.useQuery({ pair: selectedPair });
  const { data: recentTrades, refetch: refetchTrades } = trpc.trade.recentTrades.useQuery({ pair: selectedPair, limit: 20 });
  const { data: myOrders, refetch: refetchMyOrders } = trpc.trade.myOrders.useQuery({ pair: selectedPair });
  const { data: currentPrice } = trpc.prices.getPair.useQuery({ pair: selectedPair });
  const { data: wallets } = trpc.wallet.list.useQuery();

  // Mutations
  const placeOrderMutation = trpc.trade.placeOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Order placed successfully! ${data.trades?.length || 0} trades executed.`);
      setPrice("");
      setAmount("");
      refetchOrderBook();
      refetchTrades();
      refetchMyOrders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelOrderMutation = trpc.trade.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success("Order cancelled successfully");
      refetchOrderBook();
      refetchMyOrders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Auto-refresh order book and trades every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchOrderBook();
      refetchTrades();
      refetchMyOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchOrderBook, refetchTrades, refetchMyOrders]);

  const handlePlaceOrder = () => {
    console.log("[Trade] handlePlaceOrder called");
    console.log("[Trade] Values:", { orderType, price, amount, selectedPair, orderSide });
    
    if (orderType === "limit" && !price) {
      console.log("[Trade] Validation failed: price required");
      toast.error("Price is required for limit orders");
      return;
    }
    if (!amount) {
      console.log("[Trade] Validation failed: amount required");
      toast.error("Amount is required");
      return;
    }

    console.log("[Trade] Calling placeOrderMutation.mutate");
    placeOrderMutation.mutate({
      pair: selectedPair,
      side: orderSide,
      type: orderType,
      price: orderType === "limit" ? price : undefined,
      amount,
    });
  };

  const handleCancelOrder = (orderId: number) => {
    cancelOrderMutation.mutate({ orderId });
  };

  const bestBid = orderBook?.bids[0]?.price || "0";
  const bestAsk = orderBook?.asks[0]?.price || "0";
  const spread = parseFloat(bestAsk) - parseFloat(bestBid);
  const spreadPercent = (spread / parseFloat(bestAsk)) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Spot Trading</h1>
              <p className="text-muted-foreground">Trade cryptocurrencies with real-time order matching</p>
            </div>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tradingPairs?.map((pair) => (
                  <SelectItem key={pair.pair} value={pair.pair}>
                    {pair.pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 24h Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">24h Volume</div>
                <div className="text-2xl font-bold">$2.4M</div>
                <div className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.5%
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">24h Change</div>
                <div className="text-2xl font-bold text-green-500">+3.2%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  $1,245
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">24h High</div>
                <div className="text-2xl font-bold">${(parseFloat(String(currentPrice?.price || "0")) * 1.05).toFixed(2)}</div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">24h Low</div>
                <div className="text-2xl font-bold">${(parseFloat(String(currentPrice?.price || "0")) * 0.95).toFixed(2)}</div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Price Info */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Last Price</div>
              <div className="text-2xl font-bold">${currentPrice?.price || "0.00"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Bid</div>
              <div className="text-xl font-semibold text-green-500">${bestBid}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Ask</div>
              <div className="text-xl font-semibold text-red-500">${bestAsk}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Spread</div>
              <div className="text-xl font-semibold">{spreadPercent.toFixed(2)}%</div>
            </div>
          </div>
        </Card>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Book */}
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Order Book
            </h2>
            <div className="space-y-4">
              {/* Asks (Sell Orders) */}
              <div>
                <div className="text-sm font-semibold text-red-500 mb-2">Asks (Sell)</div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {orderBook?.asks.slice(0, 10).reverse().map((ask, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-red-500">${parseFloat(ask.price).toFixed(2)}</span>
                      <span className="text-muted-foreground">{parseFloat(ask.amount).toFixed(4)}</span>
                      <span className="text-muted-foreground">${parseFloat(ask.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spread */}
              <div className="border-t border-b py-2 text-center">
                <div className="text-sm text-muted-foreground">Spread: ${spread.toFixed(2)}</div>
              </div>

              {/* Bids (Buy Orders) */}
              <div>
                <div className="text-sm font-semibold text-green-500 mb-2">Bids (Buy)</div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {orderBook?.bids.slice(0, 10).map((bid, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-green-500">${parseFloat(bid.price).toFixed(2)}</span>
                      <span className="text-muted-foreground">{parseFloat(bid.amount).toFixed(4)}</span>
                      <span className="text-muted-foreground">${parseFloat(bid.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Order Form */}
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Place Order</h2>
            <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as "buy" | "sell")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-green-500">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-red-500">Sell</TabsTrigger>
              </TabsList>

              <TabsContent value={orderSide} className="space-y-4 mt-4">
                {/* Order Type */}
                <div>
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => setOrderType(v as "limit" | "market")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="limit">Limit Order</SelectItem>
                      <SelectItem value="market">Market Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price (only for limit orders) */}
                {orderType === "limit" && (
                  <div>
                    <Label>Price (USDT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount */}
                <div>
                  <Label>Amount ({selectedPair.split("/")[0]})</Label>
                  {/* Available Balance Display */}
                  {wallets && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Available: {orderSide === "buy" 
                        ? `${parseFloat(wallets.find(w => w.asset === selectedPair.split("/")[1])?.balance || "0").toFixed(2)} ${selectedPair.split("/")[1]}`
                        : `${parseFloat(wallets.find(w => w.asset === selectedPair.split("/")[0])?.balance || "0").toFixed(8)} ${selectedPair.split("/")[0]}`
                      }
                    </div>
                  )}
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {/* Quick Balance Buttons */}
                  <div className="flex gap-2 mt-2">
                    {[25, 50, 75, 100].map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => {
                          const availableBalance = orderSide === "buy"
                            ? parseFloat(wallets?.find(w => w.asset === selectedPair.split("/")[1])?.balance || "0")
                            : parseFloat(wallets?.find(w => w.asset === selectedPair.split("/")[0])?.balance || "0");
                          const calculatedAmount = orderSide === "buy"
                            ? (availableBalance * (percent / 100)) / parseFloat(price || String(currentPrice?.price || "1"))
                            : availableBalance * (percent / 100);
                          setAmount(calculatedAmount.toFixed(8));
                        }}
                        className="flex-1 px-2 py-1 text-xs rounded border border-border hover:bg-accent transition-colors"
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total */}
                {orderType === "limit" && price && amount && (
                  <div>
                    <Label>Total (USDT)</Label>
                    <div className="text-lg font-semibold">
                      ${(parseFloat(price) * parseFloat(amount)).toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Place Order Button */}
                <button
                  type="button"
                  className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                    orderSide === "buy" 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => {
                    console.log("[BUTTON] onClick fired!");
                    handlePlaceOrder();
                  }}
                  disabled={placeOrderMutation.isPending}
                >
                  {placeOrderMutation.isPending ? "Placing..." : `${orderSide === "buy" ? "Buy" : "Sell"} ${selectedPair.split("/")[0]}`}
                </button>

                {/* Inline Error Display */}
                {placeOrderMutation.error && (
                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-500">Order Failed</p>
                        <p className="text-xs text-red-400 mt-1">{placeOrderMutation.error.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fee Info */}
                <div className="text-xs text-muted-foreground">
                  <div>Maker Fee: 0.1%</div>
                  <div>Taker Fee: 0.2%</div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Recent Trades */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Trades
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const utils = trpc.useUtils();
                    const result = await utils.client.trade.exportTrades.query({ pair: selectedPair });
                    const blob = new Blob([result.csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.filename;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    toast.success('Trading history exported successfully');
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to export trades');
                  }
                }}
              >
                Export CSV
              </Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentTrades?.map((trade) => (
                <div key={trade.id} className="flex justify-between text-sm border-b pb-2">
                  <span className={parseFloat(trade.price) > 0 ? "text-green-500" : "text-red-500"}>
                    ${parseFloat(trade.price).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">{parseFloat(trade.amount).toFixed(4)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(trade.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {(!recentTrades || recentTrades.length === 0) && (
                <div className="text-center text-muted-foreground py-8">No recent trades</div>
              )}
            </div>
          </Card>
        </div>

        {/* My Open Orders */}
        <Card className="p-4 mt-6">
          <h2 className="text-lg font-bold mb-4">My Open Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Pair</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">Filled</th>
                  <th className="text-right p-2">Status</th>
                  <th className="text-right p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {myOrders?.map((order) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-2 text-sm">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="p-2">{order.pair}</td>
                    <td className="p-2">
                      <span className={order.side === "buy" ? "text-green-500" : "text-red-500"}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">{order.type}</td>
                    <td className="p-2 text-right">${parseFloat(order.price).toFixed(2)}</td>
                    <td className="p-2 text-right">{parseFloat(order.amount).toFixed(4)}</td>
                    <td className="p-2 text-right">{parseFloat(order.filled).toFixed(4)}</td>
                    <td className="p-2 text-right">
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancelOrderMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!myOrders || myOrders.length === 0) && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted-foreground py-8">
                      No open orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
