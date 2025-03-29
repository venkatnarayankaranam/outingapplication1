
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsDialog = ({ isOpen, onClose }: NotificationsDialogProps) => {
  const notifications = [
    {
      id: 1,
      title: "New outing request",
      description: "Student John Doe has requested an outing.",
      time: "5 minutes ago",
    },
    {
      id: 2,
      title: "Request approved",
      description: "Your outing request has been approved.",
      time: "1 hour ago",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <h4 className="text-sm font-medium">{notification.title}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {notification.description}
                </p>
                <span className="text-xs text-gray-400 mt-2 block">
                  {notification.time}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
