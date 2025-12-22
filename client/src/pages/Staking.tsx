import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Lock, TrendingUp, Clock, Coins, Calculator, DollarSign, Percent } from "lucide-react";

export default function Staking() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: plans } = trpc.staking.plans.useQuery();
  const { data: positions, refetch: refetchPositions } = trpc.staking.myPositions.useQuery();

  const stakeMutation = trpc.staking.stake.useMutation({
    onSuccess: () => {
      toast.success("Staking position created!");
      setDialogOpen(false);
      setStakeAmount("");
      refetchPositions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unstakeMutation = trpc.staking.unstake.useMutation({
    onSuccess: (data) => {
      toast.success(`Unstaked! Reward: ${data.reward}`);
      refetchPositions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStake = () => {
    if (!selectedPlan || !stakeAmount) {
      toast.error("Please enter amount");
      return;
    }
    stakeMutation.mutate({
      planId: selectedPlan.id,
      amount: stakeAmount,
    });
  };

  const activePositions = positions?.filter(p => p.status === "active") || [];
  const completedPositions = positions?.filter(p => p.status === "withdrawn") || [];

  const calculateReward = (position: any, plan: any) => {
    const now = new Date();
    const started = new Date(position.startedAt);
    const daysPassed = (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24);
    const principal = parseFloat(position.amount);
    const apr = parseFloat(plan?.apr || "0");
    return (principal * apr * daysPassed) / (365 * 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Staking</h1>
          <p className="text-muted-foreground">Earn passive income by staking your crypto</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staked</p>
                <h3 className="text-3xl font-bold mt-1">
                  ${activePositions.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                </h3>
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Earning rewards
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rewards Earned</p>
                <h3 className="text-3xl font-bold mt-1">
                  ${activePositions.reduce((sum, p) => {
                    const plan = plans?.find(pl => pl.id === p.planId);
                    return sum + (plan ? calculateReward(p, plan) : 0);
                  }, 0).toFixed(2)}
                </h3>
                <p className="text-xs text-blue-500 mt-1">Accrued interest</p>
              </div>
              <Coins className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average APY</p>
                <h3 className="text-3xl font-bold mt-1">
                  {plans && plans.length > 0 
                    ? (plans.reduce((sum, p) => sum + parseFloat(p.apr), 0) / plans.length).toFixed(2)
                    : "0.00"}%
                </h3>
                <p className="text-xs text-purple-500 mt-1">Across all plans</p>
              </div>
              <Percent className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Earning Calculator */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">Earning Calculator</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label className="text-xs">Amount to Stake</Label>
              <Input
                type="number"
                placeholder="1000"
                className="mt-1"
                id="calc-amount"
              />
            </div>
            <div>
              <Label className="text-xs">APY %</Label>
              <Input
                type="number"
                placeholder="12"
                className="mt-1"
                id="calc-apy"
              />
            </div>
            <div>
              <Label className="text-xs">Lock Period (days)</Label>
              <Input
                type="number"
                placeholder="30"
                className="mt-1"
                id="calc-days"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground">Estimated Earnings</p>
                <p className="text-2xl font-bold text-primary">$0.00</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Tip: Longer lock periods typically offer higher APY rates. Compound your rewards for maximum returns!
          </p>
        </Card>

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Available Staking Plans
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans?.map((plan) => (
              <Card key={plan.id} className="glass border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:scale-[1.02] duration-200">
                <CardHeader className="relative">
                  {/* Large APY Badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-full shadow-lg">
                    <div className="text-2xl font-bold">{parseFloat(plan.apr).toFixed(1)}%</div>
                    <div className="text-[10px] font-medium">APY</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    Earn up to ${((parseFloat(plan.minAmount) * parseFloat(plan.apr) * plan.lockDays) / (365 * 100)).toFixed(2)} in {plan.lockDays} days
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset:</span>
                      <span className="font-medium">{plan.asset}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lock Period:</span>
                      <span className="font-medium">{plan.lockDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Amount:</span>
                      <span className="font-medium">{parseFloat(plan.minAmount).toFixed(2)} {plan.asset}</span>
                    </div>
                  </div>

                  <Dialog open={dialogOpen && selectedPlan?.id === plan.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) setSelectedPlan(plan);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="w-full gradient-primary">
                        <Lock className="mr-2 h-4 w-4" /> Stake Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Stake {plan.asset}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            placeholder={`Min: ${plan.minAmount}`}
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>APR: {parseFloat(plan.apr).toFixed(2)}%</div>
                          <div>Lock Period: {plan.lockDays} days</div>
                          <div>
                            Estimated Reward: {stakeAmount ? ((parseFloat(stakeAmount) * parseFloat(plan.apr) * plan.lockDays) / (365 * 100)).toFixed(4) : "0"} {plan.asset}
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleStake}
                          disabled={stakeMutation.isPending}
                        >
                          {stakeMutation.isPending ? "Staking..." : "Confirm Stake"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Active Positions */}
        {activePositions.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Active Positions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activePositions.map((position) => {
                const plan = plans?.find(p => p.id === position.planId);
                const reward = plan ? calculateReward(position, plan) : 0;
                const maturesAt = position.maturesAt ? new Date(position.maturesAt) : null;
                const isLocked = maturesAt ? new Date() < maturesAt : false;

                return (
                  <Card key={position.id} className="glass border-accent/20">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{plan?.name || "Staking"}</span>
                        <span className="text-sm font-normal text-muted-foreground">{plan?.asset}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Staked Amount:</span>
                          <span className="font-medium">{parseFloat(position.amount).toFixed(4)} {plan?.asset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Reward:</span>
                          <span className="font-medium text-green-500">+{reward.toFixed(4)} {plan?.asset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">APR:</span>
                          <span className="font-medium">{plan ? parseFloat(plan.apr).toFixed(2) : "0"}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span className="font-medium">{new Date(position.startedAt).toLocaleDateString()}</span>
                        </div>
                        {maturesAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Matures:</span>
                            <span className="font-medium">{maturesAt.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        variant={isLocked ? "outline" : "default"}
                        onClick={() => unstakeMutation.mutate({ positionId: position.id })}
                        disabled={isLocked || unstakeMutation.isPending}
                      >
                        {isLocked ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" /> Locked
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-2 h-4 w-4" /> Unstake & Claim
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Positions */}
        {completedPositions.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Completed Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Reward</th>
                      <th className="text-right py-3 px-4">Withdrawn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedPositions.map((position) => {
                      const plan = plans?.find(p => p.id === position.planId);
                      return (
                        <tr key={position.id} className="border-b border-border/50">
                          <td className="py-3 px-4">{plan?.name || "Staking"}</td>
                          <td className="text-right py-3 px-4">{parseFloat(position.amount).toFixed(4)} {plan?.asset}</td>
                          <td className="text-right py-3 px-4 text-green-500">+{parseFloat(position.rewards).toFixed(4)} {plan?.asset}</td>
                          <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                            {position.withdrawnAt ? new Date(position.withdrawnAt).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activePositions.length === 0 && completedPositions.length === 0 && (
          <Card className="glass">
            <CardContent className="text-center py-12">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No staking positions yet. Choose a plan above to start earning!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
