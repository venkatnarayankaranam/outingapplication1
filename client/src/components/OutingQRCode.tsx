
import { QRCodeSVG } from 'qrcode.react';
import { Card } from './ui/card';

interface OutingQRCodeProps {
  studentName: string;
  rollNumber: string;
  outingDate: string;
  returnDate: string;
}

const OutingQRCode = ({ studentName, rollNumber, outingDate, returnDate }: OutingQRCodeProps) => {
  const qrData = JSON.stringify({
    studentName,
    rollNumber,
    outingDate,
    returnDate,
    generated: new Date().toISOString(),
  });

  return (
    <Card className="p-6 max-w-sm mx-auto text-center">
      <h3 className="font-semibold mb-4">Outing Pass QR Code</h3>
      <div className="bg-white p-4 rounded-lg inline-block">
        <QRCodeSVG
          value={qrData}
          size={200}
          level="H"
          includeMargin
        />
      </div>
      <div className="mt-4 space-y-1 text-sm">
        <p><span className="font-medium">Name:</span> {studentName}</p>
        <p><span className="font-medium">Roll Number:</span> {rollNumber}</p>
        <p><span className="font-medium">Outing Date:</span> {outingDate}</p>
        <p><span className="font-medium">Return Date:</span> {returnDate}</p>
      </div>
    </Card>
  );
};

export default OutingQRCode;
