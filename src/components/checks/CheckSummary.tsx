import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "@/types/check";
import StatusBadge from "../status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { Clock, Calendar, Tag, Link as LinkIcon, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { toast } from "sonner";

interface CheckSummaryProps {
  check: Check;
}

const CheckSummary = ({ check }: CheckSummaryProps) => {
  const { getPingUrl } = useChecks();
  
  const copyPingUrl = () => {
    navigator.clipboard.writeText(getPingUrl(check.id));
    toast.success('Ping URL copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{check.name}</CardTitle>
            <CardDescription className="mt-1">{check.description || "No description"}</CardDescription>
          </div>
          <StatusBadge status={check.status} size="lg" withLabel />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Period: <span className="font-medium">{check.period} minutes</span>
              </span>
            </div>
            
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Grace Time: <span className="font-medium">{check.grace} minutes</span>
              </span>
            </div>

            {check.cronExpression && (
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Cron: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{check.cronExpression}</code>
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300 mr-2">Created:</span>
              <span className="font-medium">
                {formatDistanceToNow(check.createdAt, { addSuffix: true })}
              </span>
            </div>

            {check.lastPing && (
              <div className="flex items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 mr-2">Last ping:</span>
                <span className="font-medium">
                  {formatDistanceToNow(check.lastPing, { addSuffix: true })}
                </span>
              </div>
            )}

            {check.nextPingDue && (
              <div className="flex items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 mr-2">Next ping due:</span>
                <span className="font-medium">
                  {check.status === 'down' 
                    ? 'Overdue' 
                    : formatDistance(new Date(), check.nextPingDue, { 
                        addSuffix: true 
                      })
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Ping URL</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyPingUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <code className="text-xs bg-background p-2 rounded break-all">
              {getPingUrl(check.id)}
            </code>
          </div>

          {check.tags && check.tags.length > 0 && (
            <>
              <Separator />
              
              <div>
                <h4 className="text-sm text-gray-500 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {check.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckSummary;
