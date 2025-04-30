
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CronJob } from "@/types/cron";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createCronJob, updateCronJob } from "@/services/CronJobService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import HttpConfigForm from "./HttpConfigForm";

// Schema validation for the form
const cronJobSchema = z.object({
  name: z.string().min(3, { message: "Názov musí mať aspoň 3 znaky" }),
  description: z.string().optional(),
  endpoint: z.string().url({ message: "Neplatná URL adresa" }),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
  success_codes: z.array(z.number()).default([200]),
  schedule: z.string().min(5, { message: "CRON výraz musí mať aspoň 5 znakov" }),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  jwt_token: z.string().optional(),
  enabled: z.boolean().default(true)
});

type CronJobFormValues = z.infer<typeof cronJobSchema>;

interface CronJobFormProps {
  initialData?: CronJob;
}

export const CronJobForm = ({ initialData }: CronJobFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the form with default values or initial data
  const form = useForm<CronJobFormValues>({
    resolver: zodResolver(cronJobSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || "",
      endpoint: initialData.endpoint,
      method: initialData.method,
      success_codes: initialData.success_codes,
      schedule: initialData.schedule,
      body: initialData.body || "",
      headers: initialData.headers || {},
      parameters: initialData.parameters || {},
      jwt_token: initialData.jwt_token || "",
      enabled: initialData.enabled
    } : {
      name: "",
      description: "",
      endpoint: "",
      method: "GET",
      success_codes: [200],
      schedule: "*/5 * * * *", // Every 5 minutes
      body: "",
      headers: {},
      parameters: {},
      jwt_token: "",
      enabled: true
    }
  });

  const onSubmit = async (values: CronJobFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (initialData) {
        // Update existing job
        await updateCronJob(initialData.id, values);
        toast.success("CRON úloha bola úspešne aktualizovaná");
      } else {
        // Create new job
        await createCronJob(values as Omit<CronJob, 'id' | 'created_at' | 'updated_at'>);
        toast.success("CRON úloha bola úspešne vytvorená");
      }
      
      // Navigate back to jobs list
      navigate("/cron-jobs");
    } catch (error) {
      console.error("Error saving CRON job:", error);
      toast.error("Chyba pri ukladaní CRON úlohy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Základné informácie</CardTitle>
            <CardDescription>Zadajte základné údaje o CRON úlohe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Názov</FormLabel>
                  <FormControl>
                    <Input placeholder="Názov CRON úlohy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Popis úlohy (voliteľné)" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CRON Harmonogram</FormLabel>
                  <FormControl>
                    <Input placeholder="*/5 * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    CRON výraz pre určenie času spustenia. Napr. "*/5 * * * *" pre každých 5 minút.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Aktívna</FormLabel>
                    <FormDescription>
                      CRON úloha sa bude spúšťať podľa nastaveného harmonogramu
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>HTTP Konfigurácia</CardTitle>
            <CardDescription>Nastavenie HTTP požiadavky</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/endpoint" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTTP Metóda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="GET" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                        <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telo požiadavky (voliteľné)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Telo požiadavky vo formáte JSON"
                      {...field}
                      value={field.value || ""}
                      rows={5}
                    />
                  </FormControl>
                  <FormDescription>
                    Pre metódy POST, PUT, PATCH zadajte JSON body
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="jwt_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JWT Token (voliteľné)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="JWT Token pre autorizáciu" 
                      {...field} 
                      value={field.value || ""}
                      type="password"
                    />
                  </FormControl>
                  <FormDescription>
                    Token bude pridaný do hlavičky Authorization: Bearer [token]
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/cron-jobs")}
          >
            Zrušiť
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-healthy hover:bg-opacity-90 text-white"
          >
            {isSubmitting ? "Ukladám..." : initialData ? "Aktualizovať" : "Vytvoriť"} CRON úlohu
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CronJobForm;
