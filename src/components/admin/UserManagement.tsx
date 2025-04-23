
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, UserPlus, Trash2, Edit, Shield, Search } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_admin: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<{
    name: string;
    email: string;
    is_admin: boolean;
  }>({ name: "", email: "", is_admin: false });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Nepodarilo sa načítať používateľov");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUserId(user.id);
    setEditUser({
      name: user.name,
      email: user.email,
      is_admin: user.is_admin,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (userId: string) => {
    setSelectedUserId(userId);
    setIsDeleteDialogOpen(true);
  };

  const updateUser = async () => {
    if (!selectedUserId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editUser.name,
          is_admin: editUser.is_admin,
        })
        .eq("id", selectedUserId);

      if (error) throw error;
      toast.success("Používateľ bol aktualizovaný");
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Nepodarilo sa aktualizovať používateľa");
    }
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;

    try {
      // First delete from profiles table (this has cascade delete set up)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUserId);

      if (error) throw error;

      toast.success("Používateľ bol odstránený");
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Nepodarilo sa odstrániť používateľa");
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Používateľ ${currentStatus ? "už nie je" : "je teraz"} administrátor`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Nepodarilo sa zmeniť status administrátora");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Správa používateľov</h2>
        <div className="relative max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Vyhľadať používateľa..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="border rounded-md">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vytvorený</TableHead>
                  <TableHead className="text-right">Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Nenašli sa žiadni používatelia
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            Administrátor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Používateľ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                            title={user.is_admin ? "Odstrániť admin práva" : "Nastaviť ako admina"}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                            title="Upraviť užívateľa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePrompt(user.id)}
                            className="hover:text-red-500"
                            title="Zmazať užívateľa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť používateľa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Meno</label>
              <Input
                id="name"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                value={editUser.email}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_admin"
                checked={editUser.is_admin}
                onChange={(e) => setEditUser({ ...editUser, is_admin: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="is_admin" className="text-sm font-medium">Administrátor</label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Zrušiť</Button>
            </DialogClose>
            <Button onClick={updateUser}>Uložiť zmeny</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skutočne chcete odstrániť tohto používateľa?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Používateľ a všetky jeho údaje budú natrvalo odstránené zo systému.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-red-600 hover:bg-red-700">
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
