
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RequireAuth from "@/components/auth/RequireAuth";
import UserManagement from "@/components/admin/UserManagement";
import EmailSettings from "@/components/admin/EmailSettings";
import AppBranding from "@/components/admin/AppBranding";

const AdminSettings = () => {
  return (
    <RequireAuth requireAdmin={true}>
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
    </RequireAuth>
  );
};

export default AdminSettings;
