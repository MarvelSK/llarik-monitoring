
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
      // Set default value for the project selector if not already set
      const currentValue = control._getWatch(name);
      if (!currentValue && currentProject.id) {
        control._setValue(name, currentProject.id);
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
              onValueChange={field.onChange}
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
