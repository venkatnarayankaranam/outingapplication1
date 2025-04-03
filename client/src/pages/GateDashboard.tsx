import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, ArrowRightFromLine, ArrowLeftToLine, Users } from "lucide-react"; // Removed unused User import
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRScanner from "@/components/QRScanner";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/lib/axios";
import { ApprovedOuting } from "@/types/outing";

const GateDashboard = () => {
  const { theme } = useTheme();
  const { userDetails, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<any>(null);
  const [approvedOutings, setApprovedOutings] = useState<ApprovedOuting[]>([]);
  const [stats, setStats] = useState({
    totalCheckedIn: 0,
    totalCheckedOut: 0,
    pendingReturns: 0
  });

  const fetchApprovedOutings = useCallback(async () => {
    try {
      // Add token to request header
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get('/outings/gate/approved-outings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setApprovedOutings(response.data.outings.map((outing: any) => ({
          ...outing,
          outingDate: new Date(outing.outingDate).toLocaleDateString(),
          verificationStatus: !outing.tracking?.checkOut ? 'not_started' :
            !outing.tracking?.checkIn ? 'checked_out' : 'completed'
        })));
        setStats({
          totalCheckedIn: response.data.stats.checkedIn || 0,
          totalCheckedOut: response.data.stats.checkedOut || 0,
          pendingReturns: response.data.stats.pending || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching approved outings:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Please check your permissions.');
        return;
      }
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to fetch approved outings');
    }
  }, [navigate]);

  useEffect(() => {
    console.log('[GateDashboard] Mounting component:', {
      isAuthenticated,
      userDetails,
      role: userDetails?.role
    });

    if (!isAuthenticated || (userDetails?.role !== 'security' && userDetails?.role !== 'gate')) {
      console.log('[GateDashboard] Auth check failed, redirecting to login');
      navigate('/login');
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let mounted = true;

    const startFetching = () => {
      fetchApprovedOutings();
      intervalId = setInterval(() => {
        if (mounted) fetchApprovedOutings();
      }, 5000);
    };

    startFetching();

    return () => {
      console.log('[GateDashboard] Unmounting component');
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, userDetails?.role, navigate, fetchApprovedOutings]);

  const handleScan = (data: string) => {
    try {
      const parsedData = JSON.parse(data);
      setScannedQRData(parsedData);
      toast.success("QR code scanned successfully");

      // Verify QR code with backend
      verifyQRCode(parsedData);
    } catch (error) {
      toast.error("Invalid QR code format");
      console.error("QR scan error:", error);
    }
  };

  const verifyQRCode = async (qrData: any) => {
    try {
      const response = await axiosInstance.post("/outings/verify-qr", { qrData: JSON.stringify(qrData) }); // Removed /api prefix

      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to verify QR code");
    }
  };

  const handleScanError = (err: Error) => {
    console.error(err);
    toast.error("Failed to scan QR code");
  };

  const handleViewDetails = (outing: ApprovedOuting) => {
    console.log("View details for outing:", outing);
  };

  // Return early if not authenticated
  if (!isAuthenticated || (userDetails?.role !== 'security' && userDetails?.role !== 'gate')) {
    return null;
  }

  return (
    <DashboardLayout showScannerButton={true}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Gate Dashboard</h2>
            <p className={`mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Manage student entry and exit
            </p>
          </div>
          <Button
            className="premium-button flex items-center space-x-2"
            onClick={() => setIsScannerOpen(true)}
          >
            <QrCode className="w-5 h-5" />
            <span>Scan QR Code</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`p-6 ${theme === "dark" ? "bg-gray-800/90 border-gray-700" : "glass-card"}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"} rounded-full`}>
                <Users className={`w-6 h-6 ${theme === "dark" ? "text-blue-500" : "text-blue-600"}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Currently Out</p>
                <p className="text-2xl font-semibold">{stats.totalCheckedOut}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === "dark" ? "bg-gray-800/90 border-gray-700" : "glass-card"}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === "dark" ? "bg-green-900/30" : "bg-green-100"} rounded-full`}>
                <ArrowLeftToLine className={`w-6 h-6 ${theme === "dark" ? "text-green-500" : "text-green-600"}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Check-Ins Today</p>
                <p className="text-2xl font-semibold">{stats.totalCheckedIn}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === "dark" ? "bg-gray-800/90 border-gray-700" : "glass-card"}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === "dark" ? "bg-orange-900/30" : "bg-orange-100"} rounded-full`}>
                <ArrowRightFromLine className={`w-6 h-6 ${theme === "dark" ? "text-orange-500" : "text-orange-600"}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Pending Returns</p>
                <p className="text-2xl font-semibold">{stats.pendingReturns}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className={`${theme === "dark" ? "bg-gray-800/90 border-gray-700" : "glass-card"}`}>
          <CardHeader>
            <CardTitle>Approved Outing Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    <th className="text-left py-3">Student</th>
                    <th className="text-left py-3">Roll No.</th>
                    <th className="text-left py-3">Block & Room</th>
                    <th className="text-left py-3">Out Date & Time</th>
                    <th className="text-left py-3">Return Time</th>
                    <th className="text-left py-3">Contact</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-right py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedOutings.map((outing) => (
                    <tr key={outing.id} className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                      <td className="py-3">{outing.studentName}</td>
                      <td className="py-3">{outing.rollNumber}</td>
                      <td className="py-3">{`${outing.hostelBlock} - ${outing.roomNumber}`}</td>
                      <td className="py-3">{`${outing.outingDate} ${outing.outingTime}`}</td>
                      <td className="py-3">{outing.returnTime}</td>
                      <td className="py-3">
                        <div className="text-sm">
                          <div>Student: {outing.phoneNumber}</div>
                          <div>Parent: {outing.parentPhoneNumber}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          outing.verificationStatus === 'completed' 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : outing.verificationStatus === 'checked_out'
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {outing.verificationStatus === 'completed' 
                            ? 'Returned'
                            : outing.verificationStatus === 'checked_out'
                            ? 'Out'
                            : 'Not Started'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(outing)}
                          className={theme === "dark" ? "border-gray-700 hover:bg-gray-700" : ""}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className={`sm:max-w-[425px] ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : ""}`}>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!scannedQRData ? (
              <div className="border rounded-lg overflow-hidden">
                <QRScanner onScan={handleScan} onError={handleScanError} />
              </div>
            ) : (
              <div className="space-y-4">
                <QRCodeDisplay qrData={scannedQRData} />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScannedQRData(null);
                    }}
                  >
                    Scan Another
                  </Button>
                  <Button onClick={() => setIsScannerOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GateDashboard;
