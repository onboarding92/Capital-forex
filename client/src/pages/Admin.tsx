import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Users, TrendingUp, AlertCircle, CheckCircle2, XCircle, Clock,
  Shield, MessageSquare, Gift, FileText, Eye
} from "lucide-react";
import { ASSET_NAMES } from "@shared/const";

export default function Admin() {
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: withdrawals, refetch: refetchWithdrawals } = trpc.admin.withdrawals.useQuery();
  const { data: kycList, refetch: refetchKyc } = trpc.admin.kycList.useQuery();
  const { data: tickets } = trpc.admin.tickets.useQuery();

  const approveWithdrawal = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal approved!");
      refetchWithdrawals();
    },
  });

  const rejectWithdrawal = trpc.admin.rejectWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal rejected!");
      refetchWithdrawals();
    },
  });

  const approveKyc = trpc.admin.approveKyc.useMutation({
    onSuccess: () => {
      toast.success("KYC approved!");
      setSelectedKyc(null);
      refetchKyc();
    },
  });

  const rejectKyc = trpc.admin.rejectKyc.useMutation({
    onSuccess: () => {
      toast.success("KYC rejected!");
      setSelectedKyc(null);
      setRejectReason("");
      refetchKyc();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage exchange operations</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="glass border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.pendingWithdrawals || 0}</div>
            </CardContent>
          </Card>

          <Card className="glass border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Pending KYC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.pendingKyc || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="withdrawals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            {!withdrawals || withdrawals.length === 0 ? (
              <Card className="glass">
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No pending withdrawals</p>
                </CardContent>
              </Card>
            ) : (
              withdrawals.map((w) => (
                <Card key={w.id} className="glass">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {w.amount} {w.asset}
                        </CardTitle>
                        <CardDescription>
                          User ID: {w.userId} • {new Date(w.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-yellow-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-mono text-xs">{w.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee:</span>
                        <span>{w.fee} {w.asset}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => approveWithdrawal.mutate({ id: w.id })}
                        disabled={approveWithdrawal.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => rejectWithdrawal.mutate({ id: w.id })}
                        disabled={rejectWithdrawal.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-4">
            {!kycList || kycList.length === 0 ? (
              <Card className="glass">
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No pending KYC verifications</p>
                </CardContent>
              </Card>
            ) : (
              kycList.map((kyc) => (
                <Card key={kyc.id} className="glass">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {kyc.documentType.replace("_", " ")}
                        </CardTitle>
                        <CardDescription>
                          User ID: {kyc.userId} • {new Date(kyc.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-blue-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedKyc(kyc)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-4">
            {!tickets || tickets.length === 0 ? (
              <Card className="glass">
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No support tickets</p>
                </CardContent>
              </Card>
            ) : (
              tickets.map((ticket) => (
                <Card key={ticket.id} className="glass">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <CardDescription>
                          User ID: {ticket.userId} • {new Date(ticket.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          ticket.status === "open" ? "text-blue-500" :
                          ticket.status === "in_progress" ? "text-yellow-500" :
                          "text-green-500"
                        }>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className={
                          ticket.priority === "urgent" ? "text-red-500" :
                          ticket.priority === "high" ? "text-orange-500" :
                          "text-gray-500"
                        }>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Category: {ticket.category} | Priority: {ticket.priority}
                    </p>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Reply
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* KYC Document Dialog */}
      <Dialog open={!!selectedKyc} onOpenChange={() => setSelectedKyc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Documents Review</DialogTitle>
          </DialogHeader>
          {selectedKyc && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-2">Front Side</p>
                  <div className="border rounded-lg p-4 bg-muted">
                    <img src={selectedKyc.frontImageUrl} alt="Front" className="w-full" />
                  </div>
                </div>
                {selectedKyc.backImageUrl && (
                  <div>
                    <p className="text-sm font-medium mb-2">Back Side</p>
                    <div className="border rounded-lg p-4 bg-muted">
                      <img src={selectedKyc.backImageUrl} alt="Back" className="w-full" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Rejection Reason (optional)</p>
                <Textarea
                  placeholder="Enter reason if rejecting..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => approveKyc.mutate({ id: selectedKyc.id })}
                  disabled={approveKyc.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                  onClick={() => rejectKyc.mutate({ id: selectedKyc.id, reason: rejectReason })}
                  disabled={rejectKyc.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
