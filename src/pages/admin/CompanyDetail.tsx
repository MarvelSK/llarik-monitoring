
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CheckTable from "@/components/checks/CheckTable";
import { useCompanies } from "@/context/CompanyContext";
import { useChecks } from "@/context/CheckContext";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Building, PlusCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getCompany } = useCompanies();
  const { checks } = useChecks();
  const navigate = useNavigate();

  const company = getCompany(id!);
  const companyChecks = company ? checks.filter(check => check.companyId === company.id) : [];

  if (!company) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Spoločnosť nebola nájdená</h2>
          <p className="text-gray-500 mb-6">Spoločnosť, ktorú hľadáte, neexistuje alebo bola odstránená.</p>
          <Button onClick={() => navigate("/admin/companies")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na spoločnosti
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/admin/companies")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">{company.name}</h1>
          </div>
          <Button 
            onClick={() => navigate("/checks/new", { state: { companyId: company.id } })}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Nová kontrola
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Detaily spoločnosti</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="font-medium">Popis</div>
                <div className="text-sm text-muted-foreground">
                  {company.description || "Žiadny popis nie je k dispozícii"}
                </div>
              </div>
              <div>
                <div className="font-medium">Vytvorené</div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(company.createdAt, { addSuffix: true })}
                </div>
              </div>
              <div>
                <div className="font-medium">Celkový počet kontrol</div>
                <div className="text-sm text-muted-foreground">
                  {companyChecks.length} kontrol
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Štatistiky kontrol</CardTitle>
              <CardDescription>Prehľad všetkých kontrol pre túto spoločnosť</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="font-medium">Celkom</div>
                  <div className="text-2xl">{companyChecks.length}</div>
                </div>
                <div>
                  <div className="font-medium text-healthy">Fungujúce</div>
                  <div className="text-2xl">
                    {companyChecks.filter(check => check.status === "up").length}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-danger">Nefungujúce</div>
                  <div className="text-2xl">
                    {companyChecks.filter(check => check.status === "down").length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Kontroly</h2>
          <CheckTable checks={companyChecks} />
        </div>
      </div>
    </Layout>
  );
};

export default CompanyDetail;
