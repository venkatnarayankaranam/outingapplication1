import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ApprovedStudent {
  name: string;
  rollNumber: string;
  floor: string;
  roomNumber: string;
  outTime: string;
  inTime: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  branch: string;
  semester: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: ApprovedStudent[];
  onDownloadPDF: () => void;
}

export const ApprovedStudentsList = ({ isOpen, onClose, students, onDownloadPDF }: Props) => {
  const { theme } = useTheme();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${theme === 'dark' ? 'bg-gray-800 text-white border-gray-700' : 'bg-white'} max-w-7xl w-full`}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            Approved Outing Students ({students.length})
          </DialogTitle>
          <Button
            onClick={onDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
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
              {students.map((student, index) => (
                <tr key={index} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className="py-3">{index + 1}</td>
                  <td className="py-3">{student.name}</td>
                  <td className="py-3">{student.rollNumber}</td>
                  <td className="py-3">{student.floor}</td>
                  <td className="py-3">{student.roomNumber}</td>
                  <td className="py-3">{student.outTime}</td>
                  <td className="py-3">{student.inTime}</td>
                  <td className="py-3">{student.phoneNumber}</td>
                  <td className="py-3">{student.parentPhoneNumber}</td>
                  <td className="py-3">{student.branch}</td>
                  <td className="py-3">{student.semester}</td>
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
  );
};
