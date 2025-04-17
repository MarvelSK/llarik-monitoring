
import { Check } from "@/types/check";
import CheckCard from "./CheckCard";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useProjects } from "@/context/ProjectContext";

interface CheckListProps {
  checks: Check[];
}

const CheckList = ({ checks }: CheckListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { projects } = useProjects();

  const filteredChecks = checks.filter(check => 
    check.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (check.description && check.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (check.tags && check.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Ensure project names are available
  const projectMap = projects.reduce((acc, project) => {
    acc[project.id] = project.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          className="pl-10"
          placeholder="Search by name, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredChecks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {checks.length === 0 
              ? "No checks added yet. Click 'New Check' to add one." 
              : "No checks match your search term."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChecks.map((check) => (
            <CheckCard 
              key={check.id} 
              check={{
                ...check,
                projectName: check.projectId ? (projectMap[check.projectId] || "Unknown Project") : undefined
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckList;
