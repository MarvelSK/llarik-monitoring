
import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjects } from "@/context/ProjectContext"

export function ProjectSelector() {
  const { projects, currentProject, setCurrentProject } = useProjects()

  return (
    <Select
      value={currentProject?.id || "all"}
      onValueChange={(value) => {
        setCurrentProject(value === "all" ? null : value);
      }}
    >
      <SelectTrigger className="w-[180px] h-8 mr-1">
        <SelectValue placeholder="Vyberte projekt" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" key="all">
          Všetky projekty
        </SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
