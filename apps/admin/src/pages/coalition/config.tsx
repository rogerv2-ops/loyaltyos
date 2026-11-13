import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  Key,
  Link2,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermission } from "@/lib/access";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { useUiText } from "../../lib/ui-text";

const PROVIDERS = [
  { value: "APPRECIO", label: "Apprecio" },
  { value: "GENERIC", label: "interface.generic" },
] as const;

const APPRECIO_COUNTRIES: { value: string; label: string; baseUrl: string }[] = [
  { value: "MX", label: "interface.mexico", baseUrl: "https://apiv2.dcanje.mx/api" },
  { value: "CL", label: "interface.chile", baseUrl: "https://api.apprecio.cl/api" },
  { value: "PE", label: "interface.peru", baseUrl: "https://api.apprecio.pe/api" },
  { value: "CO", label: "interface.colombia", baseUrl: "https://api.apprecio.co/api" },
  { value: "AR", label: "interface.argentina", baseUrl: "https://api.apprecio.com.ar/api" },
  { value: "CUSTOM", label: "interface.customUrl", baseUrl: "" },
];

const configFormSchema = z.object({
  provider: z.string().min(1),
  endpoint: z.string().min(1),
  publicToken: z.string().optional(),
  privateToken: z.string().optional(),
  identifierType: z.enum(["email", "rut"]).optional(),
  timeoutMs: z.coerce.number().int().positive().optional(),
  conversionRate: z.coerce.number().positive(),
  minConversionPoints: z.coerce.number().int().positive(),
  accumulationEnabled: z.boolean(),
  redemptionEnabled: z.boolean(),
  conversionEnabled: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configFormSchema>;

interface CoalitionConfig {
  id: string;
  programId: string;
  provider: string;
  endpoint: string;
  hasCredentials: boolean;
  conversionRate: number;
  accumulationEnabled: boolean;
  redemptionEnabled: boolean;
  conversionEnabled: boolean;
  minConversionPoints: number;
  createdAt: string;
  updatedAt: string;
}

interface AdapterCapabilities {
  accumulate: boolean;
  redeem: boolean;
  convert: boolean;
  reverseTransaction: boolean;
  historyQuery: boolean;
}

interface HealthcheckResult {
  ok: boolean;
  latencyMs?: number;
  details?: unknown;
}

export function CoalitionConfigPage(): JSX.Element {
  const uiText = useUiText();

  const queryClient = useQueryClient();
  const [showPrivateToken, setShowPrivateToken] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("MX");
  const [healthcheckResult, setHealthcheckResult] = useState<HealthcheckResult | null>(null);
  const canWrite = usePermission("coalition.write");

  const { data: config } = useQuery({
    queryKey: ["coalition-config"],
    queryFn: () => fetchApi<CoalitionConfig | null>("/admin/coalition/config"),
  });

  const { data: capabilities, isLoading: capsLoading } = useQuery({
    queryKey: ["coalition-capabilities"],
    queryFn: () => fetchApi<AdapterCapabilities>("/admin/coalition/capabilities"),
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      provider: "APPRECIO",
      endpoint: APPRECIO_COUNTRIES[0]?.baseUrl ?? "https://apiv2.dcanje.mx/api",
      publicToken: "",
      privateToken: "",
      identifierType: "email",
      timeoutMs: 10000,
      conversionRate: 1,
      minConversionPoints: 500,
      accumulationEnabled: false,
      redemptionEnabled: false,
      conversionEnabled: false,
    },
    values: config
      ? {
          provider: config.provider,
          endpoint: config.endpoint,
          conversionRate: config.conversionRate,
          accumulationEnabled: config.accumulationEnabled,
          redemptionEnabled: config.redemptionEnabled,
          conversionEnabled: config.conversionEnabled,
          minConversionPoints: config.minConversionPoints,
        }
      : undefined,
  });

  const provider = form.watch("provider");

  const saveMutation = useMutation({
    mutationFn: (values: ConfigFormValues) => {
      const credentials: Record<string, unknown> = {};
      if (values.provider === "APPRECIO") {
        credentials.publicToken = values.publicToken ?? "";
        credentials.privateToken = values.privateToken ?? "";
        credentials.identifierType = values.identifierType ?? "email";
        credentials.timeoutMs = values.timeoutMs ?? 10000;
      }
      return fetchApi<CoalitionConfig>("/admin/coalition/config", {
        method: "PUT",
        body: JSON.stringify({
          provider: values.provider,
          endpoint: values.endpoint,
          credentials,
          conversionRate: values.conversionRate,
          accumulationEnabled: values.accumulationEnabled,
          redemptionEnabled: values.redemptionEnabled,
          conversionEnabled: values.conversionEnabled,
          minConversionPoints: values.minConversionPoints,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coalition-config"] });
    },
  });

  const healthcheckMutation = useMutation({
    mutationFn: () =>
      fetchApi<HealthcheckResult>("/admin/coalition/healthcheck", { method: "POST" }),
    onSuccess: (data) => {
      setHealthcheckResult(data);
      void queryClient.invalidateQueries({ queryKey: ["coalition-capabilities"] });
    },
  });

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    const country = APPRECIO_COUNTRIES.find((c) => c.value === value);
    if (country?.baseUrl) {
      form.setValue("endpoint", country.baseUrl);
    }
  };

  function onSubmit(values: ConfigFormValues): void {
    saveMutation.mutate(values);
  }

  const CapabilityBadge = ({ label, supported }: { label: string; supported: boolean }) => (
    <Badge variant={supported ? "default" : "secondary"} className="gap-1">
      {supported ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {uiText(label)}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{uiText("interface.coalitionConfiguration")}</h1>
          <p className="mt-1 text-muted-foreground">
            {uiText("interface.configureExternalCoalitionProviderSettingsAndCredentials")}
          </p>
        </div>
        {config && (
          <Badge variant={config.hasCredentials ? "default" : "secondary"}>
            {config.hasCredentials
              ? uiText("interface.credentialsConfigured")
              : uiText("interface.noCredentialsSet")}
          </Badge>
        )}
      </div>

      {/* Capabilities Banner */}
      {capsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-24" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : capabilities ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {uiText("interface.adapterCapabilities")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <CapabilityBadge label="Accumulate" supported={capabilities.accumulate} />
              <CapabilityBadge label="Redeem" supported={capabilities.redeem} />
              <CapabilityBadge label="Convert" supported={capabilities.convert} />
              <CapabilityBadge label="Reverse" supported={capabilities.reverseTransaction} />
              <CapabilityBadge label="History" supported={capabilities.historyQuery} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {uiText("interface.saveAConfigurationFirstToSeeAdapterCapabilities")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.provider")}</CardTitle>
            <CardDescription>
              {uiText("interface.selectTheExternalCoalitionProviderToIntegrateWith")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">{uiText("interface.provider")}</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  form.setValue("provider", v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uiText("interface.selectAProvider")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {uiText(p.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Apprecio-Specific Configuration */}
        {provider === "APPRECIO" && (
          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.apprecioConnection")}</CardTitle>
              <CardDescription>
                {uiText("interface.configureTheApprecioApiConnectionDetails")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">{uiText("interface.country")}</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={uiText("interface.selectCountry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {APPRECIO_COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {uiText(c.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">{uiText("interface.apiBaseUrl")}</Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endpoint"
                    {...form.register("endpoint")}
                    placeholder="https://apiv2.dcanje.mx/api"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicToken">{uiText("interface.publicToken")}</Label>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="publicToken"
                    {...form.register("publicToken")}
                    placeholder={uiText("interface.enterPublicToken")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="privateToken">{uiText("interface.privateToken")}</Label>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div className="relative flex-1">
                    <Input
                      id="privateToken"
                      type={showPrivateToken ? "text" : "password"}
                      {...form.register("privateToken")}
                      placeholder={uiText("interface.enterPrivateToken")}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => {
                        setShowPrivateToken(!showPrivateToken);
                      }}
                    >
                      {showPrivateToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{uiText("interface.identifierType")}</Label>
                <RadioGroup
                  value={form.watch("identifierType") ?? "email"}
                  onValueChange={(v) => {
                    form.setValue("identifierType", v as "email" | "rut");
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="id-email" />
                    <Label htmlFor="id-email" className="cursor-pointer">
                      {uiText("common.email")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="rut" id="id-rut" />
                    <Label htmlFor="id-rut" className="cursor-pointer">
                      RUT
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeoutMs">{uiText("interface.timeoutMs")}</Label>
                <Input
                  id="timeoutMs"
                  type="number"
                  {...form.register("timeoutMs")}
                  placeholder="10000"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generic Provider Configuration */}
        {provider === "GENERIC" && (
          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.genericConnection")}</CardTitle>
              <CardDescription>
                {uiText("interface.configureTheGenericCoalitionApiEndpoint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">{uiText("interface.apiEndpointUrl")}</Label>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endpoint"
                    {...form.register("endpoint")}
                    placeholder="https://your-coalition-api.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversion Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.conversion")}</CardTitle>
            <CardDescription>
              {uiText("interface.configureHowOwnPointsConvertToCoalitionPoints")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="conversionRate">{uiText("interface.conversionRate")}</Label>
                <Input
                  id="conversionRate"
                  type="number"
                  step="0.01"
                  {...form.register("conversionRate")}
                />
                <p className="text-xs text-muted-foreground">
                  {uiText("interface.ownPointsRateCoalitionPoints")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minConversionPoints">{uiText("interface.minimumPoints")}</Label>
                <Input
                  id="minConversionPoints"
                  type="number"
                  {...form.register("minConversionPoints")}
                />
                <p className="text-xs text-muted-foreground">
                  {uiText("interface.minimumOwnPointsRequiredToConvert")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.features")}</CardTitle>
            <CardDescription>
              {uiText("interface.enableOrDisableCoalitionOperations")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="accumulationEnabled">{uiText("interface.accumulation")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {uiText("interface.allowMembersToEarnCoalitionPoints")}
                  </p>
                </div>
                <Switch
                  id="accumulationEnabled"
                  checked={form.watch("accumulationEnabled")}
                  onCheckedChange={(v) => {
                    form.setValue("accumulationEnabled", v);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="redemptionEnabled">{uiText("interface.redemption")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {uiText("interface.allowMembersToRedeemCoalitionPoints")}
                  </p>
                </div>
                {capabilities && !capabilities.redeem ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch id="redemptionEnabled" disabled checked={false} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{uiText("interface.thisAdapterDoesNotSupportRedemption")}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Switch
                    id="redemptionEnabled"
                    checked={form.watch("redemptionEnabled")}
                    onCheckedChange={(v) => {
                      form.setValue("redemptionEnabled", v);
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="conversionEnabled">{uiText("interface.conversion")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {uiText("interface.allowMembersToConvertOwnPointsToCoalitionPoints")}
                  </p>
                </div>
                <Switch
                  id="conversionEnabled"
                  checked={form.watch("conversionEnabled")}
                  onCheckedChange={(v) => {
                    form.setValue("conversionEnabled", v);
                  }}
                />
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {canWrite && (
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {uiText("interface.saveConfiguration")}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              healthcheckMutation.mutate();
            }}
            disabled={healthcheckMutation.isPending}
          >
            {healthcheckMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="mr-2 h-4 w-4" />
            )}
            {uiText("interface.testConnection")}
          </Button>
        </div>

        {/* Save Status */}
        {saveMutation.isSuccess && (
          <p className="text-sm text-green-600">
            {uiText("interface.configurationSavedSuccessfully")}
          </p>
        )}
        {saveMutation.isError && (
          <p className="text-sm text-destructive">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : uiText("interface.failedToSaveConfiguration")}
          </p>
        )}

        {/* Healthcheck Result */}
        {healthcheckResult && (
          <Card className={cn(healthcheckResult.ok ? "border-green-600" : "border-destructive")}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {uiText("interface.connectionTest")}
                {healthcheckResult.ok ? uiText("common.success") : uiText("interface.failed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {healthcheckResult.latencyMs != null && (
                  <p>
                    {uiText("interface.latency")}{" "}
                    <span className="font-mono">{healthcheckResult.latencyMs}ms</span>
                  </p>
                )}
                {healthcheckResult.details != null && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(healthcheckResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {healthcheckMutation.isError && (
          <p className="text-sm text-destructive">
            {healthcheckMutation.error instanceof Error
              ? healthcheckMutation.error.message
              : uiText("interface.healthcheckFailed")}
          </p>
        )}
      </form>
    </div>
  );
}
