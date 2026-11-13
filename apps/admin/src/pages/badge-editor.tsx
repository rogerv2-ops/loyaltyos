import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { fetchApi } from "@/lib/api-client";
import { translateEnum, useUiText } from "@/lib/ui-text";

const badgeSchema = z.object({
  name: z.string().min(1, "interface.nameIsRequired"),
  description: z.string().optional(),
  type: z.enum(["ACHIEVEMENT", "STATUS", "TEMPORAL", "COLLECTIBLE", "SOCIAL"]),
  imageUrl: z.string().optional(),
  conditions: z.string().optional(),
  seriesId: z.string().optional(),
  seriesPosition: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

interface BadgeDetail {
  id: string;
  name: string;
  description?: string;
  type: string;
  imageUrl?: string;
  tierId?: string;
  conditions?: unknown;
  seriesId?: string;
  seriesPosition?: number;
  isActive: boolean;
}

const BADGE_TYPES = [
  {
    value: "ACHIEVEMENT",
    label: "interface.achievement",
    desc: "interface.unlockedByMeetingSpecificCriteria",
  },
  { value: "STATUS", label: "common.status", desc: "interface.reflectsAMemberSCurrentStatus" },
  { value: "TEMPORAL", label: "interface.temporal", desc: "interface.availableForALimitedTime" },
  {
    value: "COLLECTIBLE",
    label: "interface.collectible",
    desc: "interface.partOfACollectibleSeries",
  },
  {
    value: "SOCIAL",
    label: "interface.social",
    desc: "interface.earnedThroughSocialOrCommunityActions",
  },
];

export function BadgeEditorPage(): JSX.Element {
  const uiText = useUiText();

  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: badge, isLoading } = useQuery({
    queryKey: ["badge", id],
    queryFn: () => fetchApi<BadgeDetail>(`/admin/badges/${id ?? ""}`),
    enabled: isEditing,
  });

  const form = useForm<BadgeFormData>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "ACHIEVEMENT",
      imageUrl: "",
      conditions: "{}",
      seriesId: "",
      isActive: true,
    },
  });

  // Load existing badge data into form
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (badge && badge.id !== loadedId) {
    setLoadedId(badge.id);
    form.reset({
      name: badge.name,
      description: badge.description ?? "",
      type: badge.type as BadgeFormData["type"],
      imageUrl: badge.imageUrl ?? "",
      conditions: badge.conditions ? JSON.stringify(badge.conditions, null, 2) : "{}",
      seriesId: badge.seriesId ?? "",
      seriesPosition: badge.seriesPosition ?? undefined,
      isActive: badge.isActive,
    });
  }

  const onSubmit = async (data: BadgeFormData) => {
    let conditions: unknown = {};
    try {
      conditions = JSON.parse(data.conditions ?? "{}");
    } catch {
      // Keep as string
    }

    const payload = {
      ...data,
      conditions,
      conditionsStr: undefined,
    };

    if (isEditing) {
      await fetchApi(`/admin/badges/${id ?? ""}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await fetchApi("/admin/badges", {
        method: "POST",
        body: JSON.stringify({ ...payload, isActive: undefined }),
      });
    }
    void queryClient.invalidateQueries({ queryKey: ["badges"] });
    navigate("/badges");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigate("/badges");
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? uiText("interface.editBadge") : uiText("interface.newBadge")}
        </h1>
      </div>

      {isEditing && isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.badgeDetails")}</CardTitle>
              <CardDescription>
                {uiText("interface.configureTheBadgeNameTypeAndAppearance")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{uiText("interface.name2")}</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder={uiText("interface.eGFirstPurchase")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {uiText(form.formState.errors.name.message)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">{uiText("interface.type2")}</Label>
                  <Select
                    value={translateEnum(form.watch("type"))}
                    onValueChange={(v) => {
                      form.setValue("type", v as BadgeFormData["type"]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BADGE_TYPES.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {uiText(bt.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{uiText("common.description")}</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder={uiText("interface.briefDescriptionOfThisBadge")}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">{uiText("interface.imageUrl")}</Label>
                  <Input id="imageUrl" {...form.register("imageUrl")} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seriesId">{uiText("interface.seriesId")}</Label>
                  <Input
                    id="seriesId"
                    {...form.register("seriesId")}
                    placeholder={uiText("interface.eGMegaSaver")}
                  />
                </div>
              </div>
              {form.watch("seriesId") && (
                <div className="space-y-2">
                  <Label htmlFor="seriesPosition">{uiText("interface.seriesPosition")}</Label>
                  <Input
                    id="seriesPosition"
                    type="number"
                    {...form.register("seriesPosition")}
                    placeholder="1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.conditions")}</CardTitle>
              <CardDescription>
                {uiText("interface.defineRulesForWhenThisBadgeIsAwardedUsesTheSameRule")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conditions">{uiText("interface.rulesJson")}</Label>
                <Textarea
                  id="conditions"
                  {...form.register("conditions")}
                  placeholder='{"all":[{"field":"totalSpent","gte":10000}]}'
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch("isActive")}
                    onCheckedChange={(v) => {
                      form.setValue("isActive", v);
                    }}
                  />
                  <Label>{uiText("common.active")}</Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{uiText("interface.preview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 rounded-lg border p-6">
                {form.watch("imageUrl") ? (
                  <img
                    src={form.watch("imageUrl")}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <Award className="h-16 w-16 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-semibold">
                    {form.watch("name") || uiText("interface.badgeName")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {form.watch("description") ?? uiText("interface.noDescription")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uiText("interface.type3")} {translateEnum(form.watch("type"))}
                    {form.watch("seriesId") &&
                      uiText("interface.seriesDetails", {
                        id: String(form.watch("seriesId")),
                        position: String(form.watch("seriesPosition") ?? "-"),
                      })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? uiText("interface.updateBadge") : uiText("interface.createBadge")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigate("/badges");
              }}
            >
              {uiText("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
