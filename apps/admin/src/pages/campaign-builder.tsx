import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Cake,
  Check,
  Gift,
  Heart,
  Repeat,
  Save,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import uiLocale from "@/i18n";
import { fetchApi } from "@/lib/api-client";
import { translateEnum, useUiText } from "@/lib/ui-text";
import { cn } from "@/lib/utils";
import type { CampaignEstimate, CampaignType, PaginatedResponse, Segment } from "@/types";

const CAMPAIGN_TYPES: {
  value: CampaignType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  {
    value: "BONUS_POINTS",
    label: "interface.bonusPoints",
    icon: Star,
    desc: "interface.awardExtraPointsOnQualifyingEvents",
  },
  {
    value: "SPEND_AND_GET",
    label: "interface.spendGet",
    icon: Gift,
    desc: "interface.bonusPointsProportionalToTransactionAmount",
  },
  {
    value: "FREQUENCY",
    label: "interface.frequency",
    icon: Repeat,
    desc: "interface.rewardMembersAfterNRepeatActions",
  },
  {
    value: "MILESTONE",
    label: "interface.milestone",
    icon: TrendingUp,
    desc: "interface.awardWhenHittingACumulativeTarget",
  },
  {
    value: "REFERRAL",
    label: "interface.referral",
    icon: Users,
    desc: "interface.rewardBothReferrerAndReferredMember",
  },
  {
    value: "BIRTHDAY",
    label: "interface.birthday",
    icon: Cake,
    desc: "interface.bonusPointsDuringTheMemberSBirthMonth",
  },
  {
    value: "ANNIVERSARY",
    label: "interface.anniversary",
    icon: Heart,
    desc: "interface.bonusOnTheMembershipAnniversaryDate",
  },
  {
    value: "FLASH_SALE",
    label: "interface.flashSale",
    icon: Zap,
    desc: "interface.limitedTimeMultiplierOnAllPurchases",
  },
  {
    value: "TIER_UPGRADE_BONUS",
    label: "interface.tierUpgrade",
    icon: TrendingUp,
    desc: "interface.oneTimeAwardWhenMemberReachesANewTier",
  },
];

const CHANNELS = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;

