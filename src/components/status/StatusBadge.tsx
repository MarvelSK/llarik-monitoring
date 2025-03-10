
import { cn } from "@/lib/utils";
import { CheckStatus } from "@/types/check";

interface StatusBadgeProps {
  status: CheckStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
}

const StatusBadge = ({ status, className, size = "md", withLabel = false }: StatusBadgeProps) => {
  const statusConfig = {
    up: {
      color: "bg-healthy",
      text: "Up",
      textColor: "text-healthy-foreground",
      animation: ""
    },
    down: {
      color: "bg-danger",
      text: "Down",
      textColor: "text-danger-foreground",
      animation: ""
    },
    grace: {
      color: "bg-warning",
      text: "Late",
      textColor: "text-warning-foreground",
      animation: "animate-pulse"
    },
    new: {
      color: "bg-muted",
      text: "New",
      textColor: "text-muted-foreground",
      animation: ""
    }
  };

  const config = statusConfig[status];
  
  const sizeClass = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn(
        "rounded-full", 
        config.color, 
        sizeClass[size], 
        config.animation
      )} />
      {withLabel && (
        <span className={cn("text-sm font-medium", config.textColor)}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
