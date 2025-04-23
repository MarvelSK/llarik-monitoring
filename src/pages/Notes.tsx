
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fetchNotes = async () => {
    setLoading(true);
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
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      toast({ description: "Zadajte názov poznámky." });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("notes").insert([
      { title, content }
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
            <div className="text-muted-foreground py-8 text-center">Žiadne poznámky.</div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <Card key={note.id}>
                  <CardHeader>
                    <CardTitle>{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 whitespace-pre-wrap text-sm">{note.content}</div>
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
    </Layout>
  );
};

export default Notes;
