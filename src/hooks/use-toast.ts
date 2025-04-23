
import { toast as sonnerToast } from "sonner";
import * as React from "react";
import type { ToastActionElement } from "@/components/ui/toast";

export function toast(props: { 
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
}) {
  return sonnerToast(props.title as string, {
    description: props.description,
    action: props.action
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] // Empty array as we're not tracking toasts in this implementation
  };
}
