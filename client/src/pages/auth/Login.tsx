import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, AlertCircle, Key, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Check if WebAuthn is available
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsBiometricAvailable(available))
        .catch(() => setIsBiometricAvailable(false));
    }
  }, []);

  const generateAuthOptions = trpc.webauthn.generateAuthenticationOptions.useMutation();
  const verifyAuth = trpc.webauthn.verifyAuthentication.useMutation({
    onSuccess: (data) => {
      // Set JWT token in cookie
      document.cookie = `token=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
      toast.success("Login successful!");
      setLocation("/dashboard");
      window.location.reload();
    },
    onError: (err) => {
      setError(err.message);
      setIsBiometricLoading(false);
    },
  });

  const handleBiometricLogin = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    setIsBiometricLoading(true);
    setError("");

    try {
      // Generate authentication options
      const options = await generateAuthOptions.mutateAsync({ email });

      // Start WebAuthn authentication
      const credential = await startAuthentication(options as any);

      // Verify authentication
      await verifyAuth.mutateAsync({ email, credential });
    } catch (err: any) {
      console.error("Biometric login error:", err);
      if (err.message?.includes("No biometric credentials")) {
        setError("No biometric authentication set up. Please login with password and set it up in Account Settings.");
      } else if (err.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled");
      } else {
        setError(err.message || "Biometric authentication failed");
      }
      setIsBiometricLoading(false);
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      // Redirect to dashboard
      setLocation("/dashboard");
      window.location.reload(); // Reload to update auth context
    },
    onError: (err) => {
      // Check if 2FA is required
      if (err.message.includes("2FA") || err.message.includes("two-factor")) {
        setRequires2FA(true);
        setError("");
      } else {
        setError(err.message);
      }
    },
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (requires2FA) {
      if (useBackupCode) {
        if (!backupCode || backupCode.length < 8) {
          setError("Please enter a valid backup code");
          return;
        }
      } else {
        if (!twoFactorCode || twoFactorCode.length !== 6) {
          setError("Please enter a valid 6-digit code");
          return;
        }
      }
    }

    loginMutation.mutate({ 
      email, 
      password,
      ...(requires2FA && !useBackupCode && { twoFactorCode }),
      ...(requires2FA && useBackupCode && { backupCode })
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your BitChange account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loginMutation.isPending}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password">
                  <a className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loginMutation.isPending}
                  required
                />
              </div>
            </div>

            {/* 2FA Code Input (shown when 2FA is required) */}
            {requires2FA && (
              <div className="space-y-2">
                {!useBackupCode ? (
                  <>
                    <Label htmlFor="2fa-code">Two-Factor Authentication Code</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="2fa-code"
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                        className="pl-10 text-center text-xl tracking-widest font-mono"
                        disabled={loginMutation.isPending}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your authenticator app
                      </p>
                      <button
                        type="button"
                        onClick={() => setUseBackupCode(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Use backup code
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Label htmlFor="backup-code">Backup Code</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="backup-code"
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                        className="pl-10 font-mono"
                        disabled={loginMutation.isPending}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Enter one of your backup codes
                      </p>
                      <button
                        type="button"
                        onClick={() => setUseBackupCode(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        Use authenticator
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || isBiometricLoading}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {isBiometricAvailable && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBiometricLogin}
                  disabled={loginMutation.isPending || isBiometricLoading || !email}
                >
                  {isBiometricLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Use Face ID / Touch ID
                    </>
                  )}
                </Button>
              </>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/auth/register">
                <a className="text-primary hover:underline font-medium">
                  Sign up
                </a>
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
