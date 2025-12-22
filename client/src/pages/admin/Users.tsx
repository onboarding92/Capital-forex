import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users as UsersIcon, Search, Edit, DollarSign, Activity, Download } from "lucide-react";
import { toast } from "sonner";

export default function UsersManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"admin" | "user" | undefined>();
  const [kycFilter, setKycFilter] = useState<"pending" | "approved" | "rejected" | undefined>();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  // Edit user state
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editKycStatus, setEditKycStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [editAccountStatus, setEditAccountStatus] = useState<"active" | "suspended">("active");

  // Balance adjustment state
  const [balanceAsset, setBalanceAsset] = useState("USDT");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"add" | "subtract">("add");
  const [balanceReason, setBalanceReason] = useState("");

  const { data, isLoading, refetch } = trpc.admin.users.useQuery({
    search,
    role: roleFilter,
    kycStatus: kycFilter,
    limit: 50,
    offset: 0,
  });

  const { data: activity } = trpc.admin.userActivity.useQuery(
    { userId: selectedUser?.id },
    { enabled: !!selectedUser && showActivityDialog }
  );

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setShowEditDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const adjustBalance = trpc.admin.adjustBalance.useMutation({
    onSuccess: () => {
      toast.success("Balance adjusted successfully");
      setShowBalanceDialog(false);
      setBalanceAmount("");
      setBalanceReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditUser = () => {
    if (!selectedUser) return;
    updateUser.mutate({
      userId: selectedUser.id,
      role: editRole,
      kycStatus: editKycStatus,
      accountStatus: editAccountStatus,
    });
  };

  const handleAdjustBalance = () => {
    if (!selectedUser || !balanceAmount || !balanceReason) {
      toast.error("All fields are required");
      return;
    }

    adjustBalance.mutate({
      userId: selectedUser.id,
      asset: balanceAsset,
      amount: balanceAmount,
      type: balanceType,
      reason: balanceReason,
    });
  };

  const exportToCSV = () => {
    if (!data?.users || data.users.length === 0) return;
    
    const headers = ["ID", "Email", "Name", "Role", "KYC Status", "Account Status", "Created At"].join(",");
    const rows = data.users.map(user => 
      [user.id, user.email, user.name || "", user.role, user.kycStatus, user.accountStatus || "active", new Date(user.createdAt).toISOString()].join(",")
    );
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">User Management</h1>
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="bg-slate-800/90 border-slate-700 p-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={(v: any) => setKycFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : !data?.users || data.users.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No users found</div>
          ) : (
            <>
              <div className="text-slate-400 text-sm mb-4">
                Showing {data.users.length} of {data.total} users
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">ID</TableHead>
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Role</TableHead>
                    <TableHead className="text-slate-300">KYC</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Created</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user: any) => (
                    <TableRow key={user.id} className="border-slate-700">
                      <TableCell className="text-white">{user.id}</TableCell>
                      <TableCell className="text-white">{user.email}</TableCell>
                      <TableCell className="text-slate-300">{user.name || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === "admin" 
                            ? "bg-purple-900/50 text-purple-300"
                            : "bg-blue-900/50 text-blue-300"
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.kycStatus === "approved" 
                            ? "bg-green-900/50 text-green-300"
                            : user.kycStatus === "pending"
                            ? "bg-yellow-900/50 text-yellow-300"
                            : "bg-red-900/50 text-red-300"
                        }`}>
                          {user.kycStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.accountStatus === "suspended"
                            ? "bg-red-900/50 text-red-300"
                            : "bg-green-900/50 text-green-300"
                        }`}>
                          {user.accountStatus || "active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditRole(user.role);
                              setEditKycStatus(user.kycStatus);
                              setEditAccountStatus(user.accountStatus || "active");
                              setShowEditDialog(true);
                            }}
                            className="border-slate-600 hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBalanceDialog(true);
                            }}
                            className="border-slate-600 hover:bg-slate-700"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowActivityDialog(true);
                            }}
                            className="border-slate-600 hover:bg-slate-700"
                          >
                            <Activity className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Role</Label>
                <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">KYC Status</Label>
                <Select value={editKycStatus} onValueChange={(v: any) => setEditKycStatus(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Account Status</Label>
                <Select value={editAccountStatus} onValueChange={(v: any) => setEditAccountStatus(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleEditUser}
                disabled={updateUser.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {updateUser.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Adjust Balance Dialog */}
        <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Adjust Balance: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Asset</Label>
                <Select value={balanceAsset} onValueChange={setBalanceAsset}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Type</Label>
                <Select value={balanceType} onValueChange={(v: any) => setBalanceType(v)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="subtract">Subtract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Amount</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Reason</Label>
                <Input
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Manual adjustment reason..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={handleAdjustBalance}
                disabled={adjustBalance.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {adjustBalance.isPending ? "Adjusting..." : "Adjust Balance"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Activity Dialog */}
        <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">User Activity: {selectedUser?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {activity?.deposits && activity.deposits.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Recent Deposits</h4>
                  <div className="space-y-2">
                    {activity.deposits.slice(0, 5).map((d: any) => (
                      <div key={d.id} className="bg-slate-700 p-3 rounded text-sm">
                        <div className="flex justify-between text-white">
                          <span>{d.asset}</span>
                          <span className="text-green-400">+{parseFloat(d.amount).toFixed(8)}</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {new Date(d.createdAt).toLocaleString()} • {d.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity?.withdrawals && activity.withdrawals.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Recent Withdrawals</h4>
                  <div className="space-y-2">
                    {activity.withdrawals.slice(0, 5).map((w: any) => (
                      <div key={w.id} className="bg-slate-700 p-3 rounded text-sm">
                        <div className="flex justify-between text-white">
                          <span>{w.asset}</span>
                          <span className="text-red-400">-{parseFloat(w.amount).toFixed(8)}</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {new Date(w.createdAt).toLocaleString()} • {w.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity?.logins && activity.logins.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Recent Logins</h4>
                  <div className="space-y-2">
                    {activity.logins.slice(0, 5).map((l: any) => (
                      <div key={l.id} className="bg-slate-700 p-3 rounded text-sm">
                        <div className="flex justify-between text-white">
                          <span>{l.ipAddress}</span>
                          <span className={l.success ? "text-green-400" : "text-red-400"}>
                            {l.success ? "Success" : "Failed"}
                          </span>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {new Date(l.createdAt).toLocaleString()} • {l.method}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
