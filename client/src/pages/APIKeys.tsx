import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Key, Copy, Trash2, Plus, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function APIKeys() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState("100");
  const [permissions, setPermissions] = useState({
    trading: true,
    read: true,
    withdraw: false,
  });
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: string; apiSecret: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});

  const { data: apiKeys, refetch } = trpc.apiKey.list.useQuery();

  const generateKey = trpc.apiKey.generate.useMutation({
    onSuccess: (data) => {
      toast.success("API key generated successfully!");
      setGeneratedKey({ apiKey: data.apiKey, apiSecret: data.apiSecret });
      setSecretDialogOpen(true);
      setCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteKey = trpc.apiKey.delete.useMutation({
    onSuccess: () => {
      toast.success("API key deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setNewKeyName("");
    setRateLimit("100");
    setPermissions({ trading: true, read: true, withdraw: false });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    const selectedPermissions = Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([perm]) => perm);

    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    generateKey.mutate({
      name: newKeyName,
      permissions: selectedPermissions as any,
      rateLimit: parseInt(rateLimit),
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground mt-2">
              Manage your Trading Bot API keys for algorithmic trading
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> Never share your API secret with anyone. Store it securely and use it only in your trading applications.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {apiKeys?.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      {key.name}
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to revoke this API key?")) {
                          revokeKey.mutate({ keyId: key.id });
                        }
                      }}
                      disabled={!key.enabled}
                    >
                      {key.enabled ? "Revoke" : "Revoked"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
                          deleteKey.mutate({ keyId: key.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {key.key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key.key, "API Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Permissions</Label>
                    <div className="flex gap-1 mt-1">
                      {key.permissions.map((perm: string) => (
                        <Badge key={perm} variant="secondary">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate Limit</Label>
                    <p className="text-sm font-medium mt-1">{key.rateLimit} req/min</p>
                  </div>
                </div>

                {key.expiresAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Expires</Label>
                    <p className="text-sm font-medium mt-1">
                      {new Date(key.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {key.enabled ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Revoked
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {(!apiKeys || apiKeys.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No API keys yet. Create one to start using the Trading Bot API.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create API Key Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for your trading bot
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="My Trading Bot"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Rate Limit (requests per minute)</Label>
                <Input
                  type="number"
                  min="10"
                  max="1000"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm-trading"
                      checked={permissions.trading}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, trading: checked as boolean })
                      }
                    />
                    <label htmlFor="perm-trading" className="text-sm cursor-pointer">
                      Trading (place and cancel orders)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm-read"
                      checked={permissions.read}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, read: checked as boolean })
                      }
                    />
                    <label htmlFor="perm-read" className="text-sm cursor-pointer">
                      Read (view balances and orders)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="perm-withdraw"
                      checked={permissions.withdraw}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, withdraw: checked as boolean })
                      }
                    />
                    <label htmlFor="perm-withdraw" className="text-sm cursor-pointer">
                      Withdraw (initiate withdrawals)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={generateKey.isLoading}>
                {generateKey.isLoading ? "Generating..." : "Generate API Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Secret Display Dialog */}
        <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Generated Successfully!</DialogTitle>
              <DialogDescription>
                <strong className="text-yellow-600">Important:</strong> Save your API secret now. It won't be shown again!
              </DialogDescription>
            </DialogHeader>

            {generatedKey && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                      {generatedKey.apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedKey.apiKey, "API Key")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                      {generatedKey.apiSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedKey.apiSecret, "API Secret")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Store your API secret securely. You won't be able to view it again after closing this dialog.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => {
                setSecretDialogOpen(false);
                setGeneratedKey(null);
              }}>
                I've Saved My Credentials
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
