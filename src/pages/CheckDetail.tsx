
import CheckActions from "@/components/checks/CheckActions";
import CheckSummary from "@/components/checks/CheckSummary";
import PingsList from "@/components/checks/PingsList";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { CheckPing } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CheckDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCheck, pingCheck, deleteCheck } = useChecks();

  const check = getCheck(id!);

  if (!check) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Check not found</h2>
          <p className="text-gray-500 mb-6">The check you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const handlePing = (status: CheckPing["status"]) => {
    pingCheck(check.id, status);
  };

  const handleDelete = () => {
    deleteCheck(check.id);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">{check.name}</h1>
          </div>
          
          <CheckActions 
            check={check} 
            onPing={handlePing} 
            onDelete={handleDelete} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <CheckSummary check={check} />
          </div>
          
          <div className="md:col-span-2">
            <PingsList pings={check.pings} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckDetail;
