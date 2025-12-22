import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Wallet, TrendingUp, Lock, ArrowDownRight, ArrowUpRight, DollarSign, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { ASSET_NAMES } from "@shared/const";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: wallets, isLoading } = trpc.wallet.list.useQuery();

  const totalBalance = wallets?.reduce((sum, w) => sum + parseFloat(w.balance), 0) || 0;
  const totalAvailable = wallets?.reduce((sum, w) => sum + (parseFloat(w.balance) - parseFloat(w.locked)), 0) || 0;
  const totalLocked = wallets?.reduce((sum, w) => sum + parseFloat(w.locked), 0) || 0;
  const assetsWithBalance = wallets?.filter(w => parseFloat(w.balance) > 0) || [];

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-success";
      case "pending": return "text-warning";
      case "submitted": return "text-info";
      case "rejected": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getKYCStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "pending":
      case "submitted": return <AlertCircle className="h-5 w-5 text-warning" />;
      case "rejected": return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || "Trader"}!</h1>
          <p className="text-muted-foreground">Here's your portfolio overview and quick actions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {assetsWithBalance.length} {assetsWithBalance.length === 1 ? 'asset' : 'assets'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-success/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
              <Wallet className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-success">${totalAvailable.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready to trade
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-warning/20 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Locked</CardTitle>
              <Lock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-warning">${totalLocked.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    In orders & staking
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={`${user?.kycStatus === 'approved' ? 'border-success/20' : 'border-warning/20'} card-hover`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">KYC Status</CardTitle>
              {getKYCStatusIcon(user?.kycStatus || "pending")}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className={`text-2xl font-bold capitalize ${getKYCStatusColor(user?.kycStatus || "pending")}`}>
                    {user?.kycStatus || "Pending"}
                  </div>
                  {user?.kycStatus !== 'approved' && (
                    <Link href="/kyc">
                      <button className="text-xs text-primary hover:underline mt-1">
                        Complete verification →
                      </button>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/deposit">
                <Button className="w-full h-12 gradient-primary group">
                  <ArrowDownRight className="mr-2 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                  Deposit
                </Button>
              </Link>
              <Link href="/withdrawal">
                <Button variant="outline" className="w-full h-12 group">
                  <ArrowUpRight className="mr-2 h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                  Withdraw
                </Button>
              </Link>
              <Link href="/trading">
                <Button variant="outline" className="w-full h-12 group">
                  <TrendingUp className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  Trade
                </Button>
              </Link>
              <Link href="/staking">
                <Button variant="outline" className="w-full h-12 group">
                  <Lock className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  Stake
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Assets List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : assetsWithBalance.length > 0 ? (
              <div className="space-y-3">
                {assetsWithBalance.map((wallet) => {
                  const available = parseFloat(wallet.balance) - parseFloat(wallet.locked);
                  const locked = parseFloat(wallet.locked);
                  
                  return (
                    <div 
                      key={wallet.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <span className="text-base font-bold text-primary">{wallet.asset}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-base">
                            {ASSET_NAMES[wallet.asset as keyof typeof ASSET_NAMES] || wallet.asset}
                          </div>
                          <div className="text-sm text-muted-foreground">{wallet.asset}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-base">{parseFloat(wallet.balance).toFixed(8)}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-end gap-2">
                          <span className="text-success">Available: {available.toFixed(8)}</span>
                          {locked > 0 && (
                            <span className="text-warning">• Locked: {locked.toFixed(8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium text-lg">No assets yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Start by making a deposit to begin trading and staking cryptocurrencies
                  </p>
                </div>
                <Link href="/deposit">
                  <Button className="gradient-primary mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Make Your First Deposit
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
