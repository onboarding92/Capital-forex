import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Users, Target, Award, AlertCircle, Copy, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CopyTrading() {
  const [sortBy, setSortBy] = useState<"winRate" | "totalPnL" | "avgRoi" | "totalFollowers">("totalPnL");
  const [followDialogOpen, setFollowDialogOpen] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<any>(null);
  const [allocatedAmount, setAllocatedAmount] = useState("1000");
  const [maxRisk, setMaxRisk] = useState("2");
  const [copyRatio, setCopyRatio] = useState("100");

  const { data: topTraders, refetch: refetchTraders } = trpc.copyTrading.getTopTraders.useQuery({
    limit: 20,
    sortBy,
  });

  const { data: myFollows, refetch: refetchFollows } = trpc.copyTrading.getMyFollowedTraders.useQuery();

  const followTrader = trpc.copyTrading.followTrader.useMutation({
    onSuccess: () => {
      toast.success("Successfully following trader!");
      setFollowDialogOpen(false);
      refetchTraders();
      refetchFollows();
      resetFollowForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unfollowTrader = trpc.copyTrading.unfollowTrader.useMutation({
    onSuccess: () => {
      toast.success("Successfully unfollowed trader");
      refetchFollows();
      refetchTraders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetFollowForm = () => {
    setAllocatedAmount("1000");
    setMaxRisk("2");
    setCopyRatio("100");
    setSelectedTrader(null);
  };

  const handleFollowClick = (trader: any) => {
    setSelectedTrader(trader);
    setFollowDialogOpen(true);
  };

  const handleFollowSubmit = () => {
    if (!selectedTrader) return;

    const amount = parseFloat(allocatedAmount);
    const risk = parseFloat(maxRisk);
    const ratio = parseFloat(copyRatio);

    if (isNaN(amount) || amount < 10) {
      toast.error("Allocated amount must be at least 10 USDT");
      return;
    }

    if (isNaN(risk) || risk < 0.1 || risk > 10) {
      toast.error("Max risk per trade must be between 0.1% and 10%");
      return;
    }

    if (isNaN(ratio) || ratio < 1 || ratio > 100) {
      toast.error("Copy ratio must be between 1% and 100%");
      return;
    }

    followTrader.mutate({
      traderId: selectedTrader.userId,
      allocatedAmount: amount,
      maxRiskPerTrade: risk,
      copyRatio: ratio,
    });
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore <= 3) return "bg-green-600";
    if (riskScore <= 6) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore <= 3) return "Conservative";
    if (riskScore <= 6) return "Moderate";
    return "Aggressive";
  };

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Copy Trading</h1>
            <p className="text-muted-foreground mt-2">
              Follow experienced traders and automatically copy their trades
            </p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Risk Warning:</strong> Copy trading involves risk. Past performance does not guarantee future results. Only invest what you can afford to lose.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList>
            <TabsTrigger value="discover">Discover Traders</TabsTrigger>
            <TabsTrigger value="following">My Followed Traders ({myFollows?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Sort by:</Label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalPnL">Total PnL</SelectItem>
                  <SelectItem value="winRate">Win Rate</SelectItem>
                  <SelectItem value="avgRoi">Average ROI</SelectItem>
                  <SelectItem value="totalFollowers">Followers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {topTraders?.map((trader) => (
                <Card key={trader.userId} className="glass">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {trader.username}
                          <Badge className={getRiskBadgeColor(trader.riskScore)}>
                            {getRiskLabel(trader.riskScore)}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{trader.bio || "No bio provided"}</CardDescription>
                      </div>
                      <Button onClick={() => handleFollowClick(trader)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Follow
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Total PnL</Label>
                        <p className={`text-lg font-bold ${parseFloat(trader.totalPnL) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {parseFloat(trader.totalPnL) >= 0 ? "+" : ""}
                          ${parseFloat(trader.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Win Rate</Label>
                        <p className="text-lg font-bold">{parseFloat(trader.winRate).toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Avg ROI</Label>
                        <p className="text-lg font-bold">{parseFloat(trader.avgRoi).toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Followers</Label>
                        <p className="text-lg font-bold flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {trader.totalFollowers}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Trades</Label>
                        <p className="text-sm font-medium">{trader.totalTrades}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Max Drawdown</Label>
                        <p className="text-sm font-medium text-red-500">{parseFloat(trader.maxDrawdown).toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Sharpe Ratio</Label>
                        <p className="text-sm font-medium">{parseFloat(trader.sharpeRatio).toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!topTraders || topTraders.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No traders available yet. Check back later!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="following" className="space-y-4">
            <div className="grid gap-4">
              {myFollows?.map((follow) => (
                <Card key={follow.id} className="glass">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {follow.traderUsername}
                          <Badge variant={follow.status === "active" ? "default" : "secondary"}>
                            {follow.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Following since {new Date(follow.startedAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {follow.status === "active" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to unfollow this trader?")) {
                              unfollowTrader.mutate({ followId: follow.id });
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Unfollow
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Allocated Amount</Label>
                        <p className="text-lg font-bold">${parseFloat(follow.allocatedAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Copy Ratio</Label>
                        <p className="text-lg font-bold">{parseFloat(follow.copyRatio).toFixed(0)}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total PnL</Label>
                        <p className={`text-lg font-bold ${parseFloat(follow.totalPnL) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {parseFloat(follow.totalPnL) >= 0 ? "+" : ""}
                          ${parseFloat(follow.totalPnL).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Copied Trades</Label>
                        <p className="text-lg font-bold">{follow.totalCopiedTrades}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!myFollows || myFollows.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Copy className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      You're not following any traders yet. Start by discovering top traders!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Follow Trader Dialog */}
        <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Follow {selectedTrader?.username}</DialogTitle>
              <DialogDescription>
                Configure your copy trading settings for this trader
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Allocated Amount (USDT)</Label>
                <Input
                  type="number"
                  min="10"
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(e.target.value)}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum amount to allocate for copying this trader's trades
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Risk Per Trade (%)</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum percentage of allocated amount to risk per trade (0.1% - 10%)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Copy Ratio (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={copyRatio}
                  onChange={(e) => setCopyRatio(e.target.value)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of trader's position size to copy (1% - 100%)
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your trades will be automatically executed when this trader places orders. Make sure you have sufficient balance.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleFollowSubmit} disabled={followTrader.isLoading}>
                {followTrader.isLoading ? "Following..." : "Follow Trader"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
