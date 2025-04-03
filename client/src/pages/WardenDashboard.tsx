import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Building, PieChart, Users, Calendar, Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import axiosInstance from "@/lib/axios";
import { toast } from "react-toastify";
import { ApprovedStudentsList } from "@/components/ApprovedStudentsList";

const WardenDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState({
    totalHostels: 0,
    totalStudents: 0,
    outingsToday: 0,
    approvalRate: 0,
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0
    }
  });
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isApprovedModalOpen, setIsApprovedModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // First verify auth
      await axiosInstance.get('/auth/verify');
      
      const response = await axiosInstance.get('/outings/dashboard/warden');
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (error: any) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedStudents = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-students/warden');
      if (response.data.success) {
        setApprovedStudents(response.data.students);
      }
    } catch (error: any) {
      console.error('Error fetching approved students:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch approved students');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchDashboardData();
    fetchApprovedStudents();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [navigate]);

  const handleApprove = async (requestId: string) => {
    try {
      const response = await axiosInstance.patch(`/outings/warden/approve/${requestId}`);

      if (response.data.success) {
        toast.success('Request approved successfully');
        await fetchDashboardData();
        await fetchApprovedStudents();
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approval error:', { error, requestId });
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to approve request');
      }
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      const response = await axiosInstance.post(`/outings/warden/deny/${requestId}`);
      if (response.data.success) {
        toast.success('Request denied successfully');
        await fetchDashboardData(); // Use await here
      }
    } catch (error: any) {
      console.error('Denial error:', error);
      toast.error(error.response?.data?.message || 'Failed to deny request');
    }
  };

  const handleViewDetails = (request: any) => {
    // Implement view details functionality
    console.log("View details for request:", request);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-requests/pdf', {
        responseType: 'blob'
      });

      // Create download link
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

  return (
    <DashboardLayout>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-semibold">Warden Dashboard</h2>
            <Button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full`}>
                  <Building className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Hostels</p>
                  <p className="text-2xl font-semibold">{dashboardData.totalHostels}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 ${theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-full`}>
                  <Users className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-500' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Students</p>
                  <p className="text-2xl font-semibold">{dashboardData.totalStudents}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'} rounded-full`}>
                  <Calendar className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Outings Today</p>
                  <p className="text-2xl font-semibold">{dashboardData.outingsToday}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                  <PieChart className={`w-6 h-6 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approval Rate</p>
                  <p className="text-2xl font-semibold">{dashboardData.approvalRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Pending Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center">{dashboardData.stats.pending}</p>
              </CardContent>
            </Card>
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Approved Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center text-green-500">{dashboardData.stats.approved}</p>
              </CardContent>
            </Card>
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>Denied Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center text-red-500">{dashboardData.stats.denied}</p>
              </CardContent>
            </Card>
          </div>

          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle>All Campus Outing Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3">Student</th>
                      <th className="text-left py-3">Hostel</th>
                      <th className="text-left py-3">Floor</th>
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Time</th>
                      <th className="text-left py-3">Purpose</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-right py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.requests.map((request: any) => (
                      <tr key={request._id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">{request.studentId?.name}</td>
                        <td className="py-3">{request.studentId?.hostelBlock}</td>
                        <td className="py-3">{request.studentId?.floor}</td>
                        <td className="py-3">{new Date(request.outingDate).toLocaleDateString()}</td>
                        <td className="py-3">{request.outingTime} - {request.returnTime}</td>
                        <td className="py-3">{request.purpose}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.currentLevel === 'warden' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.currentLevel === 'warden' ? 'Pending Approval' : request.status}
                          </span>
                        </td>
                        <td className="text-right py-3">
                          {request.currentLevel === 'warden' && request.hostelInchargeApproval === 'approved' && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}
                                onClick={() => handleViewDetails(request)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(request._id)} // Use _id instead of id
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
      )}
    </DashboardLayout>
  );
};

export default WardenDashboard;
