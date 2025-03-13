
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

const FileImport = () => {
  const [activeTab, setActiveTab] = useState<"projects" | "checks">("projects");
  const [importing, setImporting] = useState(false);
  const [projectsSummary, setProjectsSummary] = useState<ImportSummary | null>(null);
  const [checksSummary, setChecksSummary] = useState<ImportSummary | null>(null);
  const projectsFileRef = useRef<HTMLInputElement>(null);
  const checksFileRef = useRef<HTMLInputElement>(null);

  const parseProjectsFile = async (content: string): Promise<ImportSummary> => {
    const lines = content.split("\n").filter((line) => line.trim());
    const summary: ImportSummary = {
      total: lines.length,
      success: 0,
      errors: [],
      updated: 0,
      created: 0,
    };

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i];
        const project = JSON.parse(line);
        
        // Validate required fields
        if (!project.ID || !project.NAME || !project.OWNER) {
          throw new Error("Missing required fields (ID, NAME, or OWNER)");
        }

        // Check if project exists
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
        if (existingProject) {
          // Update existing project
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
        } else {
          // Create new project
          result = await supabase
            .from("projects")
            .insert(projectData);
          
          if (result.error) throw new Error(result.error.message);
          summary.created++;
        }

        summary.success++;
      } catch (error) {
        summary.errors.push({
          line: i + 1,
          data: lines[i],
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return summary;
  };

  const parseChecksFile = async (content: string): Promise<ImportSummary> => {
    const lines = content.split("\n").filter((line) => line.trim());
    const summary: ImportSummary = {
      total: lines.length,
      success: 0,
      errors: [],
      updated: 0,
      created: 0,
    };

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i];
        const check = JSON.parse(line);
        
        // Validate required fields
        if (!check.ID || !check.NAME || !check.PROJECT_ID) {
          throw new Error("Missing required fields (ID, NAME, or PROJECT_ID)");
        }

        // Verify project exists
        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("id", check.PROJECT_ID);

        if (!existingProject || existingProject.length === 0) {
          throw new Error(`Project with ID ${check.PROJECT_ID} not found`);
        }

        // Prepare tags array
        const tags = check.TAGS ? [check.TAGS] : [];

        // Check if check exists
        const { data: existingCheck } = await supabase
          .from("checks")
          .select("id")
          .eq("id", check.ID)
          .single();

        const checkData = {
          id: check.ID,
          name: check.NAME,
          description: check.DESCRIPTION || null,
          status: "new",
          period: check.PERIOD || 60,
          grace: check.GRACE || 30,
          tags: tags,
          environments: ["produkcia"],
          cron_expression: check.CRON_EXPRESSION || null,
          project_id: check.PROJECT_ID,
          created_at: new Date().toISOString(),
        };

        let result;
        if (existingCheck) {
          // Update existing check
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
        } else {
          // Create new check
          result = await supabase
            .from("checks")
            .insert(checkData);
          
          if (result.error) throw new Error(result.error.message);
          summary.created++;
        }

        summary.success++;
      } catch (error) {
        summary.errors.push({
          line: i + 1,
          data: lines[i],
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return summary;
  };

  const handleProjectsImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const summary = await parseProjectsFile(content);
      setProjectsSummary(summary);
      
      toast.success(`Import dokončený: ${summary.success} z ${summary.total} projektov úspešne importovaných`);
      if (summary.errors.length > 0) {
        toast.error(`${summary.errors.length} chýb počas importu`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Zlyhalo načítanie súboru");
    } finally {
      setImporting(false);
      if (projectsFileRef.current) {
        projectsFileRef.current.value = "";
      }
    }
  };

  const handleChecksImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const summary = await parseChecksFile(content);
      setChecksSummary(summary);
      
      toast.success(`Import dokončený: ${summary.success} z ${summary.total} kontrol úspešne importovaných`);
      if (summary.errors.length > 0) {
        toast.error(`${summary.errors.length} chýb počas importu`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Zlyhalo načítanie súboru");
    } finally {
      setImporting(false);
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
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl">Celkovo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{projectsSummary.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl text-green-600">Úspešné</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{projectsSummary.success}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-green-50">
                          {projectsSummary.created} vytvorených
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50">
                          {projectsSummary.updated} aktualizovaných
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl text-red-600">Chyby</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{projectsSummary.errors.length}</p>
                    </CardContent>
                  </Card>
                </div>
                
                {projectsSummary.errors.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Chyby pri importovaní</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Riadok</TableHead>
                          <TableHead>Dáta</TableHead>
                          <TableHead>Dôvod chyby</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectsSummary.errors.map((error, index) => (
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
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl">Celkovo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{checksSummary.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl text-green-600">Úspešné</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{checksSummary.success}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-green-50">
                          {checksSummary.created} vytvorených
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50">
                          {checksSummary.updated} aktualizovaných
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-xl text-red-600">Chyby</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-3xl font-bold">{checksSummary.errors.length}</p>
                    </CardContent>
                  </Card>
                </div>
                
                {checksSummary.errors.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Chyby pri importovaní</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Riadok</TableHead>
                          <TableHead>Dáta</TableHead>
                          <TableHead>Dôvod chyby</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checksSummary.errors.map((error, index) => (
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
