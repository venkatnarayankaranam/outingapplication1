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
        const parsedData = JSON.parse(data);
        if (!parsedData.requestId || !parsedData.name) {
          throw new Error('Invalid QR code format');
        }
        // Call the external onScan handler if provided
        if (onScan) onScan(data);
      } catch (error) {
        console.error('QR scan error:', error);
        toast.error('Invalid QR Code format');
        if (onError) onError(error as Error);
      }
    }
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
          constraints={{ 
            facingMode: 'environment',
            aspectRatio: 1
          }}
          videoStyle={{ width: '100%', height: '100%' }}
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
