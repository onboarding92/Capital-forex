import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock } from "lucide-react";

export default function KYCSubmission() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const submitKYC = trpc.kyc.submit.useMutation();

  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "idFront" | "idBack" | "selfie") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(`File ${file.name} is too large. Maximum size is 5MB.`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(`File ${file.name} is not an image.`);
      return;
    }

    setError("");
    if (type === "idFront") setIdFront(file);
    else if (type === "idBack") setIdBack(file);
    else setSelfie(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!idFront || !idBack || !selfie) {
      setError("Please upload all required documents.");
      return;
    }

    setUploading(true);

    try {
      // Convert files to base64
      const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const [idFrontData, idBackData, selfieData] = await Promise.all([
        toBase64(idFront),
        toBase64(idBack),
        toBase64(selfie)
      ]);

      await submitKYC.mutateAsync({
        idFrontData,
        idBackData,
        selfieData,
        idFrontName: idFront.name,
        idBackName: idBack.name,
        selfieName: selfie.name,
      });

      // Redirect to profile after successful submission
      setLocation("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to submit KYC documents. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  // Check KYC status
  const kycStatus = user.kycStatus;
  const canSubmit = kycStatus === "pending" || kycStatus === "rejected";

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/profile")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Profile
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>KYC Verification</CardTitle>
          <CardDescription>
            Submit your identity documents for verification. All information is encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status indicator */}
          {kycStatus !== "pending" && kycStatus !== "rejected" && (
            <Alert className="mb-6">
              <div className="flex items-center gap-2">
                {kycStatus === "submitted" && (
                  <>
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                      Your KYC documents are under review. We'll notify you once the review is complete.
                    </AlertDescription>
                  </>
                )}
                {kycStatus === "approved" && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Your KYC verification is approved. You have full access to all features.
                    </AlertDescription>
                  </>
                )}
                {kycStatus === "expired" && (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription>
                      Your KYC verification has expired. Please submit new documents.
                    </AlertDescription>
                  </>
                )}
              </div>
            </Alert>
          )}

          {kycStatus === "rejected" && user.kycRejectedReason && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rejected:</strong> {user.kycRejectedReason}
              </AlertDescription>
            </Alert>
          )}

          {!canSubmit ? (
            <div className="text-center py-8 text-muted-foreground">
              {kycStatus === "approved" ? "Your KYC is already approved." : "Your KYC is currently under review."}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ID Front */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ID Card / Passport (Front) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "idFront")}
                    className="hidden"
                    id="idFront"
                  />
                  <label htmlFor="idFront" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {idFront ? idFront.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </label>
                </div>
              </div>

              {/* ID Back */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ID Card / Passport (Back) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "idBack")}
                    className="hidden"
                    id="idBack"
                  />
                  <label htmlFor="idBack" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {idBack ? idBack.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Selfie */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Selfie with ID <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "selfie")}
                    className="hidden"
                    id="selfie"
                  />
                  <label htmlFor="selfie" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {selfie ? selfie.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 5MB
                    </p>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Take a clear selfie holding your ID document next to your face
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || !idFront || !idBack || !selfie}
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : "Submit for Verification"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
