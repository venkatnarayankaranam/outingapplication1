
import { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { toast } from 'sonner';
import { Card } from './ui/card';

interface QRScannerProps {
  onScan?: (data: string) => void;
  onError?: (error: Error) => void;
}

const QRScanner = ({ onScan, onError }: QRScannerProps = {}) => {
  const [scanResult, setScanResult] = useState('');

  const handleScan = (data: string | null) => {
    if (data) {
      setScanResult(data);
      try {
        const requestData = JSON.parse(data);
        toast.success(`Verified: ${requestData.studentName} - ${requestData.rollNumber}`);
        // Call the external onScan handler if provided
        if (onScan) onScan(data);
      } catch (error) {
        toast.error('Invalid QR Code');
      }
    }
  };

  const handleError = (error: Error) => {
    toast.error('Error scanning QR code: ' + error.message);
    // Call the external onError handler if provided
    if (onError) onError(error);
  };

  return (
    <Card className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">QR Code Scanner</h2>
      <div className="aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-lg">
        <QrReader
          onResult={(result) => {
            if (result) {
              handleScan(result.getText());
            }
          }}
          constraints={{ facingMode: 'environment' }}
        />
      </div>
      {scanResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="font-medium">Last Scanned Result:</p>
          <p className="text-sm">{scanResult}</p>
        </div>
      )}
    </Card>
  );
};

export default QRScanner;
