
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Integration, IntegrationType } from "@/types/integration";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2, Mail, Globe, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Separator } from "@/components/ui/separator";
import { CheckboxGroup, CheckboxItem } from "../ui/checkbox-group";

// Create a new component for checkbox group
const CheckboxGroup = ({ children, className, ...props }: { children: React.ReactNode, className?: string }) => {
  return <div className={`space-y-2 ${className || ''}`} {...props}>{children}</div>;
};

const CheckboxItem = ({ children, ...props }: { children: React.ReactNode }) => {
  return (
    <div className="flex items-center space-x-2">
      <Switch {...props} />
      <span>{children}</span>
    </div>
  );
};

interface IntegrationsPanelProps {
  checkId: string;
}

const formSchema = z.object({
  type: z.enum(['email', 'webhook', 'slack', 'discord']),
  name: z.string().min(1).max(100),
  config: z.object({
    url: z.string().url().optional(),
    email: z.string().email().optional(),
  }),
  notifyOn: z.array(z.enum(['up', 'down', 'grace'])).min(1),
});

export function IntegrationsPanel({ checkId }: IntegrationsPanelProps) {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(() => {
    const savedIntegrations = localStorage.getItem(`integrations-${checkId}`);
    return savedIntegrations ? JSON.parse(savedIntegrations, dateReviver) : [];
  });
  const [isAdding, setIsAdding] = useState(false);

  function dateReviver(_key: string, value: any) {
    if (typeof value === 'string') {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (iso8601Regex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'webhook',
      name: '',
      config: {
        url: '',
        email: '',
      },
      notifyOn: ['down'],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newIntegration: Integration = {
      id: uuidv4(),
      type: values.type,
      name: values.name,
      config: values.config,
      enabled: true,
      notifyOn: values.notifyOn,
      createdAt: new Date(),
    };

    const updatedIntegrations = [...integrations, newIntegration];
    setIntegrations(updatedIntegrations);
    localStorage.setItem(`integrations-${checkId}`, JSON.stringify(updatedIntegrations));
    
    toast({
      title: "Integration added",
      description: "Your integration has been added successfully",
    });
    
    setIsAdding(false);
    form.reset();
  }

  const toggleIntegration = (id: string) => {
    const updatedIntegrations = integrations.map(integration => 
      integration.id === id 
        ? { ...integration, enabled: !integration.enabled } 
        : integration
    );
    
    setIntegrations(updatedIntegrations);
    localStorage.setItem(`integrations-${checkId}`, JSON.stringify(updatedIntegrations));
  };

  const deleteIntegration = (id: string) => {
    const updatedIntegrations = integrations.filter(integration => integration.id !== id);
    setIntegrations(updatedIntegrations);
    localStorage.setItem(`integrations-${checkId}`, JSON.stringify(updatedIntegrations));
    
    toast({
      title: "Integration deleted",
      description: "Your integration has been deleted",
    });
  };

  const renderIcon = (type: IntegrationType) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'webhook':
      case 'slack':
      case 'discord':
        return <Globe className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const renderConfigForm = () => {
    const type = form.watch('type');
    
    if (type === 'email') {
      return (
        <FormField
          control={form.control}
          name="config.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="notifications@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll send status notifications to this address.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    
    return (
      <FormField
        control={form.control}
        name="config.url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Webhook URL</FormLabel>
            <FormControl>
              <Input placeholder="https://example.com/webhook" {...field} />
            </FormControl>
            <FormDescription>
              We'll send a POST request to this URL when the status changes.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Integrations</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAdding(!isAdding)}
          className="gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          Add Integration
        </Button>
      </div>
      
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add Integration</CardTitle>
            <CardDescription>
              Get notified when your check changes status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="webhook" onValueChange={(value) => form.setValue('type', value as IntegrationType)}>
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="webhook">Webhook</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="slack">Slack</TabsTrigger>
                    <TabsTrigger value="discord">Discord</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Webhook" {...field} />
                      </FormControl>
                      <FormDescription>
                        A name to help you identify this integration.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {renderConfigForm()}
                
                <FormField
                  control={form.control}
                  name="notifyOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notify On</FormLabel>
                      <FormControl>
                        <CheckboxGroup>
                          <CheckboxItem
                            checked={field.value.includes('up')}
                            onCheckedChange={(checked) => {
                              const current = new Set(field.value);
                              checked ? current.add('up') : current.delete('up');
                              field.onChange(Array.from(current));
                            }}
                          >
                            When check goes UP
                          </CheckboxItem>
                          <CheckboxItem
                            checked={field.value.includes('grace')}
                            onCheckedChange={(checked) => {
                              const current = new Set(field.value);
                              checked ? current.add('grace') : current.delete('grace');
                              field.onChange(Array.from(current));
                            }}
                          >
                            When check is running late
                          </CheckboxItem>
                          <CheckboxItem
                            checked={field.value.includes('down')}
                            onCheckedChange={(checked) => {
                              const current = new Set(field.value);
                              checked ? current.add('down') : current.delete('down');
                              field.onChange(Array.from(current));
                            }}
                          >
                            When check goes DOWN
                          </CheckboxItem>
                        </CheckboxGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Integration</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {integrations.length === 0 && !isAdding ? (
        <div className="text-center p-4 border border-dashed rounded-md">
          <p className="text-muted-foreground">No integrations configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add an integration to get notified when this check changes status.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((integration) => (
            <div 
              key={integration.id} 
              className="flex items-center justify-between p-3 border rounded-md"
            >
              <div className="flex items-center gap-3">
                <Switch 
                  checked={integration.enabled} 
                  onCheckedChange={() => toggleIntegration(integration.id)}
                />
                <div className="flex items-center">
                  {renderIcon(integration.type)}
                  <span className="ml-2 font-medium">{integration.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {integration.notifyOn.includes('up') && (
                    <Badge variant="outline" className="bg-healthy text-white">Up</Badge>
                  )}
                  {integration.notifyOn.includes('grace') && (
                    <Badge variant="outline" className="bg-warning text-white">Late</Badge>
                  )}
                  {integration.notifyOn.includes('down') && (
                    <Badge variant="outline" className="bg-danger text-white">Down</Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteIntegration(integration.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
