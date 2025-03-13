
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, CheckEnvironment } from "@/types/check";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ProjectSelector from "@/components/projects/ProjectSelector";
import { useEffect, useState } from "react";

interface CheckFormProps {
  onSubmit: (data: Partial<Check>) => void;
  defaultValues?: Partial<Check>;
  isEdit?: boolean;
}

const environmentOptions: CheckEnvironment[] = ["produkcia", "test", "manuál"];

const formSchema = z.object({
  name: z.string().min(1, "Názov je povinný"),
  description: z.string().optional(),
  period: z.coerce.number().min(0, "Perióda musí byť aspoň 0 minút"),
  grace: z.coerce.number().min(1, "Doba odkladu musí byť aspoň 1 minúta"),
  tags: z.string().optional(),
  environments: z.array(z.string()).optional(),
  cronExpression: z.string().optional(),
  projectId: z.string().optional(),
});

const CheckForm = ({ onSubmit, defaultValues, isEdit = false }: CheckFormProps) => {
  const navigate = useNavigate();
  
  // Determine the initial tab based on whether the check uses CRON or period
  const initialTab = defaultValues?.cronExpression && defaultValues.cronExpression.trim() !== "" ? "cron" : "simple";
  const [activeTab, setActiveTab] = useState(initialTab);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      period: defaultValues?.period !== undefined ? defaultValues.period : 5,
      grace: defaultValues?.grace || 5,
      tags: defaultValues?.tags?.join(", ") || "",
      environments: defaultValues?.environments || [],
      cronExpression: defaultValues?.cronExpression || "",
      projectId: defaultValues?.projectId || "",
    },
  });
  
  const periodValue = form.watch("period");
  const cronExpression = form.watch("cronExpression");
  
  useEffect(() => {
    // When cron expression is set and period is not 0, set period to 0
    if (cronExpression && cronExpression.trim() !== "" && periodValue !== 0 && activeTab === "cron") {
      form.setValue("period", 0);
    }
  }, [cronExpression, periodValue, form, activeTab]);

  const toggleEnvironment = (env: CheckEnvironment) => {
    const currentEnvs = form.getValues().environments || [];
    if (currentEnvs.includes(env)) {
      form.setValue('environments', currentEnvs.filter(e => e !== env));
    } else {
      form.setValue('environments', [...currentEnvs, env]);
    }
  };

  const getEnvironmentColor = (env: CheckEnvironment) => {
    switch(env) {
      case 'produkcia': return 'bg-amber-500 text-white';
      case 'test': return 'bg-rose-500 text-white';
      case 'manuál': return 'bg-blue-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const tags = values.tags ? values.tags.split(",").map(tag => tag.trim()).filter(Boolean) : undefined;
    
    // Validate that if period is 0, cronExpression must be provided
    if (values.period === 0 && (!values.cronExpression || values.cronExpression.trim() === "")) {
      toast.error("Pre periódu 0 je potrebné zadať CRON výraz");
      return;
    }
    
    // Clear CRON expression if period is not 0
    if (values.period > 0) {
      values.cronExpression = "";
    }
    
    onSubmit({
      ...values,
      tags,
      environments: values.environments as CheckEnvironment[]
    });

    toast.success(isEdit ? "Kontrola úspešne aktualizovaná" : "Kontrola úspešne vytvorená");
    
    if (!isEdit) {
      navigate("/");
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // When switching to cron tab, set period to 0
    if (value === "cron") {
      form.setValue("period", 0);
    }
    
    // When switching to simple tab, set a default period if it was previously 0
    if (value === "simple" && periodValue === 0) {
      form.setValue("period", 5);
      // Clear the cron expression when switching to simple mode
      form.setValue("cronExpression", "");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardHeader>
            <CardTitle>{isEdit ? "Upraviť kontrolu" : "Vytvoriť novú kontrolu"}</CardTitle>
            <CardDescription>
              Konfigurácia monitorovania naplánovanej úlohy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Názov</FormLabel>
                  <FormControl>
                    <Input placeholder="napr., Záloha databázy" {...field} />
                  </FormControl>
                  <FormDescription>
                    Názov na identifikáciu tejto naplánovanej úlohy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ProjectSelector control={form.control} />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="napr., Spúšťa sa denne o 3:00 pre zálohu našej PostgreSQL databázy"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Voliteľné detaily o kontrole
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="simple">Jednoduchá perióda</TabsTrigger>
                <TabsTrigger value="cron">CRON harmonogram</TabsTrigger>
              </TabsList>
              
              <TabsContent value="simple">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perióda (minúty)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormDescription>
                          Očakávaný čas medzi pingmi
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="grace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doba odkladu (minúty)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormDescription>
                          Ako dlho čakať pred upozornením
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="cron">
                <FormField
                  control={form.control}
                  name="cronExpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CRON výraz</FormLabel>
                      <FormControl>
                        <Input placeholder="napr., 0 3 * * *" {...field} />
                      </FormControl>
                      <FormDescription>
                        Zadajte CRON harmonogram (napr., "45 16 * * 1,3" pre každý pondelok a stredu o 16:45). 
                        Formát: minúta hodina deň-mesiaca mesiac deň-týždňa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grace"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Doba odkladu (minúty)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Ako dlho čakať pred upozornením
                      </FormDescription>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <Input type="hidden" value="0" {...field} />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="environments"
              render={() => (
                <FormItem>
                  <FormLabel>Prostredia</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {environmentOptions.map((env) => {
                      const isSelected = form.getValues().environments?.includes(env) || false;
                      return (
                        <Badge 
                          key={env}
                          className={`${isSelected ? getEnvironmentColor(env) : 'bg-muted'} cursor-pointer`}
                          onClick={() => toggleEnvironment(env)}
                        >
                          {env}
                        </Badge>
                      );
                    })}
                  </div>
                  <FormDescription>
                    Vyberte značky prostredia pre túto kontrolu
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kód Úlohy</FormLabel>
                  <FormControl>
                    <Input placeholder="napr. WKD01, IC001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Čiarkou oddelené značky na kategorizáciu vašich kontrol
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate(isEdit ? `/checks/${defaultValues?.id}` : "/")}
            >
              Zrušiť
            </Button>
            <Button type="submit" className="bg-healthy hover:bg-opacity-90 text-white">
              {isEdit ? "Aktualizovať kontrolu" : "Vytvoriť kontrolu"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default CheckForm;
