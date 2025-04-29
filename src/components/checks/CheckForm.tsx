
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AuthType, Check, CheckEnvironment, CheckType, HttpMethod } from "@/types/check";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface CheckFormProps {
  onSubmit: (data: Partial<Check>) => void;
  defaultValues?: Partial<Check>;
  isEdit?: boolean;
}

const environmentOptions: CheckEnvironment[] = ["produkcia", "test", "manuál"];
const httpMethodOptions: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const authTypeOptions: AuthType[] = ["none", "basic", "bearer"];
const defaultSuccessCodes = [200, 201, 202, 204];

const formSchema = z.object({
  name: z.string().min(1, "Názov je povinný"),
  description: z.string().optional(),
  period: z.coerce.number().min(0, "Perióda musí byť aspoň 0 minút"),
  grace: z.coerce.number().min(1, "Doba odkladu musí byť aspoň 1 minúta"),
  tags: z.string().optional(),
  environments: z.array(z.string()).optional(),
  cronExpression: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(["standard", "http_request"]).default("standard"),
  httpUrl: z.string().url("Zadajte platnú URL vrátane http:// alebo https://").optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).default("GET").optional(),
  successCodes: z.string().optional(),
  httpParams: z.string().optional(), // Added for request parameters
  httpHeaders: z.string().optional(), // Added for request headers
  httpBody: z.string().optional(), // Added for request body
  authType: z.enum(["none", "basic", "bearer"]).default("none").optional(),
  authUsername: z.string().optional(), // For basic auth
  authPassword: z.string().optional(), // For basic auth
  authToken: z.string().optional() // For bearer token
});

