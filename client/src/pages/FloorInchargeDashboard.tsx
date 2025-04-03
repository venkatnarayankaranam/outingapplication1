import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, UserPlus, Home, RefreshCw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from "@/lib/axios";  // Fixed import
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ApprovedStudentsPDF } from '@/components/ApprovedStudentsPDF';
import { Student, OutingRequest, Stats } from "@/types/outing";
import { debugSocket } from '@/utils/socketDebug';

const FloorInchargeDashboard = () => {
  const { theme } = useTheme();
  const { userDetails, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<OutingRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OutingRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    pending: 0,
    approved: 0,
    denied: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<OutingRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15000); // 15 seconds
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [approvedStudents, setApprovedStudents] = useState<Student[]>([]);
  const [isApprovedModalOpen, setIsApprovedModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const encodedEmail = encodeURIComponent(userDetails.email);

      const [requestsResponse, studentsResponse, approvedResponse] = await Promise.all([
        axiosInstance.get('/outings/floor-incharge/requests'),
        axiosInstance.get(`/outings/floor-incharge/students/${encodedEmail}`),
        axiosInstance.get('/outings/floor-incharge/approved-students')
      ]);

      console.log('API Responses:', {
        requests: requestsResponse.data,
        students: studentsResponse.data
      });

      if (studentsResponse.data?.success) {
        const fetchedStudents = studentsResponse.data.students || [];
        setStudents(fetchedStudents);
        
        const totalFromStudents = fetchedStudents.length;
        const totalFromRequests = requestsResponse.data.stats?.totalStudents || 0;
        
        setStats(prev => ({
          ...prev,
          totalStudents: Math.max(totalFromStudents, totalFromRequests)
        }));
      } else {
        console.error('Students response error:', studentsResponse.data);
        toast.error(studentsResponse.data?.message || 'Failed to fetch students');
      }

      if (requestsResponse.data?.success) {
        const transformedRequests = requestsResponse.data.requests?.map((req: any) => ({
          id: req._id,
          name: req.studentId?.name || 'Unknown',
          rollNumber: req.studentId?.rollNumber || 'N/A',
          roomNo: req.studentId?.roomNumber || 'N/A',
          floor: req.floor,
          date: new Date(req.outingDate).toLocaleDateString(),
          outTime: req.outingTime,
          inTime: req.returnTime,
          status: req.status,
          purpose: req.purpose,
          studentId: req.studentId?._id,
          email: req.studentId?.email,
          phoneNumber: req.studentId?.phoneNumber || 'N/A',
          parentPhoneNumber: req.studentId?.parentPhoneNumber || 'N/A',
          branch: req.studentId?.branch || 'N/A',
          semester: req.studentId?.semester || 'N/A',
        })) || [];

        setRequests(transformedRequests);
        const pending = transformedRequests.filter((req: any) => req.status === 'pending');
        setPendingRequests(pending);

        setStats(prev => ({
          ...prev,
          pending: requestsResponse.data.stats?.pending || pending.length,
          approved: requestsResponse.data.stats?.approved || 0,
          denied: requestsResponse.data.stats?.denied || 0,
        }));
      } else {
        console.error('Requests response error:', requestsResponse.data);
        toast.error(requestsResponse.data?.message || 'Failed to fetch requests');
      }

      if (approvedResponse.data?.success) {
        setApprovedStudents(approvedResponse.data.students);
      }
    } catch (error: any) {
      console.error("Data fetch error:", error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load dashboard data");
      
      setRefreshInterval(prev => Math.min(prev * 2, 120000)); // Max 2 minutes
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userDetails?.email) {
      navigate('/login');
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const setupInterval = () => {
      fetchData();
      intervalId = setInterval(() => {
        if (isMounted) fetchData();
      }, refreshInterval);
    };

    setupInterval();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [userDetails?.email, isAuthenticated, navigate, refreshInterval]);

  useEffect(() => {
    if (!isAuthenticated || !userDetails?.email) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('[Socket] Connecting to:', SOCKET_URL);

    const socket = io(`${SOCKET_URL}/floor-incharge`, {
      auth: {
        token: localStorage.getItem('token')
      },
      path: '/socket.io', // Explicitly set socket path
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    });

    debugSocket(socket); // Use our debug utility

    // Handle room joining after successful connection
    socket.on('connect', () => {
      if (userDetails.assignedBlock && userDetails.assignedFloor) {
        const room = `${userDetails.assignedBlock}-${userDetails.assignedFloor}`;
        console.log('[Socket] Joining room:', room);
        socket.emit('join-room', { room });
      }
    });

    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.disconnect();
    };
  }, [isAuthenticated, userDetails?.email]); // Only re-run if auth state changes

  const handleRequestAction = async (requestId: string, action: 'approve' | 'deny') => {
    setLoading(true);
    const originalRequests = [...requests];
    const originalPending = [...pendingRequests];
    const originalStats = {...stats};

    try {
      console.log('Sending request action:', {
        requestId,
        action,
        userRole: userDetails?.role,
        assignedBlock: userDetails?.assignedBlock,
        assignedFloor: userDetails?.assignedFloor
      });

      const response = await axiosInstance.patch(`/outings/floor-incharge/request/${requestId}/${action}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || `Failed to ${action} request`);
      }

      toast.success(`Request ${action}d successfully`);
      
      await fetchData();

    } catch (error: any) {
      console.error(`Request ${action} error:`, {
        error: error.response?.data || error.message,
        status: error.response?.status,
        requestId,
        action
      });
      
      setRequests(originalRequests);
      setPendingRequests(originalPending);
      setStats(originalStats);

      if (error.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        logout();
        navigate('/login');
        return;
      }

      toast.error(
        error.response?.data?.message || 
        `Failed to ${action} request. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: OutingRequest) => {
    setSelectedStudent(request);
    setIsModalOpen(true);
  };

  const handleManualRefresh = () => {
    setRefreshInterval(15000);
    fetchData();
  };

  const handleTotalStudentsClick = () => {
    setIsStudentsModalOpen(true);
  };

  const handleApprovedClick = () => {
    setIsApprovedModalOpen(true);
  };

  const handleApprovedStudentsData = (students: Student[]) => {
    return students.map(student => ({
      name: student.name || 'N/A',
      rollNumber: student.rollNumber || 'N/A',
      floor: Array.isArray(student.floor) ? student.floor.join(', ') : (student.floor || 'N/A'),
      roomNumber: student.roomNumber || 'N/A',
      outTime: student.outTime || 'N/A',
      inTime: student.inTime || 'N/A'
    }));
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Floor Incharge Dashboard</h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage students and outing requests (Auto-refreshing every {refreshInterval/1000} seconds)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card 
            className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'} cursor-pointer transition-all hover:scale-105`}
            onClick={handleTotalStudentsClick}
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full`}>
                <UserPlus className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Students</p>
                <p className="text-2xl font-semibold">{stats.totalStudents}</p>
              </div>
            </div>
          </Card>

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

          <Card 
            className={`p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'} cursor-pointer transition-all hover:scale-105`}
            onClick={handleApprovedClick}
          >
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

        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Pending Requests ({pendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {pendingRequests.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3">Student</th>
                      <th className="text-left py-3">Roll No.</th>
                      <th className="text-left py-3">Floor</th>
                      <th className="text-left py-3">Room</th>
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Time</th>
                      <th className="text-left py-3">Purpose</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-right py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((request: OutingRequest) => (
                      <tr key={request.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">{request.name}</td>
                        <td className="py-3">{request.rollNumber}</td>
                        <td className="py-3">{request.floor}</td>
                        <td className="py-3">{request.roomNo}</td>
                        <td className="py-3">{request.date}</td>
                        <td className="py-3">{request.outTime} - {request.inTime}</td>
                        <td className="py-3">{request.purpose}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                              className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleRequestAction(request.id, 'approve')}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleRequestAction(request.id, 'deny')}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              Deny
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No pending requests found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              <span>All Outing Requests ({requests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {requests.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3">Student</th>
                      <th className="text-left py-3">Roll No.</th>
                      <th className="text-left py-3">Floor</th>
                      <th className="text-left py-3">Room</th>
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Time</th>
                      <th className="text-left py-3">Purpose</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-right py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request: OutingRequest) => (
                      <tr key={request.id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">{request.name}</td>
                        <td className="py-3">{request.rollNumber}</td>
                        <td className="py-3">{request.floor}</td>
                        <td className="py-3">{request.roomNo}</td>
                        <td className="py-3">{request.date}</td>
                        <td className="py-3">{request.outTime} - {request.inTime}</td>
                        <td className="py-3">{request.purpose}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                              className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}
                            >
                              View
                            </Button>
                            {request.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => handleRequestAction(request.id, 'approve')}
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => handleRequestAction(request.id, 'deny')}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                >
                                  Deny
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No outing requests found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`mt-8 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              <span>Students Under My Floors ({students.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {students.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3">Name</th>
                      <th className="text-left py-3">Roll No.</th>
                      <th className="text-left py-3">Floor</th>
                      <th className="text-left py-3">Room</th>
                      <th className="text-left py-3">Email</th>
                      <th className="text-left py-3">Phone</th>
                      <th className="text-left py-3">Parent Phone</th>
                      <th className="text-left py-3">Branch</th>
                      <th className="text-left py-3">Semester</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: Student) => (
                      <tr key={student._id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">{student.name || 'N/A'}</td>
                        <td className="py-3">{student.rollNumber || 'N/A'}</td>
                        <td className="py-3">{student.floor?.join(', ') || 'N/A'}</td>
                        <td className="py-3">{student.roomNumber || 'N/A'}</td>
                        <td className="py-3">{student.email || 'N/A'}</td>
                        <td className="py-3">{student.phoneNumber || 'N/A'}</td>
                        <td className="py-3">{student.parentPhoneNumber || 'N/A'}</td>
                        <td className="py-3">{student.branch || 'N/A'}</td>
                        <td className="py-3">{student.semester || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No students found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedStudent && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className={theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-black'}>
              <DialogHeader>
                <DialogTitle>Student Outing Details</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Name:</p>
                  <p>{selectedStudent.name}</p>
                </div>
                <div>
                  <p className="font-semibold">Roll Number:</p>
                  <p>{selectedStudent.rollNumber}</p>
                </div>
                <div>
                  <p className="font-semibold">Email:</p>
                  <p>{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="font-semibold">Floor:</p>
                  <p>{selectedStudent.floor}</p>
                </div>
                <div>
                  <p className="font-semibold">Room Number:</p>
                  <p>{selectedStudent.roomNo}</p>
                </div>
                <div>
                  <p className="font-semibold">Phone:</p>
                  <p>{selectedStudent.phoneNumber}</p>
                </div>
                <div>
                  <p className="font-semibold">Parent Phone:</p>
                  <p>{selectedStudent.parentPhoneNumber}</p>
                </div>
                <div>
                  <p className="font-semibold">Branch:</p>
                  <p>{selectedStudent.branch}</p>
                </div>
                <div>
                  <p className="font-semibold">Semester:</p>
                  <p>{selectedStudent.semester}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold">Outing Purpose:</p>
                  <p>{selectedStudent.purpose}</p>
                </div>
                <div>
                  <p className="font-semibold">Date:</p>
                  <p>{selectedStudent.date}</p>
                </div>
                <div>
                  <p className="font-semibold">Time:</p>
                  <p>{selectedStudent.outTime} - {selectedStudent.inTime}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold">Status:</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedStudent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedStudent.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1)}
                  </span>
                </div>
              </div>
              <DialogClose asChild>
                <Button variant="outline" className="mt-4">
                  Close
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isStudentsModalOpen} onOpenChange={setIsStudentsModalOpen}>
          <DialogContent className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'} max-w-6xl w-full`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <span>All Students ({students.length})</span>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[70vh]">
              <table className="w-full">
                <thead className="sticky top-0 bg-inherit">
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Roll No.</th>
                    <th className="text-left py-3">Floor</th>
                    <th className="text-left py-3">Room</th>
                    <th className="text-left py-3">Email</th>
                    <th className="text-left py-3">Phone</th>
                    <th className="text-left py-3">Parent Phone</th>
                    <th className="text-left py-3">Branch</th>
                    <th className="text-left py-3">Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student: Student) => (
                    <tr key={student._id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-3">{student.name || 'N/A'}</td>
                      <td className="py-3">{student.rollNumber || 'N/A'}</td>
                      <td className="py-3">{student.floor || 'N/A'}</td>
                      <td className="py-3">{student.roomNumber || 'N/A'}</td>
                      <td className="py-3">{student.email || 'N/A'}</td>
                      <td className="py-3">{student.phoneNumber || 'N/A'}</td>
                      <td className="py-3">{student.parentPhoneNumber || 'N/A'}</td>
                      <td className="py-3">{student.branch || 'N/A'}</td>
                      <td className="py-3">{student.semester || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogClose asChild>
              <Button variant="outline" className="mt-4">
                Close
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

        <Dialog open={isApprovedModalOpen} onOpenChange={setIsApprovedModalOpen}>
          <DialogContent className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'} max-w-7xl w-full`}>
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Approved Outing Students ({approvedStudents.length})</span>
              </DialogTitle>
              <PDFDownloadLink
                document={<ApprovedStudentsPDF students={handleApprovedStudentsData(approvedStudents)} />}
                fileName={`approved-students-${new Date().toISOString().split('T')[0]}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading}>
                    {loading ? 'Preparing...' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[70vh]">
              <table className="w-full">
                <thead className="sticky top-0 bg-inherit">
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3">#</th>
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Roll No.</th>
                    <th className="text-left py-3">Floor</th>
                    <th className="text-left py-3">Room</th>
                    <th className="text-left py-3">Out Time</th>
                    <th className="text-left py-3">In Time</th>
                    <th className="text-left py-3">Phone</th>
                    <th className="text-left py-3">Parent Phone</th>
                    <th className="text-left py-3">Branch</th>
                    <th className="text-left py-3">Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedStudents.map((student, index) => (
                    <tr key={student._id} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-3">{index + 1}</td>
                      <td className="py-3">{student.name || 'N/A'}</td>
                      <td className="py-3">{student.rollNumber || 'N/A'}</td>
                      <td className="py-3">{student.floor || 'N/A'}</td>
                      <td className="py-3">{student.roomNumber || 'N/A'}</td>
                      <td className="py-3">{student.outTime || 'N/A'}</td>
                      <td className="py-3">{student.inTime || 'N/A'}</td>
                      <td className="py-3">{student.phoneNumber || 'N/A'}</td>
                      <td className="py-3">{student.parentPhoneNumber || 'N/A'}</td>
                      <td className="py-3">{student.branch || 'N/A'}</td>
                      <td className="py-3">{student.semester || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogClose asChild>
              <Button variant="outline" className="mt-4">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default FloorInchargeDashboard;