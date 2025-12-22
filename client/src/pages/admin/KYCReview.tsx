import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { CheckCircle, XCircle, Eye, Clock, FileText } from "lucide-react";

export default function KYCReview() {
  const { data: pendingKYCs, isLoading, refetch } = trpc.kyc.getPending.useQuery();
  const approveKYC = trpc.kyc.approve.useMutation();
  const rejectKYC = trpc.kyc.reject.useMutation();

  const [selectedKYC, setSelectedKYC] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const handleApprove = async (kycId: number) => {
    try {
      await approveKYC.mutateAsync({ kycId });
      refetch();
      setShowApproveDialog(false);
      setSelectedKYC(null);
    } catch (error: any) {
      alert(error.message || "Failed to approve KYC");
    }
  };

  const handleReject = async (kycId: number) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      await rejectKYC.mutateAsync({ kycId, reason: rejectReason });
      refetch();
      setShowRejectDialog(false);
      setSelectedKYC(null);
      setRejectReason("");
    } catch (error: any) {
      alert(error.message || "Failed to reject KYC");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">KYC Review</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve/reject user KYC submissions
        </p>
      </div>

      {!pendingKYCs || pendingKYCs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No pending KYC submissions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingKYCs.map((kyc: any) => (
            <Card key={kyc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {kyc.firstName} {kyc.lastName}
                    </CardTitle>
                    <CardDescription>
                      User ID: {kyc.userId} • Submitted: {new Date(kyc.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-500">
                    <Clock className="h-4 w-4" />
                    <span>Pending Review</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Personal Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <span>{kyc.dateOfBirth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Document Type:</span>
                        <span className="capitalize">{kyc.documentType.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country:</span>
                        <span>{kyc.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City:</span>
                        <span>{kyc.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Postal Code:</span>
                        <span>{kyc.postalCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Documents</h3>
                    <div className="space-y-2">
                      {kyc.frontImageUrl && (
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">ID Front</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(kyc.frontImageUrl, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                          <img
                            src={kyc.frontImageUrl}
                            alt="ID Front"
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}

                      {kyc.backImageUrl && (
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">ID Back</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(kyc.backImageUrl, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                          <img
                            src={kyc.backImageUrl}
                            alt="ID Back"
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}

                      {kyc.selfieUrl && (
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Selfie</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(kyc.selfieUrl, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                          <img
                            src={kyc.selfieUrl}
                            alt="Selfie"
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">Address</h3>
                  <p className="text-sm">{kyc.address}</p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => {
                      setSelectedKYC(kyc);
                      setShowApproveDialog(true);
                    }}
                    disabled={approveKYC.isPending || rejectKYC.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setSelectedKYC(kyc);
                      setShowRejectDialog(true);
                    }}
                    disabled={approveKYC.isPending || rejectKYC.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve KYC Verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve the KYC verification for {selectedKYC?.firstName} {selectedKYC?.lastName}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedKYC && handleApprove(selectedKYC.id)}
              disabled={approveKYC.isPending}
            >
              {approveKYC.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting the KYC verification for {selectedKYC?.firstName} {selectedKYC?.lastName}.
              The user will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectReason("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedKYC && handleReject(selectedKYC.id)}
              disabled={rejectKYC.isPending || !rejectReason.trim()}
            >
              {rejectKYC.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
