import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Building, PieChart, Activity, Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import axiosInstance from "@/lib/axios";  // Update import path
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApprovedStudentsList } from "@/components/ApprovedStudentsList";

interface DashboardData {
  requests: OutingRequest[];
  stats: {
    pending: number;
    approved: number;
    denied: number;
    totalRequests: number;
    floorInchargeApproved: number;
  }
}

interface OutingRequest {
  id: string;
  studentName: string;
  rollNumber: string;
  hostelBlock: string;
  floor: string;
  roomNumber: string;
  outingDate: string;
  outingTime: string;
  returnTime: string;
  purpose: string;
  status: string;
  currentLevel: string;
  floorInchargeApproval: 'pending' | 'approved' | 'denied';
  hostelInchargeApproval: 'pending' | 'approved' | 'denied';
  approvalFlow: Array<{
    level: string;
    status: string;
    timestamp: string;
    remarks?: string;
  }>;
}

interface DashboardResponse {
  success: boolean;
  data: {
    requests: OutingRequest[];
    stats: {
      pending: number;
      approved: number;
      denied: number;
    }
  }
}

interface ApprovalEntry {
  level: number;  // Changed from string to number
  status: string;
  timestamp: string;
  remarks?: string;
  approvedBy: string;
  approverInfo: {
    email: string;
    role: 'HostelIncharge';  // Strict role type
  };
}

interface ApprovalRequest {
  approvalFlow: ApprovalEntry[];
  remarks: string;
  level: number;
  status: string;
}

interface UserDetails {
  email: string;
  role: string;
  name?: string;
  id?: string;
}

// Move statusData outside component
const getInitialStatusData = () => [
  { name: "Pending", value: 0, color: "#FFA500" },
  { name: "Approved", value: 0, color: "#10B981" },
  { name: "Denied", value: 0, color: "#EF4444" }
];

