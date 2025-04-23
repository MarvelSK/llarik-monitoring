
// Re-export sonner toast for compatibility
import { toast as sonnerToast } from "sonner";
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// This exports sonner toast functionality through the legacy interface
// to maintain compatibility with existing code
export function toast(props: { 
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
}) {
  return sonnerToast(props.title as string, {
    description: props.description,
    action: props.action,
    // Map variant to sonner variant if needed
    variant: props.variant === "destructive" ? "destructive" : "default"
  });
}

// Maintain the legacy interface structure but use sonner under the hood
export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] // Empty array as we're not tracking toasts in this implementation
  };
}
