import { useState } from "react";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast as showToast } from "sonner";
import { Shield, Copy, Download, Check } from "lucide-react";

export default function Setup2FA() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const setup2FA = trpc.auth.setup2FA.useMutation({
    onSuccess: (data) => {
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep("verify");
    },
    onError: (error) => {
      showToast.error(error.message);
    },
  });

  const enable2FA = trpc.auth.enable2FA.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep("backup");
      showToast.success("Two-factor authentication has been enabled successfully");
    },
    onError: (error) => {
      showToast.error(error.message);
    },
  });

  const handleSetup = () => {
    setup2FA.mutate();
  };

  const handleVerify = () => {
    if (token.length !== 6) {
      showToast.error("Please enter a 6-digit code");
      return;
    }
    enable2FA.mutate({ token });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    showToast.success("Secret key copied to clipboard");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const downloadBackupCodes = () => {
    const text = `BitChange Pro - 2FA Backup Codes\n\n${backupCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bitchange-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-slate-800/90 border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Setup Two-Factor Authentication</h1>
        </div>

        {step === "setup" && (
          <div className="space-y-6">
            <Alert className="bg-blue-900/30 border-blue-700">
              <AlertDescription className="text-blue-200">
                Two-factor authentication adds an extra layer of security to your account.
                You'll need to enter a code from your authenticator app when logging in.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">What you'll need:</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>Google Authenticator, Authy, or similar app</li>
                <li>Your smartphone or tablet</li>
                <li>A few minutes to complete setup</li>
              </ul>
            </div>

            <Button
              onClick={handleSetup}
              disabled={setup2FA.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {setup2FA.isPending ? "Setting up..." : "Start Setup"}
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Step 1: Scan QR Code</h3>
              <p className="text-slate-300">
                Open your authenticator app and scan this QR code:
              </p>
              
              <div className="flex justify-center p-6 bg-white rounded-lg">
                <QRCodeSVG value={qrCodeUrl} size={200} />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-400">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    onClick={copySecret}
                    variant="outline"
                    size="icon"
                    className="border-slate-600 hover:bg-slate-700"
                  >
                    {copiedSecret ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Step 2: Enter Verification Code</h3>
              <p className="text-slate-300">
                Enter the 6-digit code from your authenticator app:
              </p>
              <Input
                type="text"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={enable2FA.isPending || token.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {enable2FA.isPending ? "Verifying..." : "Verify and Enable 2FA"}
            </Button>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-6">
            <Alert className="bg-yellow-900/30 border-yellow-700">
              <AlertDescription className="text-yellow-200">
                <strong>Important:</strong> Save these backup codes in a safe place.
                You can use them to access your account if you lose your phone.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Backup Codes</h3>
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-700 rounded-lg">
                {backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="font-mono text-center py-2 px-4 bg-slate-800 rounded text-white"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                className="flex-1 border-slate-600 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Codes
              </Button>
              <Button
                onClick={() => setLocation("/dashboard")}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
