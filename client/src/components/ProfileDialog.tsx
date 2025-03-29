
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Phone, UserCircle, Building, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

const ProfileDialog = ({ isOpen, onClose, userEmail }: ProfileDialogProps) => {
  const { userRole, userDetails } = useAuth();
  const { theme } = useTheme();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[425px] ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <UserCircle className="h-20 w-20 text-gray-400" />
            <div className="text-center">
              <p className="font-semibold text-lg">
                {userDetails?.name || userRole?.replace('-', ' ')}
              </p>
              <p className="text-sm px-2 py-1 mt-1 rounded-full bg-blue-500/20 text-blue-500 inline-block">
                {userRole?.replace('-', ' ')}
              </p>
            </div>
          </div>
          
          <div className={`space-y-3 p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{userEmail}</span>
            </div>
            
            {userDetails && (
              <>
                {userDetails.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{userDetails.phone}</span>
                  </div>
                )}
                
                {userDetails.hostelBlock && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      {userDetails.hostelBlock} 
                      {userDetails.roomNumber && ` - Room ${userDetails.roomNumber}`}
                    </span>
                  </div>
                )}
                
                {userDetails.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4 text-gray-500" />
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{userDetails.department}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
