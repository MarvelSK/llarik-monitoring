
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCcw } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  refreshing: boolean;
  onAddNew: () => void;
}

const DashboardHeader = ({
  title,
  subtitle,
  onRefresh,
  refreshing,
  onAddNew
}: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          onClick={onAddNew}
          className="gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Nová kontrola
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
