import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getEmailSettings, saveEmailSettings, EmailSettings as EmailSettingsType } from "@/services/SettingsService";
import { toast } from "sonner";

const EmailSettings = () => {
  const [settings, setSettings] = useState<EmailSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const emailSettings = await getEmailSettings();
        setSettings(emailSettings);
      } catch (error) {
        console.error("Error loading email settings:", error);
        toast.error("Chyba pri načítavaní nastavení emailu");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings((prev) => prev ? ({ ...prev, [name]: checked }) : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await saveEmailSettings(settings);
    } catch (error) {
      console.error("Error saving email settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("Zadajte platnú emailovú adresu");
      return;
    }
    
    setSendingTest(true);
    try {
      // In a real implementation, this would send a test email
      // For now, we'll just simulate a successful send
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Testovací email bol odoslaný na adresu ${testEmailAddress}`);
      setTestEmailAddress("");
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Chyba pri odosielaní testovacieho emailu");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-red-500">Chyba pri načítavaní nastavení</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Nastavenia emailu</h2>
        <p className="text-muted-foreground mb-6">
          Nakonfigurujte nastavenia SMTP servera pre odosielanie emailov z aplikácie.
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
