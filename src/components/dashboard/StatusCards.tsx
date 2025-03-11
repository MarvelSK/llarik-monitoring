
import { Activity, AlertCircle, Clock } from "lucide-react";

interface StatusCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  pulseAnimation?: boolean;
}

const StatusCard = ({ title, count, icon, color, pulseAnimation = false }: StatusCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`${color} p-3 rounded-full mr-4 text-white ${pulseAnimation ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
};

interface StatusCardsProps {
  allChecksCount: number;
  upChecksCount: number;
  lateChecksCount: number;
  downChecksCount: number;
}

const StatusCards = ({
  allChecksCount,
  upChecksCount,
  lateChecksCount,
  downChecksCount
}: StatusCardsProps) => {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatusCard 
        title="Celkový počet" 
        count={allChecksCount} 
        icon={<Activity className="w-5 h-5" />}
        color="bg-primary"
      />
      <StatusCard 
        title="Aktívne"
        count={upChecksCount} 
        icon={<Activity className="w-5 h-5" />}
        color="bg-healthy"
      />
      <StatusCard 
        title="Meškajúce"
        count={lateChecksCount} 
        icon={<Clock className="w-5 h-5" />}
        color="bg-warning"
        pulseAnimation={lateChecksCount > 0}
      />
      <StatusCard 
        title="V Poruche"
        count={downChecksCount} 
        icon={<AlertCircle className="w-5 h-5" />}
        color="bg-danger"
        pulseAnimation={downChecksCount > 0}
      />
    </div>
  );
};

export default StatusCards;
