
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompanies } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  description: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof formSchema>;

const CompanySetupWizard = () => {
  const { createCompany, setCurrentCompany } = useCompanies();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: CompanyFormValues) => {
    try {
      setIsLoading(true);
      
      // First create the company in the context (for local state)
      const company = createCompany(data);
      
      // Then update the user's profile to link them to this company
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '');
      
      if (error) throw error;
      
      setCurrentCompany(company.id);
      toast.success("Company created successfully!");
      navigate("/checks/new");
    } catch (error: any) {
      toast.error(error.message || "Failed to create company");
      console.error("Error creating company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Create Your Company</CardTitle>
            <CardDescription>
              Set up a company profile to organize your checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of your organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your company..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Company"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default CompanySetupWizard;
