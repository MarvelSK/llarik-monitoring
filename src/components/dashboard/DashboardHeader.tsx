
import { Button } from "@/components/ui/button";
import { RefreshCcw, Plus } from "lucide-react";
import { ReactNode } from "react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onAddNew?: () => void;
  extraButtons?: ReactNode;
}

const DashboardHeader = ({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  onAddNew,
  extraButtons,
}: DashboardHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex gap-2 mt-3 sm:mt-0">
        {extraButtons}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Obnoviť
          </Button>
        )}
        {onAddNew && (
          <Button
            size="sm"
            className="h-9"
            onClick={onAddNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nová kontrola
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
