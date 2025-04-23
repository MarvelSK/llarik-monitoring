
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload } from "lucide-react";

interface BrandingSettings {
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

const defaultSettings: BrandingSettings = {
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

const AppBranding = () => {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // In a real app, you'd fetch these from a settings table in your database
        // For this demo, we'll simulate a delay and use default values
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Simulate loading previews
        setLogoPreview("/placeholder.svg");
        setFaviconPreview("/favicon.ico");
        setLoginBgPreview(null);
      } catch (error) {
        console.error("Error fetching branding settings:", error);
        toast.error("Nepodarilo sa načítať nastavenia vzhľadu");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'app_logo' | 'app_favicon' | 'login_background') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you'd upload this file to storage
    // For this demo, we'll just create a preview
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      
      if (type === 'app_logo') {
        setLogoPreview(result);
        setSettings(prev => ({ ...prev, app_logo: result }));
      } else if (type === 'app_favicon') {
        setFaviconPreview(result);
        setSettings(prev => ({ ...prev, app_favicon: result }));
      } else if (type === 'login_background') {
        setLoginBgPreview(result);
        setSettings(prev => ({ ...prev, login_background: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In a real app, you'd save these to a settings table in your database
      // For this demo, we'll simulate a delay and show a success message
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast.success("Nastavenia vzhľadu boli uložené");
      
      // In a real app, you might want to reload the page or update the app's theme
      toast({
        title: "Upozornenie",
        description: "Zmeny vzhľadu sa prejavia po obnovení stránky",
      });
    } catch (error) {
      console.error("Error saving branding settings:", error);
      toast.error("Nepodarilo sa uložiť nastavenia vzhľadu");
    } finally {
      setSaving(false);
    }
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
        <h2 className="text-xl font-semibold mb-4">Vzhľad aplikácie</h2>
        <p className="text-muted-foreground mb-6">
          Prispôsobte vzhľad aplikácie podľa potrieb vašej spoločnosti.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">Všeobecné</TabsTrigger>
          <TabsTrigger value="colors">Farby</TabsTrigger>
          <TabsTrigger value="advanced">Pokročilé</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Základné nastavenia</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Názov aplikácie</Label>
                  <Input
                    id="app_name"
                    name="app_name"
                    value={settings.app_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Názov spoločnosti</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={settings.company_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer_text">Text v pätičke</Label>
                  <Input
                    id="footer_text"
                    name="footer_text"
                    value={settings.footer_text}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Logo a ikony</h3>
              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label htmlFor="app_logo">Logo aplikácie</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="w-16 h-16 border rounded flex items-center justify-center overflow-hidden bg-white">
                        <img src={logoPreview} alt="Logo náhľad" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          id="app_logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'app_logo')}
                          className="opacity-0 absolute inset-0 w-full cursor-pointer"
                        />
                        <Button variant="outline" className="w-full flex items-center gap-2" type="button">
                          <Upload className="w-4 h-4" />
                          <span>Nahrať logo</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Odporúčaný rozmer: 200x50 pixelov, formát PNG s priehľadnosťou
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="app_favicon">Favicon</Label>
                  <div className="flex items-center gap-4">
                    {faviconPreview && (
                      <div className="w-8 h-8 border rounded flex items-center justify-center overflow-hidden bg-white">
                        <img src={faviconPreview} alt="Favicon náhľad" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          id="app_favicon"
                          type="file"
                          accept="image/x-icon,image/png"
                          onChange={(e) => handleFileChange(e, 'app_favicon')}
                          className="opacity-0 absolute inset-0 w-full cursor-pointer"
                        />
                        <Button variant="outline" className="w-full flex items-center gap-2" type="button">
                          <Upload className="w-4 h-4" />
                          <span>Nahrať favicon</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Odporúčaný rozmer: 32x32 pixelov, formát ICO alebo PNG
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="login_background">Obrázok na prihlasovacej stránke</Label>
                  <div className="flex items-center gap-4">
                    {loginBgPreview && (
                      <div className="w-24 h-16 border rounded flex items-center justify-center overflow-hidden bg-gray-100">
                        <img src={loginBgPreview} alt="Login background náhľad" className="max-w-full max-h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          id="login_background"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'login_background')}
                          className="opacity-0 absolute inset-0 w-full cursor-pointer"
                        />
                        <Button variant="outline" className="w-full flex items-center gap-2" type="button">
                          <Upload className="w-4 h-4" />
                          <span>Nahrať obrázok</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Odporúčaný rozmer: 1920x1080 pixelov
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Farebná schéma</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="primary_color">Primárna farba</Label>
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: settings.primary_color }}
                      title={settings.primary_color}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="primary_color"
                      name="primary_color"
                      type="text"
                      value={settings.primary_color}
                      onChange={handleChange}
                    />
                    <Input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 p-1"
                      aria-label="Výber primárnej farby"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secondary_color">Sekundárna farba</Label>
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: settings.secondary_color }}
                      title={settings.secondary_color}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="secondary_color"
                      name="secondary_color"
                      type="text"
                      value={settings.secondary_color}
                      onChange={handleChange}
                    />
                    <Input
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-10 h-10 p-1"
                      aria-label="Výber sekundárnej farby"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="accent_color">Zvýraznenie</Label>
                    <div 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: settings.accent_color }}
                      title={settings.accent_color}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accent_color"
                      name="accent_color"
                      type="text"
                      value={settings.accent_color}
                      onChange={handleChange}
                    />
                    <Input
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-10 h-10 p-1"
                      aria-label="Výber farby zvýraznenia"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                <h4 className="text-sm font-medium mb-2">Náhľad farieb</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded shadow-sm" 
                      style={{ backgroundColor: settings.primary_color }}
                    ></div>
                    <span className="text-xs mt-1">Primárna</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded shadow-sm" 
                      style={{ backgroundColor: settings.secondary_color }}
                    ></div>
                    <span className="text-xs mt-1">Sekundárna</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded shadow-sm" 
                      style={{ backgroundColor: settings.accent_color }}
                    ></div>
                    <span className="text-xs mt-1">Zvýraznenie</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Vlastný CSS</h3>
              <div className="space-y-2">
                <Label htmlFor="custom_css">Vlastné CSS pravidlá</Label>
                <textarea
                  id="custom_css"
                  name="custom_css"
                  value={settings.custom_css}
                  onChange={handleChange}
                  rows={10}
                  className="w-full resize-y min-h-[200px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                  placeholder=":root { --custom-color: #ff0000; }"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vložte vlastné CSS pravidlá, ktoré budú aplikované na celú aplikáciu. Buďte opatrní, nesprávne CSS môže spôsobiť problémy so zobrazením.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Ukladá sa..." : "Uložiť nastavenia vzhľadu"}
        </Button>
      </div>
    </div>
  );
};

export default AppBranding;
