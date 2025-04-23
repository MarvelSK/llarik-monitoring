
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
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
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

// Note interface
interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    const { data: userResp } = await supabase.auth.getUser();
    setUserId(userResp.user?.id ?? null);

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ description: "Nepodarilo sa načítať poznámky." });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({ description: "Zadajte názov poznámky." });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("notes").insert([
      {
        title,
        content,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      },
    ]);
    setAdding(false);
    if (error) {
      toast({ description: "Chyba pri pridávaní poznámky." });
    } else {
      toast({ description: "Poznámka pridaná." });
      setTitle("");
      setContent("");
      fetchNotes();
    }
  };

  const openEdit = (note: Note) => {
    setEditId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || !editId) {
      toast({ description: "Zadajte názov poznámky." });
      return;
    }
    const { error } = await supabase
      .from("notes")
      .update({
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editId);

    if (error) {
      toast({ description: "Chyba pri úprave poznámky." });
    } else {
      toast({ description: "Poznámka upravená." });
      setEditOpen(false);
      setEditId(null);
      fetchNotes();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("notes").delete().eq("id", deletingId);

    if (error) {
      toast({ description: "Chyba pri mazaní poznámky." });
    } else {
      toast({ description: "Poznámka zmazaná." });
      setDeletingId(null);
      fetchNotes();
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mt-2">Moje poznámky</h1>
        <div className="space-y-4 border rounded-lg p-4 shadow bg-background">
          <Input
            placeholder="Názov poznámky"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Obsah..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
          />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? "Pridávam..." : "Pridať poznámku"}
          </Button>
        </div>
        <div>
          {loading ? (
            <div>Načítavam poznámky...</div>
          ) : notes.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              Žiadne poznámky.
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <Card key={note.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex-1">{note.title}</CardTitle>
                    {userId === note.user_id && (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(note)}
                          title="Upraviť"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingId(note.id)}
                              title="Zmazať"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Zmazať poznámku?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Ste si istí, že chcete zmazať túto poznámku? Táto akcia je nevratná.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setDeletingId(null)}
                              >
                                Zrušiť
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  handleDelete();
                                }}
                              >
                                Zmazať
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 whitespace-pre-wrap text-sm">
                      {note.content}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť poznámku</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Názov poznámky"
          />
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={4}
            placeholder="Obsah..."
          />
          <DialogFooter>
            <Button onClick={handleEdit}>Uložiť</Button>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Zrušiť
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Notes;
