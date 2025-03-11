
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectMember } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash, User } from "lucide-react";

interface ProjectMembersProps {
  projectId: string;
  isOwner: boolean;
  members: ProjectMember[];
  onMembersChange: () => void;
}

const ProjectMembers = ({ projectId, isOwner, members, onMembersChange }: ProjectMembersProps) => {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<"read_only" | "read_write">("read_only");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Zadajte emailovú adresu");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.rpc('invite_user_to_project', {
        project_id: projectId,
        email: email.trim(),
        permissions: permissions
      });
      
      if (error) throw error;
      
      toast.success("Používateľ bol úspešne pridaný do projektu");
      setEmail("");
      onMembersChange();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Nepodarilo sa pridať používateľa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success("Používateľ bol odstránený z projektu");
      onMembersChange();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Nepodarilo sa odstrániť používateľa");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zdieľanie Projektu</CardTitle>
        <CardDescription>
          Spravujte prístup pre ďalších používateľov k tomuto projektu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="email">Email používateľa</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="permissions">Oprávnenia</Label>
                <Select 
                  value={permissions} 
                  onValueChange={(value) => setPermissions(value as "read_only" | "read_write")}
                >
                  <SelectTrigger id="permissions">
                    <SelectValue placeholder="Vyberte oprávnenia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read_only">Len na čítanie</SelectItem>
                    <SelectItem value="read_write">Na čítanie a úpravy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Pridávam..." : "Pridať používateľa"}
            </Button>
          </form>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Členovia projektu</h3>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tento projekt zatiaľ nemá žiadnych členov</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{member.user?.name || "Používateľ"}</p>
                      <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs bg-slate-100 text-slate-800 rounded-md px-2 py-1 mr-2">
                      {member.permissions === 'read_write' ? 'Na čítanie a úpravy' : 'Len na čítanie'}
                    </span>
                    {isOwner && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectMembers;
