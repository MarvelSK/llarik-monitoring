import { CheckPing } from "@/types/check";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, Code, Database, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {sk} from "date-fns/locale";
import { Badge } from "../ui/badge";

interface PingsListProps {
  checkId: string;
}

const PingsList = ({ checkId }: PingsListProps) => {
  const [pings, setPings] = useState<CheckPing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('check_pings')
          .select('*')
          .eq('check_id', checkId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching pings:', error);
          return;
        }

        const formattedPings: CheckPing[] = data.map(ping => ({
          id: ping.id,
          timestamp: new Date(ping.timestamp),
          status: ping.status as CheckPing['status'],
          responseCode: ping.response_code || undefined,
          method: ping.method as CheckPing['method'],
          requestUrl: ping.request_url || undefined
        }));

        setPings(formattedPings);
      } catch (err) {
        console.error('Error in fetchPings:', err);
      } finally {
        setLoading(false);
      }
    };

    if (checkId) {
      fetchPings();
    }

    // Set up real-time subscription for new pings
    const channel = supabase
      .channel('public:check_pings')
      .on('postgres_changes', {
        event: 'INSERT', 
        schema: 'public',
        table: 'check_pings',
        filter: `check_id=eq.${checkId}`
      }, (payload) => {
        const newPing: CheckPing = {
          id: payload.new.id,
          timestamp: new Date(payload.new.timestamp),
          status: payload.new.status as CheckPing['status'],
          responseCode: payload.new.response_code || undefined,
          method: payload.new.method as CheckPing['method'] || undefined,
          requestUrl: payload.new.request_url || undefined
        };
        setPings(prev => [newPing, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkId]);

  const getPingIcon = (status: CheckPing["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-healthy" />;
      case "failure":
        return <XCircle className="w-5 h-5 text-danger" />;
      case "timeout":
        return <Clock className="w-5 h-5 text-warning" />;
      case "start":
        return <Clock className="w-5 h-5 text-primary" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    
    const colorMap: Record<string, string> = {
      'GET': 'bg-blue-500',
      'POST': 'bg-green-500',
      'PUT': 'bg-orange-500',
      'DELETE': 'bg-red-500',
      'PATCH': 'bg-yellow-500',
      'HEAD': 'bg-purple-500',
      'OPTIONS': 'bg-gray-500'
    };
    
    const color = colorMap[method] || 'bg-gray-500';
    
    return (
      <Badge className={`${color} text-white text-xs px-2 py-0.5`}>
        {method}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Nedávne pingy</h3>
        </div>
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center p-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Nedávne pingy</h3>
      </div>
      {pings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Zatiaľ neboli zaznamenané žiadne pingy</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {pings.map((ping) => (
            <div 
              key={ping.id} 
              className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
            >
              <div className="mr-3">{getPingIcon(ping.status)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ping.status}</span>
                  
                  {ping.responseCode && (
                    <Badge className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5">
                      <Code className="h-3 w-3 mr-1" /> {ping.responseCode}
                    </Badge>
                  )}
                  
                  {getMethodBadge(ping.method)}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(ping.timestamp, { addSuffix: true, locale: sk })}
                  
                  {ping.requestUrl && (
                    <div className="mt-1 truncate max-w-xs text-gray-500 dark:text-gray-400">
                      <span className="text-xs opacity-70">{ping.requestUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PingsList;