const CheckForm = ({ onSubmit, defaultValues, isEdit = false }: CheckFormProps) => {
  const navigate = useNavigate();
  
  // Determine the initial tab based on whether the check uses CRON or period
  const initialTab = defaultValues?.cronExpression && defaultValues.cronExpression.trim() !== "" ? "cron" : "simple";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [checkType, setCheckType] = useState<CheckType>(defaultValues?.type || "standard");
  const [authType, setAuthType] = useState<AuthType>(defaultValues?.httpConfig?.auth?.type || "none");

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
      type: defaultValues?.type || "standard",
      httpUrl: defaultValues?.httpConfig?.url || "",
      httpMethod: defaultValues?.httpConfig?.method || "GET",
      successCodes: defaultValues?.httpConfig?.successCodes?.join(", ") || defaultSuccessCodes.join(", "),
      httpParams: defaultValues?.httpConfig?.params ? 
        Object.entries(defaultValues.httpConfig.params)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n") : "",
      httpHeaders: defaultValues?.httpConfig?.headers ? 
        Object.entries(defaultValues.httpConfig.headers)
          .map(([key, value]) => `${key}:${value}`)
          .join("\n") : "",
      httpBody: defaultValues?.httpConfig?.body || "",
      authType: defaultValues?.httpConfig?.auth?.type || "none",
      authUsername: defaultValues?.httpConfig?.auth?.username || "",
      authPassword: defaultValues?.httpConfig?.auth?.password || "",
      authToken: defaultValues?.httpConfig?.auth?.token || ""
    },
  });
  
  const periodValue = form.watch("period");
  const cronExpression = form.watch("cronExpression");
  const typeValue = form.watch("type");
  const watchAuthType = form.watch("authType");
  const httpMethodValue = form.watch("httpMethod");
  
  useEffect(() => {
    // When cron expression is set and period is not 0, set period to 0
    if (cronExpression && cronExpression.trim() !== "" && periodValue !== 0 && activeTab === "cron") {
      form.setValue("period", 0);
    }
  }, [cronExpression, periodValue, form, activeTab]);

  useEffect(() => {
    setCheckType(typeValue);
  }, [typeValue]);

  useEffect(() => {
    setAuthType(watchAuthType as AuthType);
  }, [watchAuthType]);

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
    
    const formData: Partial<Check> = {
      ...values,
      tags,
      environments: values.environments as CheckEnvironment[],
      type: values.type
    };

    // Add HTTP request configuration if this is an HTTP request check
    if (values.type === "http_request") {
      if (!values.httpUrl) {
        toast.error("URL je povinná pre HTTP Request kontroly");
        return;
      }

      const successCodes = values.successCodes 
        ? values.successCodes.split(",").map(code => parseInt(code.trim())).filter(code => !isNaN(code))
        : defaultSuccessCodes;

      // Parse parameters from text input
      const params: Record<string, string> = {};
      if (values.httpParams) {
        values.httpParams.split("\n").forEach(line => {
          const [key, value] = line.split("=").map(part => part.trim());
          if (key && value) {
            params[key] = value;
          }
        });
      }

      // Parse headers from text input
      const headers: Record<string, string> = {};
      if (values.httpHeaders) {
        values.httpHeaders.split("\n").forEach(line => {
          const [key, value] = line.split(":").map(part => part.trim());
          if (key && value) {
            headers[key] = value;
          }
        });
      }

      // Build authentication config
      const auth = values.authType !== "none" ? {
        type: values.authType,
        ...(values.authType === "basic" ? {
          username: values.authUsername,
          password: values.authPassword
        } : {}),
        ...(values.authType === "bearer" ? {
          token: values.authToken
        } : {})
      } : undefined;

      formData.httpConfig = {
        url: values.httpUrl,
        method: values.httpMethod as HttpMethod,
        successCodes,
        params: Object.keys(params).length ? params : undefined,
        headers: Object.keys(headers).length ? headers : undefined,
        body: values.httpBody || undefined,
        auth
      };
    }
    
    onSubmit(formData);
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
            {/* Check Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ kontroly</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte typ kontroly" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Štandardná ping kontrola</SelectItem>
                      <SelectItem value="http_request">HTTP Request kontrola</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Vyberte typ kontroly, ktorú chcete vytvoriť
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* HTTP Request specific fields */}
            {checkType === "http_request" && (
              <>
                <FormField
                  control={form.control}
                  name="httpUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cieľová URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/api/endpoint" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL endpoint, ktorý sa má skontrolovať
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="httpMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ Requestu</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte HTTP metódu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {httpMethodOptions.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        HTTP metóda na použitie
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Accordion type="single" collapsible className="w-full">
                  {/* Parameters Section */}
                  <AccordionItem value="parameters">
                    <AccordionTrigger>Parameters</AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="httpParams"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parametre</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="key1=value1&#10;key2=value2" 
                                className="font-mono text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Parametre pre request (jeden parameter na riadok vo formáte kľúč=hodnota)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Body Section - For POST, PUT, PATCH */}
                  {(httpMethodValue === "POST" || httpMethodValue === "PUT" || httpMethodValue === "PATCH") && (
                    <AccordionItem value="body">
                      <AccordionTrigger>Body</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="httpBody"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Body obsah</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder='{"key": "value"}' 
                                  className="font-mono text-sm min-h-32"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Obsah tela požiadavky (väčšinou JSON)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Headers Section */}
                  <AccordionItem value="headers">
                    <AccordionTrigger>Headers</AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="httpHeaders"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hlavičky (Headers)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Content-Type:application/json&#10;Accept:application/json" 
                                className="font-mono text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              HTTP hlavičky (jeden header na riadok vo formáte kľúč:hodnota)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Authentication Section */}
                  <AccordionItem value="auth">
                    <AccordionTrigger>Authentication</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="authType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Typ autentifikácie</FormLabel>
                              <Select 
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Vyberte typ autentifikácie" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="basic">Basic Auth</SelectItem>
                                  <SelectItem value="bearer">Bearer Token</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Basic Auth Fields */}
                        {authType === "basic" && (
                          <>
                            <FormField
                              control={form.control}
                              name="authUsername"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="authPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Bearer Token Fields */}
                        {authType === "bearer" && (
                          <FormField
                            control={form.control}
                            name="authToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Token</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <FormField
                  control={form.control}
                  name="successCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Úspešné HTTP kódy odpovede</FormLabel>
                      <FormControl>
                        <Input placeholder="200, 201, 202, 204" {...field} />
                      </FormControl>
                      <FormDescription>
                        Čiarkou oddelené HTTP kódy, ktoré budú považované za úspešné. Všetky ostatné kódy budú považované za zlyhanie.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
