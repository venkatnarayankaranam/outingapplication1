import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface QRCodeDisplayProps {
  qrData: {
    name: string;
    rollNumber: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    branch?: string;
    roomNumber?: string;
    outingTime: string;
    inTime: string;
    status: string;
    requestId: string;
  };
}

export const QRCodeDisplay = ({ qrData }: QRCodeDisplayProps) => {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{qrData.name}</h3>
          <p className="text-sm text-muted-foreground">{qrData.rollNumber}</p>
        </div>
        <Badge variant={qrData.status === 'approved' ? 'default' : 'secondary'}>
          {qrData.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Phone</p>
          <p>{qrData.phoneNumber}</p>
        </div>
        <div>
          <p className="font-medium">Parent Phone</p>
          <p>{qrData.parentPhoneNumber}</p>
        </div>
        {qrData.branch && (
          <div>
            <p className="font-medium">Branch</p>
            <p>{qrData.branch}</p>
          </div>
        )}
        {qrData.roomNumber && (
          <div>
            <p className="font-medium">Room Number</p>
            <p>{qrData.roomNumber}</p>
          </div>
        )}
        <div>
          <p className="font-medium">Out Time</p>
          <p>{qrData.outingTime}</p>
        </div>
        <div>
          <p className="font-medium">In Time</p>
          <p>{qrData.inTime}</p>
        </div>
      </div>
    </Card>
  );
};

export default QRCodeDisplay;
