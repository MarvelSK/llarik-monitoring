
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "@/types/check";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CheckFormProps {
  onSubmit: (data: Partial<Check>) => void;
  defaultValues?: Partial<Check>;
  isEdit?: boolean;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  period: z.coerce.number().min(1, "Period must be at least 1 minute"),
  grace: z.coerce.number().min(1, "Grace period must be at least 1 minute"),
  tags: z.string().optional(),
  cronExpression: z.string().optional(),
});

const CheckForm = ({ onSubmit, defaultValues, isEdit = false }: CheckFormProps) => {
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      period: defaultValues?.period || 5,
      grace: defaultValues?.grace || 5,
      tags: defaultValues?.tags?.join(", ") || "",
      cronExpression: defaultValues?.cronExpression || "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const tags = values.tags ? values.tags.split(",").map(tag => tag.trim()).filter(Boolean) : undefined;
    
    onSubmit({
      ...values,
      tags,
    });

    toast.success(isEdit ? "Check updated successfully" : "Check created successfully");
    
    if (!isEdit) {
      navigate("/");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardHeader>
            <CardTitle>{isEdit ? "Edit Check" : "Create a New Check"}</CardTitle>
            <CardDescription>
              Configure your scheduled task monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Database Backup" {...field} />
                  </FormControl>
                  <FormDescription>
                    A name to identify this scheduled task
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Runs daily at 3am to backup our PostgreSQL database"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional details about the check
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      Expected time between pings
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
                    <FormLabel>Grace Period (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      How long to wait before alerting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cronExpression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cron Expression (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 0 3 * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    Alternative to period: specify a cron schedule
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
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., production, database, backup" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated tags to categorize your checks
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
              Cancel
            </Button>
            <Button type="submit" className="bg-healthy hover:bg-opacity-90 text-white">
              {isEdit ? "Update Check" : "Create Check"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default CheckForm;
