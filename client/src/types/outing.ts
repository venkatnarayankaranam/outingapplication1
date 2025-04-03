export interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  email: string;
  floor: string[];
  roomNumber: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  branch: string;
  semester: string;
  outTime?: string; // Added for approved students list
  inTime?: string;  // Added for approved students list
}

export interface OutingRequest {
  id: string;
  name: string;
  rollNumber: string;
  roomNo: string;
  floor: string;
  date: string;
  outTime: string;
  inTime: string;
  status: 'pending' | 'approved' | 'denied';
  purpose: string;
  studentId: string;
  email: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  branch: string;
  semester: string;
}

export interface Stats {
  totalStudents: number;
  pending: number;
  approved: number;
  denied: number;
}

export interface ApprovedOuting {
  id: string;
  studentName: string;
  rollNumber: string;
  hostelBlock: string;
  roomNumber: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  outingDate: string;
  outingTime: string;
  returnTime: string;
  purpose: string;
  tracking: {
    checkIn?: {
      time: string;
      verifiedBy: string;
    };
    checkOut?: {
      time: string;
      verifiedBy: string;
    };
  };
  verificationStatus: 'not_started' | 'checked_out' | 'completed';
  approvalFlow: Array<{
    level: string;
    status: string;
    timestamp: string;
    remarks?: string;
    approvedBy: string;
  }>;
}
