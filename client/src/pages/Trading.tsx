import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import OrderExecutionPanel from "@/components/OrderExecutionPanel";
import AdvancedTradingChart from "@/components/AdvancedTradingChart";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TRADING_PAIRS } from "@shared/const";

export default function Trading() {
  const { user } = useAuth();
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");

  const { data: pairPrice, refetch: refetchPrice } = trpc.prices.getPair.useQuery({ pair: selectedPair });

  // Auto-refresh price every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPrice();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchPrice]);

  const { data: orderBook, refetch: refetchOrderBook } = trpc.trading.orderBook.useQuery(
    { pair: selectedPair },
    { refetchInterval: 5000 }
  );

  const { data: myOrders, refetch: refetchMyOrders } = trpc.trading.myOrders.useQuery();
  const { data: myTrades } = trpc.trading.myTrades.useQuery();



  const cancelOrder = trpc.trading.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success("Order cancelled!");
      refetchOrderBook();
      refetchMyOrders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleOrderPlaced = () => {
    refetchOrderBook();
    refetchMyOrders();
  };

  const openOrders = myOrders?.filter(o => o.status === "open") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading</h1>
            <p className="text-muted-foreground">Trade cryptocurrencies with limit orders</p>
            {pairPrice && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-2xl font-bold">${pairPrice.price.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">Live Price</span>
              </div>
            )}
          </div>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRADING_PAIRS.map(pair => (
                <SelectItem key={pair} value={pair}>{pair}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Trading Chart */}
        <AdvancedTradingChart pair={selectedPair} currentPrice={pairPrice?.price} />

        {/* Order Book Depth Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Order Book Depth</CardTitle>
          </CardHeader>
          <CardContent>
            {orderBook && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={[
                    ...orderBook.bids
                      .slice(0, 20)
                      .reverse()
                      .map((bid, idx, arr) => ({
                        price: parseFloat(bid.price.toFixed(2)),
                        bidDepth: arr.slice(0, idx + 1).reduce((sum, b) => sum + b.amount, 0),
                        askDepth: 0,
                      })),
                    ...orderBook.asks
                      .slice(0, 20)
                      .map((ask, idx, arr) => ({
                        price: parseFloat(ask.price.toFixed(2)),
                        bidDepth: 0,
                        askDepth: arr.slice(0, idx + 1).reduce((sum, a) => sum + a.amount, 0),
                      })),
                  ].sort((a, b) => a.price - b.price)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                  <XAxis
                    dataKey="price"
                    stroke="#888"
                    tick={{ fill: "#888" }}
                    tickFormatter={(value) => value.toFixed(0)}
                  />
                  <YAxis stroke="#888" tick={{ fill: "#888" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0, 0, 0, 0.9)",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value: number) => value.toFixed(4)}
                  />
                  <Area
                    type="monotone"
                    dataKey="bidDepth"
                    stroke="#22c55e"
                    fill="url(#bidGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="askDepth"
                    stroke="#ef4444"
                    fill="url(#askGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {!orderBook && (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Loading order book depth...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Book */}
          <Card className="glass lg:col-span-1">
            <CardHeader>
              <CardTitle>Order Book</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Asks (Sell Orders) */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Asks</div>
                  <div className="space-y-1">
                    {orderBook?.asks.slice(0, 10).reverse().map((ask, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-red-500">{ask.price.toFixed(2)}</span>
                        <span className="text-muted-foreground">{ask.amount.toFixed(8)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spread */}
                <div className="border-t border-b border-border py-2 text-center">
                  <span className="text-lg font-bold">
                    {orderBook?.bids[0] ? orderBook.bids[0].price.toFixed(2) : "---"}
                  </span>
                </div>

                {/* Bids (Buy Orders) */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Bids</div>
                  <div className="space-y-1">
                    {orderBook?.bids.slice(0, 10).map((bid, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-green-500">{bid.price.toFixed(2)}</span>
                        <span className="text-muted-foreground">{bid.amount.toFixed(8)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Place Order */}
          <div className="lg:col-span-2">
            <OrderExecutionPanel
              selectedPair={selectedPair}
              currentPrice={pairPrice?.price}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>


        </div>

        {/* Open Orders */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Open Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {openOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No open orders</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Pair</th>
                      <th className="text-left py-3 px-4">Side</th>
                      <th className="text-right py-3 px-4">Price</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Filled</th>
                      <th className="text-right py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50">
                        <td className="py-3 px-4">{order.pair}</td>
                        <td className="py-3 px-4">
                          <span className={order.side === "buy" ? "text-green-500" : "text-red-500"}>
                            {order.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">{parseFloat(order.price).toFixed(2)}</td>
                        <td className="text-right py-3 px-4">{parseFloat(order.amount).toFixed(8)}</td>
                        <td className="text-right py-3 px-4">{parseFloat(order.filled).toFixed(8)}</td>
                        <td className="text-right py-3 px-4 capitalize">{order.status}</td>
                        <td className="text-right py-3 px-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelOrder.mutate({ id: order.id })}
                            disabled={cancelOrder.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>My Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {!myTrades || myTrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No trades yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Pair</th>
                      <th className="text-right py-3 px-4">Price</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-right py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTrades.map((trade) => (
                      <tr key={trade.id} className="border-b border-border/50">
                        <td className="py-3 px-4">{trade.pair}</td>
                        <td className="text-right py-3 px-4">{parseFloat(trade.price).toFixed(2)}</td>
                        <td className="text-right py-3 px-4">{parseFloat(trade.amount).toFixed(8)}</td>
                        <td className="text-right py-3 px-4">
                          {(parseFloat(trade.price) * parseFloat(trade.amount)).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                          {new Date(trade.createdAt).toLocaleString()}
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
