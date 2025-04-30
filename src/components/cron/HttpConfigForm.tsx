
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpConfig } from "@/types/check";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

interface HttpConfigFormProps {
  disabled?: boolean;
}

const HttpConfigForm = ({ disabled = false }: HttpConfigFormProps) => {
  const form = useFormContext();
  const [showJsonBody, setShowJsonBody] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);

  // Default success codes
  const defaultSuccessCodes = [200, 201, 202, 203, 204];

  // Initialize HTTP config if not already set
  if (!form.getValues('httpConfig')) {
    form.setValue('httpConfig', {
      url: '',
      method: 'GET',
      successCodes: [200],
      params: {},
      headers: {},
      body: ''
    });
  }

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = 
    useFieldArray({
      control: form.control,
      name: "httpConfig.headers"
    });

  const { fields: paramFields, append: appendParam, remove: removeParam } = 
    useFieldArray({
      control: form.control,
      name: "httpConfig.params"
    });

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">HTTP Konfigurácia</h3>
          
          <FormField
            control={form.control}
            name="httpConfig.url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://api.example.com/endpoint" 
                    {...field} 
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="httpConfig.method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metóda</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || "GET"}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="GET" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="httpConfig.successCodes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Úspešné kódy odpovede</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="200,201,204" 
                      value={field.value?.join(',') || '200'} 
                      onChange={(e) => {
                        const codesStr = e.target.value;
                        const codes = codesStr.split(',')
                          .map(code => parseInt(code.trim()))
                          .filter(code => !isNaN(code));
                        field.onChange(codes.length > 0 ? codes : defaultSuccessCodes);
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-4"
              onClick={() => setShowHeaders(!showHeaders)}
              disabled={disabled}
            >
              {showHeaders ? "Skryť hlavičky" : "Zobraziť hlavičky"}
            </Button>
            
            {showHeaders && (
              <div className="space-y-4">
                {headerFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder="Názov hlavičky"
                        {...form.register(`httpConfig.headers.${index}.key`)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Hodnota hlavičky"
                        {...form.register(`httpConfig.headers.${index}.value`)}
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeHeader(index)}
                      disabled={disabled}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => appendHeader({ key: '', value: '' })}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Pridať hlavičku
                </Button>
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-4"
              onClick={() => setShowJsonBody(!showJsonBody)}
              disabled={disabled || form.getValues('httpConfig.method') === 'GET' || form.getValues('httpConfig.method') === 'HEAD'}
            >
              {showJsonBody ? "Skryť telo požiadavky" : "Zobraziť telo požiadavky"}
            </Button>
            
            {showJsonBody && form.getValues('httpConfig.method') !== 'GET' && form.getValues('httpConfig.method') !== 'HEAD' && (
              <FormField
                control={form.control}
                name="httpConfig.body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telo požiadavky (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"key": "value"}'
                        rows={5}
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HttpConfigForm;
