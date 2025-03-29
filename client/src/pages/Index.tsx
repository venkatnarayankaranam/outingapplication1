
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, CheckCircle, XCircle } from "lucide-react";

const Index = () => {
  const [requests] = useState([
    {
      id: 1,
      date: "2024-03-20",
      outTime: "10:00 AM",
      inTime: "6:00 PM",
      status: "pending",
      purpose: "Medical appointment",
    },
    {
      id: 2,
      date: "2024-03-18",
      outTime: "2:00 PM",
      inTime: "5:00 PM",
      status: "approved",
      purpose: "Family visit",
    },
    {
      id: 3,
      date: "2024-03-15",
      outTime: "9:00 AM",
      inTime: "7:00 PM",
      status: "denied",
      purpose: "Shopping",
    },
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-semibold">Dashboard</h2>
            <p className="text-gray-500 mt-1">Manage your outing requests</p>
          </div>
          <Button className="premium-button flex items-center space-x-2">
            <PlusCircle className="w-5 h-5" />
            <span>New Request</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 glass-card">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-semibold">3</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 glass-card">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-semibold">12</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 glass-card">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Denied</p>
                <p className="text-2xl font-semibold">2</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Recent Requests</h3>
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-6 glass-card">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className={`status-badge status-${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      <h4 className="font-medium">{request.purpose}</h4>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {request.date} • {request.outTime} - {request.inTime}
                    </p>
                  </div>
                  <Button variant="outline">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
