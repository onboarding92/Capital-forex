import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Wallet, Plus, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

export default function HotWallets() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [asset, setAsset] = useState("");

  const { data: wallets, isLoading, refetch } = trpc.admin.hotWallets.useQuery();
  
  const createWallet = trpc.admin.createHotWallet.useMutation({
    onSuccess: () => {
      toast.success("Hot wallet created successfully");
      setShowCreateDialog(false);
      setNetwork("");
      setAddress("");
      setPrivateKey("");
      setAsset("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!network || !address || !privateKey || !asset) {
      toast.error("All fields are required");
      return;
    }

    // In production, encrypt the private key before sending
    createWallet.mutate({
      network,
      address,
      encryptedPrivateKey: privateKey, // Should be encrypted client-side
      asset,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Hot Wallet Management</h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-slate-600 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Hot Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Network</Label>
                    <Input
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      placeholder="BTC, ETH, TRX, BNB, SOL, MATIC"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Asset</Label>
                    <Input
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                      placeholder="BTC, ETH, USDT, USDC, etc."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Address</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Wallet address"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Private Key</Label>
                    <Input
                      type="password"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Private key (will be encrypted)"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createWallet.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {createWallet.isPending ? "Creating..." : "Create Wallet"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-slate-800/90 border-slate-700">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Master Wallets</h2>
            {isLoading ? (
              <div className="text-center text-slate-400 py-8">Loading...</div>
            ) : !wallets || wallets.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No hot wallets found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">ID</TableHead>
                    <TableHead className="text-slate-300">Network</TableHead>
                    <TableHead className="text-slate-300">Asset</TableHead>
                    <TableHead className="text-slate-300">Address</TableHead>
                    <TableHead className="text-slate-300">Balance</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Created</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => (
                    <TableRow key={wallet.id} className="border-slate-700">
                      <TableCell className="text-white">{wallet.id}</TableCell>
                      <TableCell className="text-white font-semibold">{wallet.network}</TableCell>
                      <TableCell className="text-white">{wallet.asset}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                      </TableCell>
                      <TableCell className="text-white font-semibold">
                        {parseFloat(wallet.balance).toFixed(8)} {wallet.asset}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          wallet.isActive 
                            ? "bg-green-900/50 text-green-300" 
                            : "bg-red-900/50 text-red-300"
                        }`}>
                          {wallet.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(wallet.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
