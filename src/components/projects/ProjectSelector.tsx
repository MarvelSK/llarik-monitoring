
import { useProjects } from "@/context/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { useEffect } from "react";

interface ProjectSelectorProps {
  control: Control<any>;
  name?: string;
  description?: string;
  label?: string;
}

const ProjectSelector = ({ 
  control, 
  name = "projectId", 
  description = "Vyberte projekt pre túto kontrolu",
  label = "Projekt"
}: ProjectSelectorProps) => {
  const { projects, currentProject } = useProjects();

  // Set the default value of the form field to the current project ID
  useEffect(() => {
    if (currentProject && control) {
      // Use the proper React Hook Form method to set default value
      // getValues to check current value and setValue to set the value
      try {
        const currentValue = control._formValues?.[name];
        if (!currentValue && currentProject.id) {
          // Access the setValue method through useFormContext if needed
          // For now, we'll use field.onChange in the rendered component below
          // This will be handled by the defaultValue in the form initialization instead
        }
      } catch (error) {
        console.error("Error setting default project value:", error);
      }
    }
  }, [currentProject, control, name]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select 
              value={field.value || ""}
              onValueChange={(value) => {
                // Properly set the form value using the field methods provided by RHF
                field.onChange(value);
              }}
              defaultValue={currentProject?.id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte projekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription>
            {description}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProjectSelector;
