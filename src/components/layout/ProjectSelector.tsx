
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
  const { projects, selectedProject, selectProject } = useProjects()

  return (
    <Select
      value={selectedProject?.id || ""}
      onValueChange={(value) => {
        const project = projects.find(p => p.id === value)
        if (project) {
          selectProject(project)
        }
      }}
    >
      <SelectTrigger className="w-[180px] h-8 mr-1">
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
