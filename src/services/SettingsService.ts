
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for settings
export interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  sender_email: string;
  sender_name: string;
  email_footer: string;
  notifications_enabled: boolean;
}

export interface BrandingSettings {
  app_name: string;
  app_logo: string | null;
  app_favicon: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string;
  company_name: string;
  footer_text: string;
  login_background: string | null;
}

export const defaultEmailSettings: EmailSettings = {
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_secure: true,
  sender_email: "",
  sender_name: "LLarik Monitoring",
  email_footer: "© 2025 LLarik Monitoring. Všetky práva vyhradené.",
  notifications_enabled: true,
};

export const defaultBrandingSettings: BrandingSettings = {
  app_name: "LLarik Monitoring",
  app_logo: null,
  app_favicon: null,
  primary_color: "#0f172a",
  secondary_color: "#64748b",
  accent_color: "#3b82f6",
  custom_css: "",
  company_name: "LLarik",
  footer_text: "© 2025 LLarik Monitoring. Všetky práva vyhradené.",
  login_background: null,
};

// Get email settings from Supabase
export const getEmailSettings = async (): Promise<EmailSettings> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_settings")
      .single();

    if (error) {
      console.error("Error fetching email settings:", error);
      return defaultEmailSettings;
    }

    return (data?.value as unknown as EmailSettings) || defaultEmailSettings;
  } catch (error) {
    console.error("Error in getEmailSettings:", error);
    return defaultEmailSettings;
  }
};

// Save email settings to Supabase
export const saveEmailSettings = async (settings: EmailSettings): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user.id;

    const { data, error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "email_settings",
          value: settings as unknown as any,
          updated_at: new Date().toISOString(),
          updated_by: userId
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Error saving email settings:", error);
      toast.error("Nepodarilo sa uložiť nastavenia emailu");
      return false;
    }

    toast.success("Nastavenia emailu boli úspešne uložené");
    return true;
  } catch (error) {
    console.error("Error in saveEmailSettings:", error);
    toast.error("Nepodarilo sa uložiť nastavenia emailu");
    return false;
  }
};

// Get branding settings from Supabase
export const getBrandingSettings = async (): Promise<BrandingSettings> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "branding_settings")
      .single();

    if (error) {
      console.error("Error fetching branding settings:", error);
      return defaultBrandingSettings;
    }

    return (data?.value as unknown as BrandingSettings) || defaultBrandingSettings;
  } catch (error) {
    console.error("Error in getBrandingSettings:", error);
    return defaultBrandingSettings;
  }
};

// Save branding settings to Supabase
export const saveBrandingSettings = async (settings: BrandingSettings): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user.id;

    const { data, error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "branding_settings",
          value: settings as unknown as any,
          updated_at: new Date().toISOString(),
          updated_by: userId
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Error saving branding settings:", error);
      toast.error("Nepodarilo sa uložiť nastavenia vzhľadu");
      return false;
    }

    toast.success("Nastavenia vzhľadu boli úspešne uložené");
    return true;
  } catch (error) {
    console.error("Error in saveBrandingSettings:", error);
    toast.error("Nepodarilo sa uložiť nastavenia vzhľadu");
    return false;
  }
};