const getStatusBadgeColor = (request: OutingRequest) => {
  if (request.currentLevel === 'hostel-incharge') {
    return request.floorInchargeApproval === 'approved' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  }
  return request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const getStatusText = (request: OutingRequest) => {
  if (request.currentLevel === 'hostel-incharge') {
    if (request.floorInchargeApproval === 'approved') {
      return 'Awaiting Your Approval';
    }
    return 'Pending Floor Incharge Approval';
  }
  return request.status.charAt(0).toUpperCase() + request.status.slice(1);
};

const HostelInchargeDashboard = () => {
  const { theme } = useTheme();
  const { userDetails, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(getInitialStatusData());
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0,
      totalRequests: 0,
      floorInchargeApproved: 0
    }
  });
  const [pendingRequests, setPendingRequests] = useState<OutingRequest[]>([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isApprovedModalOpen, setIsApprovedModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      if (!userDetails?.email || !isAuthenticated) {
        navigate('/login');
        return;
      }

      const response = await axiosInstance.get<DashboardResponse>(
        '/outings/dashboard/hostel-incharge'
      );
      
      if (response.data?.success && response.data?.data) {
        const { stats, requests } = response.data.data;
        
        setDashboardData({
          requests: requests || [],
          stats: {
            ...stats,
            totalRequests: stats.pending + stats.approved + stats.denied,
            floorInchargeApproved: requests.filter(r => r.floorInchargeApproval === 'approved').length
          }
        });

        const pendingRequests = requests.filter(r => 
          r.currentLevel === 'hostel-incharge' && 
          r.floorInchargeApproval === 'approved'
        );

        setPendingRequests(pendingRequests);
      }
    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    }
  };

  const fetchApprovedStudents = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-students/hostel-incharge');
      if (response.data.success) {
        setApprovedStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching approved students:', error);
      toast.error('Failed to fetch approved students');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        if (!mounted) return;
        await fetchDashboardData();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();
    const intervalId = setInterval(initialize, 30000);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [userDetails?.email, isAuthenticated, navigate, logout]);

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      if (!userDetails?.email) {
        toast.error('User session invalid. Please login again.');
        navigate('/login');
        return;
      }

      const approvalEntry: ApprovalEntry = {
        level: 2,  // Send as number, not string
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: userDetails.email,
        remarks: '',
        approverInfo: {
          email: userDetails.email,
          role: 'HostelIncharge'  // Match exact role string
        }
      };

      const approvalRequest = {
        requestId,
        approvalFlow: [approvalEntry],
        level: 2,  // Send as number
        status: 'approved'
      };

      console.log('Sending approval request:', {
        endpoint: `/outings/${requestId}/approve`,
        payload: approvalRequest,
        userRole: userDetails.role
      });

      const response = await axiosInstance.post(`/outings/${requestId}/approve`, approvalRequest);

      if (response.data?.success) {
        toast.success('Request approved successfully');
        await fetchDashboardData();
      } else {
        throw new Error(response.data?.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approval error:', {
        error: error.response?.data || error.message,
        requestId,
        approver: {
          email: userDetails?.email,
          role: 'HostelIncharge'  // Match exact role name in error logs
        },
        details: error.response?.data?.details
      });

      // Show specific error message for missing floor incharge approval
      if (error.response?.data?.message?.includes('Floor Incharge approval')) {
        toast.error('Floor Incharge approval is required first');
      } else {
        toast.error(
          error.response?.data?.message || 
          'Failed to approve request. Please check all required fields.'
        );
      }

      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      }
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      if (!userDetails?.email) {
        toast.error('Invalid user session. Please login again.');
        navigate('/login');
        return;
      }

      const denyEntry: ApprovalEntry = {
        level: 2,  // Send as number
        status: 'denied',
        timestamp: new Date().toISOString(),
        approvedBy: userDetails.email,
        approverInfo: {
          email: userDetails.email,
          role: 'HostelIncharge'  // Match exact role string
        }
      };

      const denyRequest = {
        requestId,
        approvalFlow: [denyEntry],
        level: 2,  // Send as number
        status: 'denied'
      };

      const response = await axiosInstance.post(`/outings/${requestId}/deny`, denyRequest);

      if (response.data?.success) {
        toast.success('Request denied successfully');
        await fetchDashboardData();
      }
    } catch (error: any) {
      console.error('Denial error:', error);
      toast.error(
        error.response?.data?.message || 
        'Failed to deny request. Please try again.'
      );

      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-requests/pdf', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `approved-requests-${new Date().toISOString()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF report');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl">Loading dashboard...</h2>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-semibold">Hostel Incharge Dashboard</h2>
          <Button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Report
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
                <p className="text-2xl font-semibold">{dashboardData.stats.pending}</p>
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
                <p className="text-2xl font-semibold">{dashboardData.stats.approved}</p>
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
                <p className="text-2xl font-semibold">{dashboardData.stats.denied}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                <span>Request Status Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span>Weekly Outing Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Chart visualization will be implemented here
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              <span>Pending Hostel Outing Requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3">Student</th>
                    <th className="text-left py-3">Roll No.</th>
                    <th className="text-left py-3">Hostel & Room</th>
                    <th className="text-left py-3">Date & Time</th>
                    <th className="text-left py-3">Purpose</th>
                    <th className="text-left py-3">Floor Incharge</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-right py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.requests.map((request) => (
                    <tr key={request.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-3">{request.studentName}</td>
                      <td className="py-3">{request.rollNumber}</td>
                      <td className="py-3">{`${request.hostelBlock} - ${request.roomNumber}`}</td>
                      <td className="py-3">{`${new Date(request.outingDate).toLocaleDateString()} ${request.outingTime}-${request.returnTime}`}</td>
                      <td className="py-3">{request.purpose}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.floorInchargeApproval === 'approved' ? 'bg-green-100 text-green-800' :
                          request.floorInchargeApproval === 'denied' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.floorInchargeApproval.charAt(0).toUpperCase() + request.floorInchargeApproval.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(request)}`}>
                          {getStatusText(request)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {request.currentLevel === 'hostel-incharge' && request.floorInchargeApproval === 'approved' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeny(request.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-700"
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Approved Outing Students</CardTitle>
            <Button
              variant="outline"
              onClick={() => setIsApprovedModalOpen(true)}
            >
              View All
            </Button>
          </CardHeader>
        </Card>

        <ApprovedStudentsList
          isOpen={isApprovedModalOpen}
          onClose={() => setIsApprovedModalOpen(false)}
          students={approvedStudents}
          onDownloadPDF={handleDownloadPDF}
        />
      </div>
    </DashboardLayout>
  );
};

export default HostelInchargeDashboard;
