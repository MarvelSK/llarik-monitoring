
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProjects } from "@/context/ProjectContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ImportItem {
  id: string;
  name: string;
  status: "created" | "updated" | "error";
  error?: string;
  original: any;
}

interface ImportError {
  line: number;
  data: string;
  reason: string;
}

interface ImportSummary {
  total: number;
  success: number;
  errors: ImportError[];
  updated: number;
  created: number;
  items: ImportItem[];
}

const FileImport = () => {
  const [activeTab, setActiveTab] = useState<"projects" | "checks">("projects");
  const [importing, setImporting] = useState(false);
  const [projectsSummary, setProjectsSummary] = useState<ImportSummary | null>(null);
  const [checksSummary, setChecksSummary] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>("");
  const projectsFileRef = useRef<HTMLInputElement>(null);
  const checksFileRef = useRef<HTMLInputElement>(null);
  const { getAllProjects } = useProjects();

  const parseProjectsFile = async (content: string): Promise<ImportSummary> => {
    let projects = [];
    setProcessingStage("Analyzing file...");
    setProgress(10);
    
    try {
      if (content.trim().startsWith('[')) {
        projects = JSON.parse(content);
      } else {
        projects = content.split("\n")
          .filter((line) => line.trim())
          .map(line => JSON.parse(line));
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw new Error("Invalid JSON format");
    }
    
    const summary: ImportSummary = {
      total: projects.length,
      success: 0,
      errors: [],
      updated: 0,
      created: 0,
      items: [],
    };

    setProcessingStage(`Processing ${projects.length} projects...`);
    setProgress(20);

    for (let i = 0; i < projects.length; i++) {
      try {
        // Update progress based on current position
        const currentProgress = Math.floor(20 + ((i / projects.length) * 60));
        setProgress(currentProgress);
        setProcessingStage(`Processing project ${i + 1} of ${projects.length}`);
        
        const project = projects[i];
        
        if (!project.ID || !project.NAME || !project.OWNER) {
          throw new Error("Missing required fields (ID, NAME, or OWNER)");
        }

        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("id", project.ID)
          .single();

        const projectData = {
          id: project.ID,
          name: project.NAME,
          description: project.DESCRIPION || null,
          owner_id: project.OWNER,
          created_at: new Date().toISOString(),
        };

        let result;
        let status: "created" | "updated" | "error" = "error";
        
        if (existingProject) {
          result = await supabase
            .from("projects")
            .update({
              name: projectData.name,
              description: projectData.description,
              owner_id: projectData.owner_id,
            })
            .eq("id", projectData.id);
          
          if (result.error) throw new Error(result.error.message);
          summary.updated++;
          status = "updated";
        } else {
          result = await supabase
            .from("projects")
            .insert(projectData);
          
          if (result.error) throw new Error(result.error.message);
          summary.created++;
          status = "created";
        }

        summary.items.push({
          id: project.ID,
          name: project.NAME,
          status,
          original: project
        });

        summary.success++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push({
          line: i + 1,
          data: JSON.stringify(projects[i]),
          reason: errorMsg,
        });
        
        summary.items.push({
          id: projects[i].ID || `unknown-${i}`,
          name: projects[i].NAME || `Unnamed Project (Line ${i+1})`,
          status: "error",
          error: errorMsg,
          original: projects[i]
        });
      }
    }

    setProcessingStage("Finalizing import...");
    setProgress(90);
    return summary;
  };

  const parseChecksFile = async (content: string): Promise<ImportSummary> => {
    let checks = [];
    setProcessingStage("Analyzing file...");
    setProgress(10);
    
    try {
      if (content.trim().startsWith('[')) {
        checks = JSON.parse(content);
      } else {
        checks = content.split("\n")
          .filter((line) => line.trim())
          .map(line => JSON.parse(line));
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw new Error("Invalid JSON format");
    }
    
    const summary: ImportSummary = {
      total: checks.length,
      success: 0,
      errors: [],
      updated: 0,
      created: 0,
      items: [],
    };

    setProcessingStage(`Processing ${checks.length} checks...`);
    setProgress(20);

    for (let i = 0; i < checks.length; i++) {
      try {
        // Update progress based on current position
        const currentProgress = Math.floor(20 + ((i / checks.length) * 60));
        setProgress(currentProgress);
        setProcessingStage(`Processing check ${i + 1} of ${checks.length}`);
        
        const check = checks[i];
        
        if (!check.ID || !check.NAME || !check.PROJECT_ID) {
          throw new Error("Missing required fields (ID, NAME, or PROJECT_ID)");
        }

        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("id", check.PROJECT_ID);

        if (!existingProject || existingProject.length === 0) {
          throw new Error(`Project with ID ${check.PROJECT_ID} not found`);
        }

        const tags = check.TAGS ? Array.isArray(check.TAGS) ? check.TAGS : [check.TAGS] : [];

        const { data: existingCheck } = await supabase
          .from("checks")
          .select("id")
          .eq("id", check.ID)
          .single();

        let period = check.PERIOD;
        const cronExpression = check.CRON_EXPRESSION || null;
        
        if ((period === 0 || period === undefined) && cronExpression) {
          period = 0;
        } else if (period === 0 && !cronExpression) {
          period = 60;
        }

        const checkData = {
          id: check.ID,
          name: check.NAME,
          description: check.DESCRIPTION || null,
          status: "new",
          period: period || 60,
          grace: check.GRACE || 30,
          tags: tags,
          environments: ["produkcia"],
          cron_expression: cronExpression,
          project_id: check.PROJECT_ID,
          created_at: new Date().toISOString(),
        };

        let result;
        let status: "created" | "updated" | "error" = "error";
        
        if (existingCheck) {
          result = await supabase
            .from("checks")
            .update({
              name: checkData.name,
              description: checkData.description,
              period: checkData.period,
              grace: checkData.grace,
              tags: checkData.tags,
              cron_expression: checkData.cron_expression,
              project_id: checkData.project_id,
            })
            .eq("id", checkData.id);
          
          if (result.error) throw new Error(result.error.message);
          summary.updated++;
          status = "updated";
        } else {
          result = await supabase
            .from("checks")
            .insert(checkData);
          
          if (result.error) throw new Error(result.error.message);
          summary.created++;
          status = "created";
        }

        summary.items.push({
          id: check.ID,
          name: check.NAME,
          status,
          original: check
        });
        
        summary.success++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push({
          line: i + 1,
          data: JSON.stringify(checks[i]),
          reason: errorMsg,
        });
        
        summary.items.push({
          id: checks[i].ID || `unknown-${i}`,
          name: checks[i].NAME || `Unnamed Check (Line ${i+1})`,
          status: "error",
          error: errorMsg,
          original: checks[i]
        });
      }
    }

    setProcessingStage("Finalizing import...");
    setProgress(90);
    return summary;
  };

  const handleProjectsImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(5);
    setProcessingStage("Reading file...");
    
    try {
      const content = await file.text();
      const summary = await parseProjectsFile(content);
      
      setProcessingStage("Refreshing projects...");
      setProgress(95);
      
      await getAllProjects();
      
      setProcessingStage("Import complete");
      setProgress(100);
      setProjectsSummary(summary);
      
      toast.success(`Import dokončený: ${summary.success} z ${summary.total} projektov úspešne importovaných`);
      if (summary.errors.length > 0) {
        toast.error(`${summary.errors.length} chýb počas importu`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Zlyhalo načítanie súboru");
    } finally {
      setTimeout(() => {
        setImporting(false);
        setProgress(0);
        setProcessingStage("");
      }, 500);
      
      if (projectsFileRef.current) {
        projectsFileRef.current.value = "";
      }
    }
  };

  const handleChecksImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(5);
    setProcessingStage("Reading file...");
    
    try {
      const content = await file.text();
      const summary = await parseChecksFile(content);
      
      setProcessingStage("Import complete");
      setProgress(100);
      setChecksSummary(summary);
      
      toast.success(`Import dokončený: ${summary.success} z ${summary.total} kontrol úspešne importovaných`);
      if (summary.errors.length > 0) {
        toast.error(`${summary.errors.length} chýb počas importu`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Zlyhalo načítanie súboru");
    } finally {
      setTimeout(() => {
        setImporting(false);
        setProgress(0);
        setProcessingStage("");
      }, 500);
      
      if (checksFileRef.current) {
        checksFileRef.current.value = "";
      }
    }
  };

  const resetImport = () => {
    if (activeTab === "projects") {
      setProjectsSummary(null);
      if (projectsFileRef.current) {
        projectsFileRef.current.value = "";
      }
    } else {
      setChecksSummary(null);
      if (checksFileRef.current) {
        checksFileRef.current.value = "";
      }
    }
  };

  const getStatusBadge = (status: "created" | "updated" | "error") => {
    switch (status) {
      case "created":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Vytvorený
        </Badge>;
      case "updated":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <RefreshCw className="w-3 h-3 mr-1" /> Aktualizovaný
        </Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" /> Chyba
        </Badge>;
    }
  };

  const renderProgressBar = () => {
    if (!importing) return null;
    
    return (
      <div className="py-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium">{processingStage}</div>
          <div className="text-sm font-medium">{progress}%</div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    );
  };

  const renderSummary = (summary: ImportSummary | null, type: "projects" | "checks") => {
    if (!summary) return null;
    
    return (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl">Celkovo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl text-green-600">Úspešné</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold">{summary.success}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50">
                  {summary.created} vytvorených
                </Badge>
                <Badge variant="outline" className="bg-blue-50">
                  {summary.updated} aktualizovaných
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-xl text-red-600">Chyby</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold">{summary.errors.length}</p>
            </CardContent>
          </Card>
        </div>
        
        {summary.items.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Výsledky importu</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Názov</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detaily</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.items.map((item, index) => (
                  <TableRow key={index} className={
                    item.status === "error" ? "bg-red-50" : 
                    item.status === "created" ? "bg-green-50" : 
                    item.status === "updated" ? "bg-blue-50" : ""
                  }>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.status === "error" && item.error ? (
                        <span className="text-red-600 text-xs">{item.error}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.status === "created" ? "Nová položka" : "Existujúca položka aktualizovaná"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {summary.errors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Vyskytli sa chyby pri importe</AlertTitle>
            <AlertDescription>
              Niektoré položky nebolo možné importovať. Skontrolujte detaily chýb nižšie.
            </AlertDescription>
          </Alert>
        )}
        
        {summary.errors.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Detaily chýb pri importovaní</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Riadok</TableHead>
                  <TableHead>Dáta</TableHead>
                  <TableHead>Dôvod chyby</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.line}</TableCell>
                    <TableCell className="font-mono text-xs break-all">
                      {error.data}
                    </TableCell>
                    <TableCell>{error.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Hromadný import</CardTitle>
        <CardDescription>
          Importujte projekty alebo kontroly z JSON súborov
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "projects" | "checks")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Projekty</TabsTrigger>
            <TabsTrigger value="checks">Kontroly</TabsTrigger>
          </TabsList>
          
          {renderProgressBar()}
          
          <TabsContent value="projects">
            {!projectsSummary ? (
              <div className="flex flex-col items-center justify-center py-8">
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleProjectsImport}
                  className="hidden"
                  ref={projectsFileRef}
                  disabled={importing}
                />
                <Button 
                  onClick={() => projectsFileRef.current?.click()}
                  disabled={importing}
                  size="lg"
                  className="mb-4"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Spracovávam...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Vybrať súbor s projektami
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Vyberte JSON súbor s projektami. Každý riadok by mal obsahovať jeden záznam JSON.
                </p>
              </div>
            ) : (
              renderSummary(projectsSummary, "projects")
            )}
          </TabsContent>
          <TabsContent value="checks">
            {!checksSummary ? (
              <div className="flex flex-col items-center justify-center py-8">
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleChecksImport}
                  className="hidden"
                  ref={checksFileRef}
                  disabled={importing}
                />
                <Button 
                  onClick={() => checksFileRef.current?.click()}
                  disabled={importing}
                  size="lg"
                  className="mb-4"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Spracovávam...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Vybrať súbor s kontrolami
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Vyberte JSON súbor s kontrolami. Každý riadok by mal obsahovať jeden záznam JSON.
                </p>
              </div>
            ) : (
              renderSummary(checksSummary, "checks")
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetImport}
          disabled={importing || (!projectsSummary && !checksSummary)}
        >
          Nový import
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileImport;
