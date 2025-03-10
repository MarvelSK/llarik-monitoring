
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckPing } from "@/types/check";
import { format } from "date-fns";
import { CheckCircle, AlertTriangle, Clock, XCircle, Calendar } from "lucide-react";

interface PingsListProps {
  pings: CheckPing[];
}

const PingsList = ({ pings }: PingsListProps) => {
  const statusIcons = {
    success: <CheckCircle className="w-5 h-5 text-healthy" />,
    failure: <XCircle className="w-5 h-5 text-danger" />,
    start: <Clock className="w-5 h-5 text-blue-500" />,
    timeout: <AlertTriangle className="w-5 h-5 text-warning" />,
  };

  const statusText = {
    success: "Success",
    failure: "Failure",
    start: "Started",
    timeout: "Timeout",
  };

  if (pings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
          <CardDescription>Check activity history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-gray-500">No ping data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">History</CardTitle>
        <CardDescription>Check activity history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pings.map((ping) => (
            <div 
              key={ping.id} 
              className="flex items-center p-3 rounded-md border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="mr-3">
                {statusIcons[ping.status]}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <p className="font-medium">
                    {statusText[ping.status]}
                  </p>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(ping.timestamp, 'PPpp')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PingsList;
