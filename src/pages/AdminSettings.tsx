
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UserManagement from "@/components/admin/UserManagement";
import EmailSettings from "@/components/admin/EmailSettings";
import AppBranding from "@/components/admin/AppBranding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSettings = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }

        // Check if user is admin
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!profile?.is_admin) {
          toast.error("Nemáte oprávnenie na prístup k administrátorským nastaveniam.");
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("Nastala chyba pri overovaní administrátorských práv.");
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Administrátorské nastavenia</h1>
          <p className="text-muted-foreground">Spravujte používateľov, nastavenia emailov a vzhľad aplikácie.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nastavenia systému</CardTitle>
            <CardDescription>
              Upravte nastavenia systému podľa vašich požiadaviek
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="users">Používatelia</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="branding">Vzhľad aplikácie</TabsTrigger>
              </TabsList>
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
              <TabsContent value="email">
                <EmailSettings />
              </TabsContent>
              <TabsContent value="branding">
                <AppBranding />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminSettings;
