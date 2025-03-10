import { Check, CheckEnvironment } from "@/types/check";
import StatusBadge from "../status/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, Copy, Link } from "lucide-react";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { toast } from "sonner";

interface CheckTableProps {
  checks: Check[];
}

const CheckTable = ({ checks }: CheckTableProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { getPingUrl } = useChecks();

  const filteredChecks = checks.filter(check => 
    check.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (check.description && check.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.tags && check.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleRowClick = (id: string) => {
    navigate(`/checks/${id}`);
  };

  const copyPingUrl = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getPingUrl(id));
    toast.success('Ping URL copied to clipboard');
  };

  const getEnvironmentColor = (env: CheckEnvironment) => {
    switch(env) {
      case 'prod': return 'bg-amber-500 text-white';
      case 'sandbox': return 'bg-rose-500 text-white';
      case 'worker': return 'bg-slate-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          className="pl-10"
          placeholder="Filter by check name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredChecks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {checks.length === 0 
              ? "No checks added yet. Click 'New Check' to add one." 
              : "No checks match your search term."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">UUID</TableHead>
                <TableHead className="hidden lg:table-cell">Period / Grace</TableHead>
                <TableHead className="hidden md:table-cell">Last Ping</TableHead>
                <TableHead className="hidden sm:table-cell">Ping URL</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecks.map((check) => (
                <TableRow 
                  key={check.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(check.id)}
                >
                  <TableCell className="py-3">
                    <StatusBadge status={check.status} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium mb-1">{check.name}</div>
                    <div className="flex flex-wrap gap-1 my-1">
                      {check.environments && check.environments.map((env) => (
                        <Badge key={env} className={`${getEnvironmentColor(env)} text-xs`}>
                          {env}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">
                    {check.id}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div>{check.period} minutes</div>
                    <div className="text-muted-foreground text-sm">{check.grace} minutes grace</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>
                      {check.lastPing 
                        ? formatDistanceToNow(check.lastPing, { addSuffix: true })
                        : "Never"}
                    </div>
                    {check.lastDuration && (
                      <div className="text-muted-foreground text-sm">
                        {check.lastDuration}s
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={(e) => copyPingUrl(check.id, e)}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only md:not-sr-only md:inline-block md:text-xs">Copy URL</span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/checks/${check.id}`);
                        }}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/checks/${check.id}/edit`);
                        }}>
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CheckTable;
