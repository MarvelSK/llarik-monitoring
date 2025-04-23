
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, CheckPing } from "@/types/check";
import { Edit, MoreVertical, Trash, Play, AlertCircle, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useState } from "react";

interface CheckActionsProps {
  check: Check;
  onPing: (status: CheckPing["status"]) => void;
  onDelete: () => Promise<void>;
}

const CheckActions = ({ check, onPing, onDelete }: CheckActionsProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    navigate(`/checks/${check.id}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error deleting check:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePing = (status: CheckPing["status"]) => {
    onPing(status);
  };

  const copyCheckUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/ping/${check.id}`);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button onClick={() => handlePing('success')} className="bg-healthy text-white hover:bg-opacity-90">
          <Play className="w-4 h-4 mr-2" />
          Pingnúť manuálne
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Upraviť
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePing('success')}>
              <Play className="w-4 h-4 mr-2" />
              Pingnúť úspech
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePing('failure')}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Pingnúť chybu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyCheckUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Kopírovať URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
              <Trash className="w-4 h-4 mr-2" />
              Odstrániť
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ste si istý?</AlertDialogTitle>
            <AlertDialogDescription>
              Týmto natrvalo odstránite kontrolu "{check.name}" a celú jej históriu pingov.
              Túto akciu nie je možné vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Odstraňuje sa..." : "Odstrániť"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CheckActions;
