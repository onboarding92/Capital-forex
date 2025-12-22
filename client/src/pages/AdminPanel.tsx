import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, Edit } from "lucide-react";
import { SUPPORTED_ASSETS } from "@shared/const";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("staking");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage exchange settings and content</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="staking">Staking Plans</TabsTrigger>
            <TabsTrigger value="promos">Promo Codes</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="staking" className="mt-6">
            <StakingPlansManager />
          </TabsContent>

          <TabsContent value="promos" className="mt-6">
            <PromoCodesManager />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function StakingPlansManager() {
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState("BTC");
  const [name, setName] = useState("");
  const [apr, setApr] = useState("");
  const [duration, setDuration] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const { data: plans, refetch } = trpc.staking.plans.useQuery();

  const createPlan = trpc.admin.createStakingPlan.useMutation({
    onSuccess: () => {
      toast.success("Staking plan created!");
      setOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePlan = trpc.admin.deleteStakingPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan deleted!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setAsset("BTC");
    setName("");
    setApr("");
    setDuration("");
    setMinAmount("");
    setMaxAmount("");
  };

  const handleCreate = () => {
    if (!name || !apr || !duration || !minAmount) {
      toast.error("Please fill all required fields");
      return;
    }
    createPlan.mutate({
      asset,
      name,
      apr: parseFloat(apr),
      lockDays: parseInt(duration),
      minAmount: parseFloat(minAmount),
      enabled: true,
    });
  };

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Staking Plans</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staking Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Asset</Label>
                <Select value={asset} onValueChange={setAsset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_ASSETS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan Name</Label>
                <Input placeholder="e.g., Flexible 30 Days" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>APR (%)</Label>
                <Input type="number" placeholder="e.g., 8.5" value={apr} onChange={(e) => setApr(e.target.value)} />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" placeholder="e.g., 30" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div>
                <Label>Min Amount</Label>
                <Input type="number" placeholder="e.g., 0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
              </div>
              <div>
                <Label>Max Amount (optional)</Label>
                <Input type="number" placeholder="e.g., 10" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Asset</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-right py-3 px-4">APR</th>
                <th className="text-right py-3 px-4">Duration</th>
                <th className="text-right py-3 px-4">Min Amount</th>
                <th className="text-right py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan) => (
                <tr key={plan.id} className="border-b border-border/50">
                  <td className="py-3 px-4">{plan.asset}</td>
                  <td className="py-3 px-4">{plan.name}</td>
                  <td className="text-right py-3 px-4">{plan.apr}%</td>
                  <td className="text-right py-3 px-4">{plan.lockDays} days</td>
                  <td className="text-right py-3 px-4">{plan.minAmount}</td>
                  <td className="text-right py-3 px-4">
                    <span className={plan.enabled ? "text-green-500" : "text-red-500"}>
                      {plan.enabled ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePlan.mutate({ id: plan.id })}
                      disabled={deletePlan.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PromoCodesManager() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [bonusType, setBonusType] = useState<"fixed" | "percentage">("fixed");
  const [bonusValue, setBonusValue] = useState("");
  const [bonusAsset, setBonusAsset] = useState("USDT");
  const [maxUses, setMaxUses] = useState("100");

  const { data: promos, refetch } = trpc.admin.listPromoCodes.useQuery();

  const createPromo = trpc.admin.createPromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code created!");
      setOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePromo = trpc.admin.deletePromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code deleted!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setCode("");
    setBonusValue("");
    setMaxUses("100");
  };

  const handleCreate = () => {
    if (!code || !bonusValue) {
      toast.error("Please fill all required fields");
      return;
    }
    createPromo.mutate({
      code: code.toUpperCase(),
      bonusType,
      bonusValue,
      bonusAsset,
      maxUses: parseInt(maxUses),
    });
  };

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Promo Codes</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Promo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Promo Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input placeholder="e.g., WELCOME2024" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <Label>Bonus Type</Label>
                <Select value={bonusType} onValueChange={(v: any) => setBonusType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bonus Value</Label>
                <Input
                  type="number"
                  placeholder={bonusType === "fixed" ? "e.g., 50" : "e.g., 10"}
                  value={bonusValue}
                  onChange={(e) => setBonusValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Bonus Asset</Label>
                <Select value={bonusAsset} onValueChange={setBonusAsset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_ASSETS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input type="number" placeholder="e.g., 100" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createPromo.isPending}>
                {createPromo.isPending ? "Creating..." : "Create Promo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Code</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-right py-3 px-4">Value</th>
                <th className="text-right py-3 px-4">Asset</th>
                <th className="text-right py-3 px-4">Used/Max</th>
                <th className="text-right py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos?.map((promo) => (
                <tr key={promo.id} className="border-b border-border/50">
                  <td className="py-3 px-4 font-mono">{promo.code}</td>
                  <td className="py-3 px-4 capitalize">{promo.bonusType}</td>
                  <td className="text-right py-3 px-4">{promo.bonusValue}</td>
                  <td className="text-right py-3 px-4">{promo.bonusAsset}</td>
                  <td className="text-right py-3 px-4">{promo.usedCount}/{promo.maxUses}</td>
                  <td className="text-right py-3 px-4">
                    <span className={promo.enabled ? "text-green-500" : "text-red-500"}>
                      {promo.enabled ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePromo.mutate({ id: promo.id })}
                      disabled={deletePromo.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersManager() {
  const { data: users, refetch } = trpc.admin.listUsers.useQuery();

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Users Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">KYC Status</th>
                <th className="text-right py-3 px-4">Registered</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b border-border/50">
                  <td className="py-3 px-4">{user.id}</td>
                  <td className="py-3 px-4">{user.email || "N/A"}</td>
                  <td className="py-3 px-4">{user.name || "N/A"}</td>
                  <td className="py-3 px-4">
                    <Select
                      value={user.role}
                      onValueChange={(role: "user" | "admin") => {
                        updateRole.mutate({ userId: user.id, role });
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4 capitalize">{user.kycStatus}</td>
                  <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
