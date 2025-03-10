
import React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CheckboxGroup = ({ children, className, ...props }: CheckboxGroupProps) => {
  return <div className={cn("space-y-2", className)} {...props}>{children}</div>;
};

export interface CheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const CheckboxItem = ({ 
  children, 
  checked, 
  onCheckedChange, 
  className, 
  ...props 
}: CheckboxItemProps) => {
  return (
    <div className={cn("flex items-center space-x-2", className)} {...props}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onCheckedChange?.(e.target.checked)} 
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span>{children}</span>
    </div>
  );
};