const wizardSchema = z.object({
  type: z.enum([
    "BONUS_POINTS",
    "SPEND_AND_GET",
    "FREQUENCY",
    "MILESTONE",
    "REFERRAL",
    "BIRTHDAY",
    "ANNIVERSARY",
    "FLASH_SALE",
    "TIER_UPGRADE_BONUS",
  ]),
  name: z.string().min(1, "interface.nameIsRequired"),
  description: z.string().optional(),
  segmentId: z.string().optional(),
  maxUsesPerMember: z.coerce.number().int().min(0).optional(),
  multiplier: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().int().min(0).optional(),
  isStackable: z.boolean().optional(),
  abTesting: z.boolean().optional(),
  channels: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

type WizardData = z.infer<typeof wizardSchema>;

const STEPS = [
  "interface.type",
  "interface.audience",
  "interface.rules",
  "interface.channels",
  "interface.dates",
  "interface.review",
];

export function CampaignBuilderPage(): JSX.Element {
  const uiText = useUiText();
  const { i18n } = useTranslation();

  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      type: "BONUS_POINTS",
      name: "",
      description: "",
      multiplier: 1,
      isStackable: false,
      abTesting: false,
      channels: [],
    },
  });

  const { data: segmentsData } = useQuery({
    queryKey: ["segments-list"],
    queryFn: () => fetchApi<PaginatedResponse<Segment>>("/admin/segments?pageSize=100"),
  });

  const [estimate, setEstimate] = useState<CampaignEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const selectedType = CAMPAIGN_TYPES.find((t) => t.value === form.watch("type"));

  const handleEstimate = async () => {
    setEstimating(true);
    try {
      const values = form.getValues();
      const payload: Record<string, unknown> = {
        multiplier: Number.isFinite(values.multiplier) ? values.multiplier! : 1,
      };
      if (Number.isFinite(values.maxBudget)) payload.maxBudget = values.maxBudget;

      const res = await fetchApi<CampaignEstimate>("/admin/campaigns/estimate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEstimate(res);
    } catch {
      setError(uiText("interface.failedToEstimateImpact"));
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      const values = form.getValues();
      const payload = {
        name: values.name,
        description: values.description,
        type: values.type,
        multiplier: Number.isFinite(values.multiplier) ? values.multiplier! : 1,
        maxBudget: Number.isFinite(values.maxBudget) ? values.maxBudget! : undefined,
        maxUsesPerMember: Number.isFinite(values.maxUsesPerMember)
          ? values.maxUsesPerMember!
          : undefined,
        isStackable: values.isStackable ?? false,
        abTesting: values.abTesting ?? false,
        channels: values.channels ?? [],
        startsAt: values.startsAt !== "" ? values.startsAt : undefined,
        endsAt: values.endsAt !== "" ? values.endsAt : undefined,
      };

      if (isEdit) {
        await fetchApi(`/admin/campaigns/${String(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/admin/campaigns", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : uiText("interface.failedToSaveCampaign"));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate("/campaigns");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {uiText("interface.back")}
        </Button>
        <h1 className="text-3xl font-bold">
          {isEdit ? uiText("interface.editCampaign") : uiText("interface.newCampaign")}
        </h1>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setStep(i);
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i < step ? <Check className="mr-1 inline h-3 w-3" /> : null}
            {uiText(label)}
          </button>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.campaignType")}</CardTitle>
            <CardDescription>
              {uiText("interface.chooseTheTypeOfCampaignYouWantToCreate")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.watch("type")}
              onValueChange={(v) => {
                form.setValue("type", v as CampaignType);
              }}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {CAMPAIGN_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Label
                      key={t.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent",
                        form.watch("type") === t.value && "border-primary bg-accent",
                      )}
                    >
                      <RadioGroupItem value={t.value} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4 text-primary" />
                          {uiText(t.label)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{uiText(t.desc)}</p>
                      </div>
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Audience */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.audience")}</CardTitle>
            <CardDescription>
              {uiText("interface.selectTheTargetSegmentAndPerMemberLimits")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{uiText("interface.targetSegment")}</Label>
              <Select
                value={form.watch("segmentId") ?? "all"}
                onValueChange={(v) => {
                  form.setValue("segmentId", v === "all" ? undefined : v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={uiText("interface.allMembers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{uiText("interface.allMembers2")}</SelectItem>
                  {segmentsData?.items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (
                      {s.type === "STATIC" ? s.memberIds.length : uiText("interface.dynamic2")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{uiText("interface.campaignName")}</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder={uiText("interface.eGWelcomeBonus")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {uiText(form.formState.errors.name.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">{uiText("common.description")}</Label>
              <Textarea
                id="desc"
                {...form.register("description")}
                placeholder={uiText("interface.describeWhatThisCampaignDoes")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">{uiText("interface.maxUsesPerMember")}</Label>
              <Input
                id="maxUses"
                type="number"
                {...form.register("maxUsesPerMember")}
                placeholder={uiText("interface.unlimited")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Rules */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.campaignRules")}</CardTitle>
            <CardDescription>
              {uiText("interface.configureThePointMultiplierBudgetAndStackingBehavior")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="multiplier">{uiText("interface.pointMultiplier")}</Label>
              <Input id="multiplier" type="number" step="0.1" {...form.register("multiplier")} />
              <p className="text-sm text-muted-foreground">
                {uiText("interface.earnedPointsAreMultipliedByThisValue1xNoChange")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">{uiText("interface.maxBudgetPoints")}</Label>
              <Input
                id="budget"
                type="number"
                {...form.register("maxBudget")}
                placeholder={uiText("interface.noLimit")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{uiText("interface.stackable")}</Label>
                <p className="text-sm text-muted-foreground">
                  {uiText("interface.allowThisCampaignToStackWithOthers")}
                </p>
              </div>
              <Switch
                checked={form.watch("isStackable")}
                onCheckedChange={(v) => {
                  form.setValue("isStackable", v);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{uiText("interface.aBTesting")}</Label>
                <p className="text-sm text-muted-foreground">
                  {uiText("interface.createVariantsToTestDifferentConfigurations")}
                </p>
              </div>
              <Switch
                checked={form.watch("abTesting")}
                onCheckedChange={(v) => {
                  form.setValue("abTesting", v);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Channels */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.channels")}</CardTitle>
            <CardDescription>
              {uiText("interface.selectWhichChannelsThisCampaignAppliesTo")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CHANNELS.map((ch) => (
                <div key={ch} className="flex items-center gap-3">
                  <Checkbox
                    id={`ch-${ch}`}
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
                  <Label htmlFor={`ch-${ch}`}>{translateEnum(ch)}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Dates */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{uiText("interface.schedule")}</CardTitle>
            <CardDescription>
              {uiText("interface.setOptionalStartAndEndDatesForTheCampaign")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">{uiText("interface.startDate")}</Label>
              <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">{uiText("interface.endDate")}</Label>
              <Input id="endsAt" type="datetime-local" {...form.register("endsAt")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Review */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.reviewCampaign")}</CardTitle>
              <CardDescription>
                {uiText("interface.verifyAllDetailsBeforeCreating")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.type")}</dt>
                  <dd className="font-medium">
                    {uiText(selectedType?.label ?? form.watch("type"))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("common.name")}</dt>
                  <dd className="font-medium">{form.watch("name") || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.multiplier")}</dt>
                  <dd className="font-medium">{form.watch("multiplier") ?? 1}x</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.budget")}</dt>
                  <dd className="font-medium">
                    {form.watch("maxBudget") != null
                      ? uiText("interface.amountPoints", {
                          amount: (form.watch("maxBudget") ?? 0).toLocaleString(i18n.language),
                        })
                      : uiText("interface.unlimited")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.stackable")}</dt>
                  <dd className="font-medium">
                    {form.watch("isStackable") ? uiText("interface.yes") : uiText("interface.no")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.aBTesting")}</dt>
                  <dd className="font-medium">
                    {form.watch("abTesting") ? uiText("interface.yes") : uiText("interface.no")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{uiText("interface.channels")}</dt>
                  <dd className="font-medium">
                    {(form.watch("channels") ?? []).length > 0
                      ? (form.watch("channels") ?? []).map(translateEnum).join(", ")
                      : uiText("interface.all")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Impact estimation */}
          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.estimatedImpact")}</CardTitle>
            </CardHeader>
            <CardContent>
              {estimating ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : estimate ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {estimate.estimatedMembers.toLocaleString(uiLocale.language)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {uiText("interface.eligibleMembers")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {estimate.estimatedPoints.toLocaleString(uiLocale.language)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {uiText("interface.projectedPoints")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">
                      {estimate.estimatedCost.toLocaleString(uiLocale.language)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {uiText("interface.estCostPts")}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleEstimate();
                  }}
                >
                  {uiText("interface.calculateEstimate")}
                </Button>
              )}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving
              ? uiText("interface.saving")
              : isEdit
                ? uiText("interface.updateCampaign")
                : uiText("interface.createCampaign")}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {uiText("interface.back")}
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={next}>
            {uiText("common.next")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
