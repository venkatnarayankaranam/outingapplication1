import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, CheckCircle, XCircle, FilePlus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from '@/lib/axios';

// API base URL
const API_BASE_URL = "http://localhost:5000/api";

const StudentDashboard = () => {
  const { theme } = useTheme();
  const { userDetails } = useAuth();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [date, setDate] = useState("");
  const [outTime, setOutTime] = useState("");
  const [inTime, setInTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [parentContact, setParentContact] = useState(userDetails?.parentPhoneNumber || "");
  
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0
  });

  // Fetch student's outing requests from backend
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axiosInstance.get('/dashboard/student/requests');
        if (response.data.success) {
          setRequests(response.data.requests);
          setStats(response.data.stats);
        }
      } catch (error: any) {
        console.error("Failed to fetch requests:", {
          error: error.response?.data || error.message,
          status: error.response?.status,
          endpoint: '/dashboard/student/requests'
        });
        toast.error(
          error.response?.status === 404 
            ? "API endpoint not found. Please check server configuration."
            : error.response?.data?.message || "Failed to fetch your requests"
        );
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmitRequest = async () => {
    if (!date || !outTime || !inTime || !purpose || !parentContact) {
      toast.error("Please fill all fields");
      return;
    }
    
    try {
      const response = await axiosInstance.post('/outings/requests/submit', {
        outingDate: date,
        outTime,
        returnTime: inTime,
        returnDate: date, // Add return date
        purpose,
        parentContact
      });
      
      if (response.data.success) {
        toast.success("Outing request submitted successfully");
        setRequests(prev => [response.data.request, ...prev]);
        setStats(prev => ({...prev, pending: prev.pending + 1}));
        setIsNewRequestOpen(false);
        resetForm();
      }
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  const resetForm = () => {
    setDate("");
    setOutTime("");
    setInTime("");
    setPurpose("");
    setParentContact(userDetails?.parentPhoneNumber || "");
  };

  return (
    <DashboardLayout showProfileButton={true} showOutingRequestButton={true}>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Student Dashboard</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your outing requests
            </p>
          </div>
          <Button 
            className="premium-button flex items-center space-x-2" 
            onClick={() => setIsNewRequestOpen(true)}
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Request</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'} rounded-full`}>
                <Clock className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                <p className="text-2xl font-semibold">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                <CheckCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved</p>
                <p className="text-2xl font-semibold">{stats.approved}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full`}>
                <XCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Denied</p>
                <p className="text-2xl font-semibold">{stats.denied}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilePlus className="w-5 h-5" />
                <span>My Outing Requests</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.length > 0 ? (
                  requests.map((request: any) => (
                    <div 
                      key={request.id} 
                      className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className={`status-badge status-${request.status}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                            <h4 className="font-medium">{request.purpose}</h4>
                          </div>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            {request.date} • {request.outTime} - {request.inTime}
                          </p>
                        </div>
                        <Button variant={theme === 'dark' ? "outline" : "outline"} className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}>
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      No outing requests yet. Create a new request to get started.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span>My Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Name:</span>
                    <span className="font-medium">{userDetails?.name || 'John Doe'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Roll Number:</span>
                    <span className="font-medium">{userDetails?.rollNumber || 'S12345'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Email:</span>
                    <span className="font-medium">{userDetails?.email || 'johndoe@student.edu'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Hostel:</span>
                    <span className="font-medium">{userDetails?.hostelBlock || 'Block A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Room:</span>
                    <span className="font-medium">{userDetails?.roomNumber || '101'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Parent Contact:</span>
                    <span className="font-medium">{userDetails?.parentPhoneNumber || '+1234567890'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className={theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>New Outing Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Out Time</Label>
                <Input 
                  type="time" 
                  value={outTime} 
                  onChange={(e) => setOutTime(e.target.value)}
                  className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>In Time</Label>
                <Input 
                  type="time" 
                  value={inTime} 
                  onChange={(e) => setInTime(e.target.value)}
                  className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea 
                placeholder="Explain your purpose for outing..." 
                value={purpose} 
                onChange={(e) => setPurpose(e.target.value)}
                className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Contact Number</Label>
              <Input 
                type="tel" 
                placeholder="Enter parent's contact number" 
                value={parentContact} 
                onChange={(e) => setParentContact(e.target.value)}
                className={theme === 'dark' ? 'bg-gray-700 border-gray-600' : ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestOpen(false)} className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StudentDashboard;
