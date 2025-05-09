
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "@/types/check";
import StatusBadge from "../status/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { Clock, Calendar, Tag, Link as LinkIcon, Copy, Bell, HelpCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { useState } from "react";
import { IntegrationsPanel } from "../integrations/IntegrationsPanel";
import {sk} from "date-fns/locale";
import { explainCronExpression } from "@/utils/cronHelpers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CheckSummaryProps {
  check: Check;
}

const CheckSummary = ({ check }: CheckSummaryProps) => {
  const { getPingUrl } = useChecks();
  const [showIntegrations, setShowIntegrations] = useState(false);
  
  const copyPingUrl = () => {
    navigator.clipboard.writeText(getPingUrl(check.id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{check.name}</CardTitle>
            <CardDescription className="mt-1">{check.description || "Žiadny popis"}</CardDescription>
          </div>
          <StatusBadge status={check.status} size="lg" withLabel />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            {check.cronExpression ? (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    CRON: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{check.cronExpression}</code>
                  </span>
                </div>
                <div className="flex items-center text-sm pl-6 text-muted-foreground">
                  <span className="italic">{explainCronExpression(check.cronExpression)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Perióda: <span className="font-medium">{check.period} minút</span>
                </span>
              </div>
            )}
            
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Čas odkladu: <span className="font-medium">{check.grace} minút</span>
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300 mr-2">Vytvorené:</span>
              <span className="font-medium">
                {formatDistanceToNow(check.createdAt, { addSuffix: true, locale: sk })}
              </span>
            </div>

            {check.lastPing && (
              <div className="flex items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 mr-2">Posledný ping:</span>
                <span className="font-medium">
                  {formatDistanceToNow(check.lastPing, { addSuffix: true, locale: sk })}
                </span>
              </div>
            )}

            {check.nextPingDue && (
              <div className="flex items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 mr-2">Ďalší ping očakávaný:</span>
                <span className="font-medium">
                  {check.status === 'down' 
                    ? 'Oneskorený' 
                    : formatDistance(new Date(), check.nextPingDue, { 
                        addSuffix: true,
                        locale: sk 
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
                <span className="font-medium">URL pingu</span>
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

          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={() => setShowIntegrations(!showIntegrations)}
          >
            <Bell className="h-4 w-4" />
            {showIntegrations ? "Skryť integrácie" : "Zobraziť integrácie"}
          </Button>

          {showIntegrations && (
            <IntegrationsPanel checkId={check.id} />
          )}

          {check.tags && check.tags.length > 0 && (
            <>
              <Separator />
              
              <div>
                <h4 className="text-sm text-gray-500 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  Kód Úlohy
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
