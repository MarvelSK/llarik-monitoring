
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "@/types/check";
import StatusBadge from "../status/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CheckCardProps {
  check: Check;
  projectName?: string;
}

const CheckCard = ({ check, projectName }: CheckCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/checks/${check.id}`);
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg mb-1">{check.name}</CardTitle>
            <CardDescription>{check.description || "No description"}</CardDescription>
          </div>
          <StatusBadge status={check.status} withLabel />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            <span className="mr-2">Period: {check.period} min</span>
            <span>|</span>
            <span className="ml-2">Grace: {check.grace} min</span>
          </div>

          {check.lastPing && (
            <div className="text-sm">
              <p>
                Last ping: {" "}
                <span className="font-medium">
                  {formatDistanceToNow(check.lastPing, { addSuffix: true })}
                </span>
              </p>
            </div>
          )}

          {projectName && (
            <div className="text-sm">
              <p>
                Project: <span className="font-medium">{projectName}</span>
              </p>
            </div>
          )}

          {check.tags && check.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {check.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs flex items-center">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckCard;
