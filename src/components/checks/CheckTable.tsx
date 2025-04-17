import { Check, CheckEnvironment } from "@/types/check";
import StatusBadge from "../status/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Copy, ArrowUpDown, Tag, Calendar, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { useProjects } from "@/context/ProjectContext";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CheckTableProps {
  checks: Check[];
}

const CheckTable = ({ checks }: CheckTableProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { getPingUrl, loading: checksLoading } = useChecks();
  const { projects, isAdmin, loading: projectsLoading } = useProjects();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Check | 'lastPingFormatted';
    direction: 'ascending' | 'descending';
  }>({
    key: 'lastPing',
    direction: 'descending'
  });

  const loading = checksLoading || projectsLoading;

  const projectMap = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc[project.id] = project.name;
      return acc;
    }, {} as Record<string, string>);
  }, [projects]);

  const processedChecks = useMemo(() => {
    let result = checks.filter(check => 
      check.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (check.description && check.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (check.tags && check.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    
    result.sort((a, b) => {
      if (sortConfig.key === 'lastPingFormatted') {
        const dateA = a.lastPing || new Date(0);
        const dateB = b.lastPing || new Date(0);
        
        return sortConfig.direction === 'ascending' 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      } else if (sortConfig.key === 'name') {
        return sortConfig.direction === 'ascending'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortConfig.key === 'status') {
        return sortConfig.direction === 'ascending'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      } else if (sortConfig.key === 'period') {
        return sortConfig.direction === 'ascending'
          ? a.period - b.period
          : b.period - a.period;
      } else {
        const dateA = a.lastPing || new Date(0);
        const dateB = b.lastPing || new Date(0);
        
        return sortConfig.direction === 'ascending' 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
    });
    
    return result;
  }, [checks, searchTerm, sortConfig]);

  const handleSort = (key: keyof Check | 'lastPingFormatted') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  const handleRowClick = (id: string) => {
    navigate(`/checks/${id}`);
  };

  const copyPingUrl = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getPingUrl(id));
    toast.success('URL pingu skopírované do schránky');
  };

  const getEnvironmentColor = (env: CheckEnvironment) => {
    switch(env) {
      case 'produkcia':
      case 'prod': return 'bg-amber-500 text-white';
      case 'test':
      case 'sandbox': return 'bg-rose-500 text-white';
      case 'manuál':
      case 'worker': return 'bg-slate-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "No Project";
    return projectMap[projectId] || "Unknown Project";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            className="pl-10"
            placeholder="Filtrovať podľa názvu kontroly..."
            disabled
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Stav</TableHead>
                <TableHead>Názov</TableHead>
                {isAdmin && <TableHead className="hidden md:table-cell">Projekt</TableHead>}
                <TableHead className="hidden lg:table-cell">Perióda / Odklad</TableHead>
                <TableHead className="hidden md:table-cell">Posledný ping</TableHead>
                <TableHead className="hidden sm:table-cell">URL pingu</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  )}
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          className="pl-10"
          placeholder="Filtrovať podľa názvu kontroly, tagu alebo popisu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {processedChecks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {checks.length === 0 
              ? "Zatiaľ neboli pridané žiadne kontroly. Kliknite na 'Nová kontrola' pre pridanie." 
              : "Vášmu vyhľadávaniu nezodpovedajú žiadne kontroly."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('status')} 
                      className="h-8 px-2"
                    >
                      Stav
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('name')} 
                      className="h-8 px-2 text-left"
                    >
                      Názov
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="hidden md:table-cell">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort('projectId' as keyof Check)} 
                        className="h-8 px-2"
                      >
                        Projekt
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  <TableHead className="hidden lg:table-cell">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('period')} 
                      className="h-8 px-2"
                    >
                      Časovanie / Odklad
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('lastPingFormatted')} 
                      className="h-8 px-2"
                    >
                      Posledný ping
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">URL pingu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedChecks.map((check) => (
                  <TableRow 
                    key={check.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(check.id)}
                  >
                    <TableCell className="py-1">
                      <StatusBadge status={check.status} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{check.name}</div>
                      <div className="flex flex-wrap gap-1 my-1">
                        {check.environments && check.environments.map((env) => (
                          <Badge key={env} className={`${getEnvironmentColor(env)} text-xs`}>
                            {env}
                          </Badge>
                        ))}
                        {check.tags && check.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {check.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="hidden md:table-cell">
                        {check.projectId ? (
                          <Badge variant="secondary" className="font-normal">
                            {getProjectName(check.projectId)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No Project</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        {check.cronExpression ? (
                          <>
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{check.cronExpression}</code>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{check.period} minút</span>
                          </>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">{check.grace} minút odklad</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        {check.lastPing
                            ? formatDistanceToNow(check.lastPing, { addSuffix: true, locale: sk })
                            : "Nikdy"}
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
                        <span className="sr-only md:not-sr-only md:inline-block md:text-xs">Kopírovať URL</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CheckTable;
