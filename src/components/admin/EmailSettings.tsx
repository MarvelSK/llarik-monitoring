
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface EmailSettings {
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

const defaultSettings: EmailSettings = {
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_secure: true,
  sender_email: "",
  sender_name: "LLarik Monitoring",
  email_footer: "© LLarik Monitoring. Všetky práva vyhradené.",
  notifications_enabled: true,
};

const EmailSettings = () => {
  const [settings, setSettings] = useState<EmailSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    // The app_settings table is not available in TypeScript types.
    // Future code: use Supabase to load settings
    setLoading(true);
    // Simulate async fetch and sort of a warning
    setTimeout(() => {
      setSettings(defaultSettings);
      setLoading(false);
      console.warn(
        "EmailSettings: Cannot persist settings to Supabase (missing type for app_settings table). Using temporary in-memory state."
      );
    }, 700);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save, just like before
    setTimeout(() => {
      toast.success("Nastavenia emailu boli uložené (dočasne, nepersistované!)");
      setSaving(false);
    }, 1000);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Zadajte platnú emailovú adresu");
      return;
    }
    setSendingTest(true);
    setTimeout(() => {
      toast.success(`Testovací email bol odoslaný na adresu ${testEmailAddress} (neodoslané, len simulované)`);
      setTestEmailAddress("");
      setSendingTest(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Nastavenia emailu</h2>
        <p className="text-muted-foreground mb-6">
          Nakonfigurujte nastavenia SMTP servera pre odosielanie emailov z aplikácie.
          <br />
          <span className="text-xs text-amber-600">
            Upozornenie: Nastavenia nie sú natrvalo uložené, lebo tabuľka app_settings nemá typy v Supabase API.
          </span>
        </p>
      </div>

      <div className="grid gap-6">
        {/* SMTP Settings Card */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">SMTP Nastavenia</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    name="smtp_host"
                    placeholder="smtp.example.com"
                    value={settings.smtp_host}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    name="smtp_port"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP Používateľ</Label>
                  <Input
                    id="smtp_user"
                    name="smtp_user"
                    placeholder="user@example.com"
                    value={settings.smtp_user}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Heslo</Label>
                  <Input
                    id="smtp_password"
                    name="smtp_password"
                    type="password"
                    placeholder="••••••••••••"
                    value={settings.smtp_password}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp_secure"
                  checked={settings.smtp_secure}
                  onCheckedChange={(checked) => handleSwitchChange("smtp_secure", checked)}
                />
                <Label htmlFor="smtp_secure">Použiť zabezpečené pripojenie (SSL/TLS)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Nastavenia odosielateľa</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">Meno odosielateľa</Label>
                  <Input
                    id="sender_name"
                    name="sender_name"
                    placeholder="LLarik Monitoring"
                    value={settings.sender_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender_email">Email odosielateľa</Label>
                  <Input
                    id="sender_email"
                    name="sender_email"
                    placeholder="noreply@example.com"
                    value={settings.sender_email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_footer">Pätička emailu</Label>
                <Textarea
                  id="email_footer"
                  name="email_footer"
                  placeholder="© LLarik Monitoring. Všetky práva vyhradené."
                  value={settings.email_footer}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Nastavenia notifikácií</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="notifications_enabled"
                checked={settings.notifications_enabled}
                onCheckedChange={(checked) => handleSwitchChange("notifications_enabled", checked)}
              />
              <Label htmlFor="notifications_enabled">Povoliť emailové notifikácie</Label>
            </div>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Test emailu</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="test_email">Testovacia emailová adresa</Label>
                <Input
                  id="test_email"
                  placeholder="user@example.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSendTestEmail} 
                disabled={sendingTest || !testEmailAddress}
                className="w-full"
              >
                {sendingTest ? "Odosiela sa..." : "Odoslať test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Ukladá sa..." : "Uložiť nastavenia"}
        </Button>
      </div>
    </div>
  );
};

export default EmailSettings;
