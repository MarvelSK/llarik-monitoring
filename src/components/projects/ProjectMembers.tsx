
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectMember } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash, User, Edit, Check, X } from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface ProjectMembersProps {
  projectId: string;
  isOwner: boolean;
  members: ProjectMember[];
  onMembersChange: () => void;
  isAdmin?: boolean;
}

const ProjectMembers = ({ projectId, isOwner, members, onMembersChange, isAdmin = false }: ProjectMembersProps) => {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<"read_only" | "read_write">("read_only");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<"read_only" | "read_write">("read_only");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Zadajte emailovú adresu");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Updated parameter names to match the fixed function
      const { data, error } = await supabase.rpc('invite_user_to_project', {
        p_project_id: projectId,
        p_email: email.trim(),
        p_permissions: permissions
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

  const startEditingMember = (member: ProjectMember) => {
    setEditMemberId(member.id);
    setEditPermissions(member.permissions);
  };

  const cancelEditingMember = () => {
    setEditMemberId(null);
  };

  const updateMemberPermissions = async () => {
    if (!editMemberId) return;
    
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ permissions: editPermissions })
        .eq('id', editMemberId);
      
      if (error) throw error;
      
      toast.success("Oprávnenia boli aktualizované");
      setEditMemberId(null);
      onMembersChange();
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast.error(error.message || "Nepodarilo sa aktualizovať oprávnenia");
    }
  };

  return (
    <Card className="shadow-none border-0">
      <CardHeader className="px-0">
        <CardTitle>Zdieľanie Projektu</CardTitle>
        <CardDescription>
          Spravujte prístup pre ďalších používateľov k tomuto projektu
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {(isOwner || isAdmin) && (
          <form onSubmit={handleInvite} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
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

        <div>
          <h3 className="text-base font-medium mb-4">Členovia projektu</h3>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tento projekt zatiaľ nemá žiadnych členov</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Používateľ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Oprávnenia</TableHead>
                  {(isOwner || isAdmin) && <TableHead className="text-right">Akcie</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        {member.user?.name || "Používateľ"}
                      </div>
                    </TableCell>
                    <TableCell>{member.user?.email}</TableCell>
                    <TableCell>
                      {editMemberId === member.id ? (
                        <Select 
                          value={editPermissions} 
                          onValueChange={(value) => setEditPermissions(value as "read_only" | "read_write")}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read_only">Len na čítanie</SelectItem>
                            <SelectItem value="read_write">Na čítanie a úpravy</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-800 rounded-md px-2 py-1">
                          {member.permissions === 'read_write' ? 'Na čítanie a úpravy' : 'Len na čítanie'}
                        </span>
                      )}
                    </TableCell>
                    {(isOwner || isAdmin) && (
                      <TableCell className="text-right">
                        {editMemberId === member.id ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={updateMemberPermissions}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={cancelEditingMember}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => startEditingMember(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectMembers;
