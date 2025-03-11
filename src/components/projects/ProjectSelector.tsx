
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
  const { projects } = useProjects();

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
