
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanies } from "@/context/CompanyContext";
import { useChecks } from "@/context/CheckContext";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CompanyList = () => {
  const { companies } = useCompanies();
  const { checks } = useChecks();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Spoločnosti</h1>
          </div>
          <Button 
            onClick={() => navigate("/admin/companies/new")}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Nová spoločnosť
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Názov</TableHead>
                <TableHead>Popis</TableHead>
                <TableHead>Vytvorené</TableHead>
                <TableHead>Kontroly</TableHead>
                <TableHead>Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.description || "-"}</TableCell>
                  <TableCell>{formatDistanceToNow(company.createdAt, { addSuffix: true })}</TableCell>
                  <TableCell>{checks.filter(check => check.companyId === company.id).length}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/companies/${company.id}`)}
                    >
                      Zobraziť
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyList;
