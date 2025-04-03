import { Badge } from "@/components/ui/badge";

interface RequestStatusBadgeProps {
  status: string;
}

export const RequestStatusBadge = ({ status }: RequestStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_floor_incharge':
        return { 
          label: 'Pending at Floor Incharge', 
          variant: 'secondary' as const,
          description: 'Stage 1 of 3'
        };
      case 'pending_hostel_incharge':
        return { 
          label: 'Pending at Hostel Incharge', 
          variant: 'secondary' as const,
          description: 'Stage 2 of 3'
        };
      case 'pending_warden':
        return { 
          label: 'Pending at Warden', 
          variant: 'secondary' as const,
          description: 'Stage 3 of 3'
        };
      case 'approved':
        return { 
          label: 'Fully Approved', 
          variant: 'outline' as const,
          description: 'All approvals complete'
        };
      case 'denied':
        return { 
          label: 'Denied', 
          variant: 'destructive' as const,
          description: 'Request rejected'
        };
      default:
        return { 
          label: 'Unknown', 
          variant: 'default' as const,
          description: ''
        };
    }
  };

  const { label, variant, description } = getStatusConfig(status);

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={variant}>{label}</Badge>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
};
