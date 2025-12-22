import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Key, Loader2, Lock, Shield, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WebAuthnSetup } from "@/components/WebAuthnSetup";

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const { data: user } = trpc.auth.me.useQuery();
  const { data: notificationPrefs, isLoading: prefsLoading } = trpc.notificationPreferences.get.useQuery();
  const utils = trpc.useUtils();

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const setup2FA = trpc.auth.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setShow2FASetup(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to setup 2FA");
    },
  });

  const enable2FA = trpc.auth.enable2FA.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      toast.success("2FA enabled successfully!");
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Invalid 2FA code");
      setTwoFactorCode("");
    },
  });

  const disable2FA = trpc.auth.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("2FA disabled successfully");
      setShow2FASetup(false);
      setQrCodeUrl("");
      setSecret("");
      setBackupCodes([]);
      setTwoFactorCode("");
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable 2FA");
    },
  });

  const updateNotificationPrefs = trpc.notificationPreferences.update.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences updated");
      utils.notificationPreferences.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update preferences");
    },
  });

  const handleSetup2FA = () => {
    setup2FA.mutate();
  };

  const handleEnable2FA = () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    enable2FA.mutate({ token: twoFactorCode });
  };

  const handleDisable2FA = () => {
    const password = prompt("Enter your password to disable 2FA:");
    if (!password) return;
    disable2FA.mutate({ password });
  };

  const copyToClipboard = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    changePassword.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your security settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={changePassword.isPending}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changePassword.isPending}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changePassword.isPending}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                type="submit"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication (2FA)
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable 2FA</Label>
                <p className="text-sm text-muted-foreground">
                  Require authentication code when signing in
                </p>
              </div>
              <Switch
                checked={user?.twoFactorEnabled || false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSetup2FA();
                  } else {
                    handleDisable2FA();
                  }
                }}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an additional layer of security to your account.
                When enabled, you'll need to provide a code from your authenticator app in addition
                to your password when signing in.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Biometric Authentication</CardTitle>
            <CardDescription>
              Use Face ID, Touch ID, or Windows Hello for secure passwordless login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebAuthnSetup />
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Trade Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your trades are executed
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.trade ?? true}
                    onCheckedChange={(checked) => updateNotificationPrefs.mutate({ trade: checked })}
                    disabled={updateNotificationPrefs.isPending}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Deposit Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when deposits are confirmed
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.deposit ?? true}
                    onCheckedChange={(checked) => updateNotificationPrefs.mutate({ deposit: checked })}
                    disabled={updateNotificationPrefs.isPending}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Withdrawal Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about withdrawal status updates
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.withdrawal ?? true}
                    onCheckedChange={(checked) => updateNotificationPrefs.mutate({ withdrawal: checked })}
                    disabled={updateNotificationPrefs.isPending}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about login attempts and security events
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs?.security ?? true}
                    onCheckedChange={(checked) => updateNotificationPrefs.mutate({ security: checked })}
                    disabled={updateNotificationPrefs.isPending}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage devices where you're currently signed in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">
                    Last active: Just now
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Current Device
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Session management features coming soon. You'll be able to view and revoke
                access from other devices.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          {backupCodes.length === 0 ? (
            <div className="space-y-4">
              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={qrCodeUrl} size={200} />
                </div>
              )}

              {/* Manual Entry */}
              {secret && (
                <div className="space-y-2">
                  <Label>Or enter this code manually:</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(secret, 'secret')}
                    >
                      {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label htmlFor="2fa-code">Enter 6-digit code from your app:</Label>
                <Input
                  id="2fa-code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShow2FASetup(false);
                    setQrCodeUrl("");
                    setSecret("");
                    setTwoFactorCode("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEnable2FA}
                  disabled={enable2FA.isPending || twoFactorCode.length !== 6}
                >
                  {enable2FA.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable 2FA
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Backup Codes Display */
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ Save these backup codes in a safe place!
                </p>
                <p className="text-xs text-yellow-700">
                  You can use these codes to access your account if you lose your authenticator device.
                  Each code can only be used once.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
              >
                {copiedBackup ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy All Codes
              </Button>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setShow2FASetup(false);
                    setQrCodeUrl("");
                    setSecret("");
                    setBackupCodes([]);
                    setTwoFactorCode("");
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
