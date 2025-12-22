import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Upload, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export default function KYC() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [documentType, setDocumentType] = useState<"id_card" | "passport" | "drivers_license">("id_card");
  
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [proofAddress, setProofAddress] = useState<File | null>(null);

  const { data: kycStatus } = trpc.kyc.status.useQuery();

  const submitKyc = trpc.kyc.submit.useMutation({
    onSuccess: () => {
      toast.success("KYC submitted successfully! Awaiting admin approval.");
      setFirstName("");
      setLastName("");
      setDateOfBirth("");
      setAddress("");
      setCity("");
      setCountry("");
      setPostalCode("");
      setFrontImage(null);
      setBackImage(null);
      setSelfieImage(null);
      setProofAddress(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("File upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setter(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !dateOfBirth || !address || !city || !country || !postalCode) {
      toast.error("Please fill all personal information fields");
      return;
    }

    if (!frontImage) {
      toast.error("Please upload front image of your document");
      return;
    }

    toast.info("Uploading documents...");

    try {
      const frontImageUrl = await uploadFile(frontImage);
      const backImageUrl = backImage ? await uploadFile(backImage) : undefined;
      const selfieUrl = selfieImage ? await uploadFile(selfieImage) : undefined;
      const proofOfAddressUrl = proofAddress ? await uploadFile(proofAddress) : undefined;

      submitKyc.mutate({
        firstName,
        lastName,
        dateOfBirth,
        address,
        city,
        country,
        postalCode,
        documentType,
        frontImageUrl,
        backImageUrl,
        selfieUrl,
        proofOfAddressUrl,
      });
    } catch (error) {
      toast.error("Failed to upload documents. Please try again.");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Approved</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-2 text-yellow-500">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">Pending Review</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            <span className="font-semibold">Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">KYC Verification</h1>
          <p className="text-muted-foreground">Complete your identity verification to unlock all features</p>
        </div>

        {kycStatus && kycStatus.status !== "pending" ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>KYC Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getStatusBadge(kycStatus.status)}
                {kycStatus.adminNote && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-1">Admin Note:</p>
                    <p className="text-sm text-muted-foreground">{kycStatus.adminNote}</p>
                  </div>
                )}
                {kycStatus.status === "rejected" && (
                  <Button onClick={() => window.location.reload()}>
                    Submit New Application
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Please provide accurate information as shown on your ID</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Address *</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      required
                    />
                  </div>
                  <div>
                    <Label>Country *</Label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                      required
                    />
                  </div>
                  <div>
                    <Label>Postal Code *</Label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="10001"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass mt-6">
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>Upload clear photos of your identification documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id_card">ID Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Document Front * (Max 5MB)</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {frontImage ? frontImage.name : "Click to upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setFrontImage)}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Document Back (Max 5MB)</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {backImage ? backImage.name : "Click to upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setBackImage)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Selfie with Document (Max 5MB)</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {selfieImage ? selfieImage.name : "Click to upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setSelfieImage)}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hold your ID next to your face
                    </p>
                  </div>

                  <div>
                    <Label>Proof of Address (Max 5MB)</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {proofAddress ? proofAddress.name : "Click to upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setProofAddress)}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Utility bill, bank statement, etc.
                    </p>
                  </div>
                </div>

                <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>All documents must be clear and readable</li>
                    <li>Photos must show all four corners of the document</li>
                    <li>No glare or shadows on the document</li>
                    <li>Documents must be valid (not expired)</li>
                    <li>File size limit: 5MB per file</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary"
                  disabled={submitKyc.isPending}
                >
                  {submitKyc.isPending ? "Submitting..." : "Submit KYC Application"}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
