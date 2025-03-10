
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanies } from "@/context/CompanyContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Building, Users, ClipboardCheck } from "lucide-react";
import { useChecks } from "@/context/CheckContext";

const AdminDashboard = () => {
  const { companies } = useCompanies();
  const { checks } = useChecks();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => navigate("/admin/companies")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {JSON.parse(localStorage.getItem("healthbeat-users") || "[]").length}
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checks.length}</div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mt-8 mb-4">All Companies</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/companies/${company.id}`)}
            >
              <CardHeader>
                <CardTitle>{company.name}</CardTitle>
                <CardDescription>
                  {company.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(company.createdAt, { addSuffix: true })}
                </div>
                <div className="text-sm mt-2">
                  {checks.filter(check => check.companyId === company.id).length} checks
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
