
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/context/CompanyContext";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Názov je povinný"),
  description: z.string().optional(),
});

const CompanyCreate = () => {
  const navigate = useNavigate();
  const { createCompany } = useCompanies();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    createCompany(values);
    toast.success("Spoločnosť bola úspešne vytvorená");
    navigate("/admin/companies");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/admin/companies")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Vytvoriť novú spoločnosť</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <CardHeader>
                <CardTitle>Informácie o spoločnosti</CardTitle>
                <CardDescription>
                  Vytvorte novú spoločnosť pre organizáciu kontrol
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Názov spoločnosti</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme s.r.o." {...field} />
                      </FormControl>
                      <FormDescription>
                        Názov spoločnosti
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
                      <FormLabel>Popis</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Stručný popis spoločnosti"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Voliteľné detaily o spoločnosti
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
                  onClick={() => navigate("/admin/companies")}
                >
                  Zrušiť
                </Button>
                <Button type="submit">
                  Vytvoriť spoločnosť
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </Layout>
  );
};

export default CompanyCreate;
