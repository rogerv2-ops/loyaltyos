import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Copy, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchApi } from "@/lib/api-client";
import { translateEnum, useUiText } from "@/lib/ui-text";
import type { CouponDiscountType } from "@/types";

const CHANNELS = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;

const DISCOUNT_TYPES: { value: CouponDiscountType; label: string }[] = [
  { value: "PERCENTAGE", label: "interface.percentage" },
  { value: "FIXED", label: "interface.fixedAmount" },
  { value: "FREE_PRODUCT", label: "interface.freeProduct" },
  { value: "FREE_SHIPPING", label: "interface.freeShipping" },
  { value: "EXTRA_POINTS", label: "interface.extraPoints" },
  { value: "EXPERIENCE", label: "interface.experience" },
];

const schema = z.object({
  prefix: z.string().max(10).optional(),
  count: z.coerce.number().int().min(1).max(10000),
  length: z.coerce.number().int().min(6).max(20).optional(),
  discountType: z.enum([
    "PERCENTAGE",
    "FIXED",
    "FREE_PRODUCT",
    "FREE_SHIPPING",
    "EXTRA_POINTS",
    "EXPERIENCE",
  ]),
  discountValue: z.coerce.number().min(0).optional(),
  minPurchase: z.coerce.number().int().min(0).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  maxUsesPerMember: z.coerce.number().int().min(1).optional(),
  isStackable: z.boolean().optional(),
  channels: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CouponBulkGeneratePage(): JSX.Element {
  const uiText = useUiText();

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prefix: "",
      count: 100,
      length: 8,
      discountType: "PERCENTAGE",
      isStackable: false,
      channels: [],
    },
  });

  const handleGenerate = async (values: FormData) => {
    setSaving(true);
    setError(null);
    try {
      const codes = await fetchApi<string[]>("/admin/coupons/generate", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          channels: values.channels ?? [],
          startsAt: values.startsAt !== "" ? values.startsAt : undefined,
          expiresAt: values.expiresAt !== "" ? values.expiresAt : undefined,
          discountValue: Number.isFinite(values.discountValue) ? values.discountValue : undefined,
          minPurchase: Number.isFinite(values.minPurchase) ? values.minPurchase : undefined,
          maxUses: Number.isFinite(values.maxUses) ? values.maxUses : undefined,
          maxUsesPerMember: Number.isFinite(values.maxUsesPerMember)
            ? values.maxUsesPerMember
            : undefined,
        }),
      });
      setResults(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : uiText("interface.failedToGenerateCoupons"));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAll = async () => {
    if (!results) return;
    await navigator.clipboard.writeText(results.join("\n"));
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate("/coupons");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {uiText("interface.back")}
        </Button>
        <h1 className="text-3xl font-bold">{uiText("interface.bulkGenerateCoupons")}</h1>
      </div>

      <form
        onSubmit={(e) => {
          void form.handleSubmit(handleGenerate)(e);
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.generationSettings")}</CardTitle>
            <CardDescription>
              {uiText("interface.configureHowManyCodesToGenerateAndTheirFormat")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="prefix">{uiText("interface.codePrefix")}</Label>
              <Input
                id="prefix"
                {...form.register("prefix")}
                placeholder={uiText("interface.eGSummer")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">{uiText("interface.numberOfCodes")}</Label>
              <Input id="count" type="number" {...form.register("count")} />
              {form.formState.errors.count && (
                <p className="text-sm text-destructive">
                  {uiText(form.formState.errors.count.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="length">{uiText("interface.codeLength")}</Label>
              <Input id="length" type="number" {...form.register("length")} placeholder="8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.discountConfiguration")}</CardTitle>
            <CardDescription>
              {uiText("interface.setTheDiscountTypeValueAndUsageLimits")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{uiText("interface.discountType")}</Label>
              <Select
                value={form.watch("discountType")}
                onValueChange={(v) => {
                  form.setValue("discountType", v as CouponDiscountType);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {uiText(dt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">{uiText("interface.discountValue")}</Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                {...form.register("discountValue")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minPurchase">{uiText("interface.minimumPurchasePoints")}</Label>
              <Input
                id="minPurchase"
                type="number"
                {...form.register("minPurchase")}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">{uiText("interface.maxUsesPerCoupon")}</Label>
              <Input
                id="maxUses"
                type="number"
                {...form.register("maxUses")}
                placeholder={uiText("interface.unlimited")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUsesPerMember">{uiText("interface.maxUsesPerMember")}</Label>
              <Input
                id="maxUsesPerMember"
                type="number"
                {...form.register("maxUsesPerMember")}
                placeholder="1"
              />
            </div>
            <div className="flex items-center justify-between self-end">
              <Label>{uiText("interface.stackableWithPoints")}</Label>
              <input
                type="checkbox"
                checked={form.watch("isStackable")}
                onChange={(e) => {
                  form.setValue("isStackable", e.target.checked);
                }}
                className="h-4 w-4"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.channelsSchedule")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{uiText("interface.validChannels")}</Label>
              <div className="flex flex-wrap gap-4">
                {CHANNELS.map((ch) => (
                  <div key={ch} className="flex items-center gap-2">
                    <Checkbox
                      id={`gen-ch-${ch}`}
                      checked={(form.watch("channels") ?? []).includes(ch)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("channels") ?? [];
                        if (checked) {
                          form.setValue("channels", [...current, ch]);
                        } else {
                          form.setValue(
                            "channels",
                            current.filter((c) => c !== ch),
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`gen-ch-${ch}`}>{translateEnum(ch)}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">{uiText("interface.startDate")}</Label>
                <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">{uiText("interface.expiryDate")}</Label>
                <Input id="expiresAt" type="datetime-local" {...form.register("expiresAt")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? uiText("interface.generating") : uiText("interface.generateCoupons")}
        </Button>
      </form>

      {results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {uiText("interface.generatedCodes")}
              {results.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleCopyAll();
              }}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> {uiText("interface.copied")}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> {uiText("interface.copyAll")}
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted p-4">
              <div className="grid grid-cols-2 gap-1 font-mono text-sm md:grid-cols-3 lg:grid-cols-4">
                {results.map((code, i) => (
                  <span key={i} className="rounded px-1 py-0.5 hover:bg-accent">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
