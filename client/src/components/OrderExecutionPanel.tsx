import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface OrderExecutionPanelProps {
  selectedPair: string;
  currentPrice?: number;
  onOrderPlaced?: () => void;
}

export default function OrderExecutionPanel({ selectedPair, currentPrice, onOrderPlaced }: OrderExecutionPanelProps) {
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("limit");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [useLiveExchange, setUseLiveExchange] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  // Simulated order mutation
  const placeSimulatedOrder = trpc.trading.placeLimitOrder.useMutation({
    onSuccess: () => {
      toast.success("Simulated order placed successfully!");
      resetForm();
      onOrderPlaced?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Live exchange order mutation
  const placeLiveOrder = trpc.trade.placeExchangeOrder.useMutation({
    onSuccess: (data) => {
      toast.success(`Live order placed! Order ID: ${data.orderId}`);
      resetForm();
      onOrderPlaced?.();
    },
    onError: (error) => {
      toast.error(`Failed to place live order: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPrice("");
    setAmount("");
    setStopLoss("");
    setTakeProfit("");
    setConfirmDialogOpen(false);
    setPendingOrder(null);
  };

  const handlePlaceOrder = () => {
    if (orderType === "limit" && !price) {
      toast.error("Please enter a price for limit order");
      return;
    }
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }

    const orderDetails = {
      pair: selectedPair,
      side: orderSide,
      type: orderType,
      price: orderType === "limit" ? price : currentPrice?.toString() || "",
      amount,
      stopLoss: stopLoss || undefined,
      takeProfit: takeProfit || undefined,
      total: orderType === "limit" 
        ? (parseFloat(price) * parseFloat(amount)).toFixed(2)
        : ((currentPrice || 0) * parseFloat(amount)).toFixed(2),
    };

    setPendingOrder(orderDetails);
    setConfirmDialogOpen(true);
  };

  const confirmOrder = () => {
    if (!pendingOrder) return;

    if (useLiveExchange) {
      // Place order on live exchange
      placeLiveOrder.mutate({
        symbol: selectedPair.replace("/", ""),
        side: orderSide,
        type: orderType,
        amount: parseFloat(amount),
        price: orderType === "limit" ? parseFloat(price) : undefined,
      });
    } else {
      // Place simulated order
      placeSimulatedOrder.mutate({
        pair: selectedPair,
        side: orderSide,
        price: orderType === "limit" ? price : currentPrice?.toString() || "",
        amount,
        stopLoss: stopLoss || undefined,
        takeProfit: takeProfit || undefined,
      });
    }
  };

  const total = orderType === "limit" && price && amount
    ? (parseFloat(price) * parseFloat(amount)).toFixed(2)
    : currentPrice && amount
    ? (currentPrice * parseFloat(amount)).toFixed(2)
    : "0.00";

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Place Order</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="live-mode" className="text-sm text-muted-foreground">
                {useLiveExchange ? "Live Exchange" : "Simulated"}
              </Label>
              <Switch
                id="live-mode"
                checked={useLiveExchange}
                onCheckedChange={setUseLiveExchange}
              />
            </div>
          </div>
          {useLiveExchange && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 mt-2">
              <AlertCircle className="h-3 w-3" />
              <span>Real money will be used for this order</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Side */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={orderSide === "buy" ? "default" : "outline"}
              className={orderSide === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => setOrderSide("buy")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy
            </Button>
            <Button
              variant={orderSide === "sell" ? "default" : "outline"}
              className={orderSide === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
              onClick={() => setOrderSide("sell")}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell
            </Button>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market Order</SelectItem>
                <SelectItem value="limit">Limit Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price (only for limit orders) */}
          {orderType === "limit" && (
            <div className="space-y-2">
              <Label>Price (USDT)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount ({selectedPair.split("/")[0]})</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Advanced Options - Stop Loss & Take Profit */}
          <div className="border-t pt-4 space-y-4">
            <Label className="text-sm font-semibold">Advanced Order Types</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Stop Loss (USDT)</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-sell if price {orderSide === "buy" ? "drops to" : "rises to"} this level
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Take Profit (USDT)</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-sell if price {orderSide === "buy" ? "rises to" : "drops to"} this level
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="space-y-2">
            <Label>Total (USDT)</Label>
            <div className="text-2xl font-bold">{total}</div>
          </div>

          {/* Place Order Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={placeSimulatedOrder.isLoading || placeLiveOrder.isLoading}
          >
            {placeSimulatedOrder.isLoading || placeLiveOrder.isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place ${orderSide === "buy" ? "Buy" : "Sell"} Order`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Order Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Please review your order details before confirming
            </DialogDescription>
          </DialogHeader>

          {pendingOrder && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trading Pair:</span>
                <span className="font-semibold">{pendingOrder.pair}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Side:</span>
                <Badge variant={pendingOrder.side === "buy" ? "default" : "destructive"}>
                  {pendingOrder.side.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-semibold">{pendingOrder.type.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">{pendingOrder.price} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{pendingOrder.amount} {pendingOrder.pair.split("/")[0]}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-xl font-bold">{pendingOrder.total} USDT</span>
              </div>

              {useLiveExchange && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-500">Live Exchange Order</p>
                    <p className="text-muted-foreground mt-1">
                      This order will be executed on a real exchange using real funds. Make sure you have sufficient balance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmOrder} disabled={placeSimulatedOrder.isLoading || placeLiveOrder.isLoading}>
              {placeSimulatedOrder.isLoading || placeLiveOrder.isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
