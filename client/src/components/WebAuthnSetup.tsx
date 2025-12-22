/**
 * WebAuthn Setup Component
 * 
 * Allows users to register biometric authentication (Face ID, Touch ID, Windows Hello)
 * and manage their passkeys
 */

import { useState } from "react";
import { Fingerprint, Smartphone, Key, Trash2, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";

interface WebAuthnCredential {
  id: number;
  deviceName: string | null;
  deviceType: string | null;
  lastUsed: Date | null;
  createdAt: Date;
}

export function WebAuthnSetup() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  
  const utils = trpc.useUtils();
  
  // Fetch user's registered credentials
  const { data: credentials, isLoading } = trpc.webauthn.listCredentials.useQuery();
  
  // Registration mutation
  const registerMutation = trpc.webauthn.register.useMutation({
    onSuccess: () => {
      toast.success("Biometric authentication registered successfully!");
      utils.webauthn.listCredentials.invalidate();
      setIsRegistering(false);
      setDeviceName("");
    },
    onError: (error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });
  
  // Delete mutation
  const deleteMutation = trpc.webauthn.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success("Passkey removed successfully");
      utils.webauthn.listCredentials.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to remove passkey: ${error.message}`);
    },
  });
  
  const handleRegister = async () => {
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }
    
    try {
      setIsRegistering(true);
      
      // Step 1: Get registration options from server
      const options = await registerMutation.mutateAsync({ deviceName });
      
      // Step 2: Start WebAuthn registration ceremony
      const registrationResponse = await startRegistration(options);
      
      // Step 3: Verify registration on server
      await registerMutation.mutateAsync({
        deviceName,
        registrationResponse,
      });
      
    } catch (error: any) {
      console.error("WebAuthn registration error:", error);
      
      if (error.name === "NotAllowedError") {
        toast.error("Registration cancelled or not allowed");
      } else if (error.name === "NotSupportedError") {
        toast.error("WebAuthn not supported on this device");
      } else {
        toast.error(`Registration failed: ${error.message}`);
      }
      
      setIsRegistering(false);
    }
  };
  
  const handleDelete = (credentialId: number) => {
    if (confirm("Are you sure you want to remove this passkey?")) {
      deleteMutation.mutate({ credentialId });
    }
  };
  
  // Check if WebAuthn is supported
  const isWebAuthnSupported = typeof window !== "undefined" && 
    window.PublicKeyCredential !== undefined;
  
  if (!isWebAuthnSupported) {
    return (
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-yellow-300 mb-1">WebAuthn Not Supported</div>
            <div className="text-gray-400">
              Your browser or device does not support biometric authentication.
              Please use a modern browser (Chrome, Safari, Edge) or device with biometric capabilities.
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Biometric Authentication</h3>
        <p className="text-sm text-gray-400">
          Use Face ID, Touch ID, or Windows Hello to sign in securely without passwords.
        </p>
      </div>
      
      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <Fingerprint className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-sm font-medium text-gray-200">Passwordless</div>
          <div className="text-xs text-gray-400 mt-1">No passwords to remember</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <Key className="w-5 h-5 text-green-400 mb-2" />
          <div className="text-sm font-medium text-gray-200">Phishing-Proof</div>
          <div className="text-xs text-gray-400 mt-1">Cannot be stolen or phished</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <Smartphone className="w-5 h-5 text-purple-400 mb-2" />
          <div className="text-sm font-medium text-gray-200">Fast & Easy</div>
          <div className="text-xs text-gray-400 mt-1">Sign in with one touch</div>
        </div>
      </div>
      
      {/* Registered Passkeys */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading passkeys...</div>
      ) : credentials && credentials.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Your Passkeys</h4>
          <div className="space-y-2">
            {credentials.map((cred: WebAuthnCredential) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    {cred.deviceType === "platform" ? (
                      <Fingerprint className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Key className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">
                      {cred.deviceName || "Unnamed Device"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {cred.lastUsed 
                        ? `Last used ${new Date(cred.lastUsed).toLocaleDateString()}`
                        : `Added ${new Date(cred.createdAt).toLocaleDateString()}`
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cred.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No passkeys registered yet. Add one below to get started.
        </div>
      )}
      
      {/* Add New Passkey */}
      <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/30">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Add New Passkey</h4>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Device name (e.g., iPhone 15, MacBook Pro)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            disabled={isRegistering}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleRegister}
            disabled={isRegistering || !deviceName.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isRegistering ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Passkey</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          You'll be prompted to use your device's biometric authentication (Face ID, Touch ID, or Windows Hello).
        </p>
      </div>
      
      {/* Security Note */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-blue-300 mb-1">Secure & Private</div>
            <div className="text-gray-400">
              Your biometric data never leaves your device. We only store a cryptographic key that
              can only be used with your registered device.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
