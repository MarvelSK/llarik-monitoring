
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, CheckPing } from "@/types/check";
import { Edit, MoreVertical, Trash, Play, AlertCircle, BarChart, Copy } from "lucide-react";
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
import { toast } from "sonner";

interface CheckActionsProps {
  check: Check;
  onPing: (status: CheckPing["status"]) => void;
  onDelete: () => void;
}

const CheckActions = ({ check, onPing, onDelete }: CheckActionsProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleEdit = () => {
    navigate(`/checks/${check.id}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
    navigate("/");
    toast.success("Check deleted successfully");
  };

  const handlePing = (status: CheckPing["status"]) => {
    onPing(status);
    toast.success(`Sent a "${status}" ping`);
  };

  const copyCheckUrl = () => {
    // In a real app, this would be a unique URL for the check
    navigator.clipboard.writeText(`https://healthbeat.app/ping/${check.id}`);
    toast.success("Ping URL copied to clipboard");
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button onClick={() => handlePing('success')} className="bg-healthy text-white hover:bg-opacity-90">
          <Play className="w-4 h-4 mr-2" />
          Ping Now
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
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePing('success')}>
              <Play className="w-4 h-4 mr-2" />
              Ping Success
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePing('failure')}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Ping Failure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyCheckUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Ping URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{check.name}" check and all its ping history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CheckActions;
