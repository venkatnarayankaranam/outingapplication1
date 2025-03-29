
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, ArrowRightFromLine, ArrowLeftToLine, Users, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRScanner from "@/components/QRScanner";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const GateDashboard = () => {
  const { theme } = useTheme();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  
  const [recentEntries] = useState([
    { id: 1, name: "John Doe", time: "10:15 AM", type: "out", verified: true },
    { id: 2, name: "Jane Smith", time: "09:45 AM", type: "in", verified: true },
    { id: 3, name: "Alex Wang", time: "08:30 AM", type: "out", verified: false },
  ]);

  const handleScan = (data: string) => {
    setScannedData(data);
    toast.success("QR code scanned successfully");
    // In a real app, you would verify the QR code with your backend
    setTimeout(() => {
      setIsScannerOpen(false);
      setScannedData(null);
    }, 2000);
  };

  const handleScanError = (err: Error) => {
    console.error(err);
    toast.error("Failed to scan QR code");
  };

  return (
    <DashboardLayout showScannerButton={true}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Gate Dashboard</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full`}>
                <Users className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Students</p>
                <p className="text-2xl font-semibold">120</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                <ArrowLeftToLine className={`w-6 h-6 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Check-Ins Today</p>
                <p className="text-2xl font-semibold">12</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-100'} rounded-full`}>
                <ArrowRightFromLine className={`w-6 h-6 ${theme === 'dark' ? 'text-orange-500' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Check-Outs Today</p>
                <p className="text-2xl font-semibold">8</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader>
            <CardTitle>Recent Entry/Exit Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3">Student</th>
                    <th className="text-left py-3">Time</th>
                    <th className="text-left py-3">Type</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-right py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-3 flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <span>{entry.name}</span>
                      </td>
                      <td className="py-3">{entry.time}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.type === 'out' 
                            ? theme === 'dark' ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700' 
                            : theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                        }`}>
                          {entry.type === 'out' ? 'Check-Out' : 'Check-In'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.verified 
                            ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700' 
                            : theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="outline" size="sm" className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}>
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
        <DialogContent className={`sm:max-w-[425px] ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border rounded-lg overflow-hidden">
              {!scannedData ? (
                <QRScanner onScan={handleScan} onError={handleScanError} />
              ) : (
                <div className="p-4 text-center space-y-4">
                  <p className="text-green-500 font-medium">QR Code Scanned Successfully!</p>
                  <p>{scannedData}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GateDashboard;
