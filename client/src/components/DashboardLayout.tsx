
import { useState, useEffect } from "react";
import { Bell, User, Settings, LogOut, Moon, Sun } from "lucide-react";
import ProfileDialog from "./ProfileDialog";
import NotificationsDialog from "./NotificationsDialog";
import SettingsDialog from "./SettingsDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showScannerButton?: boolean;
  showProfileButton?: boolean;
  showOutingRequestButton?: boolean;
}

const DashboardLayout = ({ 
  children,
  showScannerButton = false,
  showProfileButton = false,
  showOutingRequestButton = false
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userEmail, userRole, logout, isAuthenticated } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated || !userRole) {
      // Redirect to login if not authenticated
      toast.error("Please login to continue");
      navigate("/login");
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <nav className={`${theme === 'dark' ? 'bg-gray-800/90 backdrop-blur-lg border-gray-700' : 'glass-card'} fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Outing System</h1>
          {userRole && (
            <span className="text-sm px-2 py-1 rounded-full bg-blue-500/20 text-blue-500">
              {userRole.replace('-', ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6">
          <button 
            className="relative hover:opacity-80 transition-opacity"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              2
            </span>
          </button>
          
          <button 
            className="hover:opacity-80 transition-opacity"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleTheme}
            className="hover:opacity-80 transition-opacity"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80 transition-opacity">
                <User className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`w-48 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      
      <main className={`pt-24 px-6 pb-6 max-w-7xl mx-auto ${theme === 'dark' ? 'text-gray-200' : ''}`}>
        <div className="fade-in">{children}</div>
      </main>

      <ProfileDialog 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userEmail={userEmail || ''}
      />
      <NotificationsDialog 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <SettingsDialog 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
