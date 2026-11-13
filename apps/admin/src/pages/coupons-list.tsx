import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import uiLocale from "@/i18n";
import { usePermission } from "@/lib/access";
import { fetchApi } from "@/lib/api-client";
import type { Coupon, PaginatedResponse } from "@/types";

import { translateLabel,useUiText } from "../lib/ui-text";

const DISCOUNT_LABELS: Record<string, string> = {
  PERCENTAGE: "interface.percentage",
  FIXED: "interface.fixedAmount",
  FREE_PRODUCT: "interface.freeProduct",
  FREE_SHIPPING: "interface.freeShipping",
  EXTRA_POINTS: "interface.extraPoints",
  EXPERIENCE: "interface.experience",
};

export function CouponsListPage(): JSX.Element {
  const uiText = useUiText();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const pageSize = 20;
  const canWrite = usePermission("coupons.write");

  const modeLabels: Record<string, string> = {
    SHARED: "interface.shared",
    INDIVIDUAL: "interface.individual",
    LIMITED: "interface.limited",
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coupons", page, modeFilter],
    queryFn: () => {
      const mode = modeFilter !== "all" ? `&mode=${modeFilter}` : "";
      return fetchApi<PaginatedResponse<Coupon>>(
        `/admin/coupons?page=${String(page)}&pageSize=${String(pageSize)}${mode}`,
      );
    },
  });

  const handleDelete = async (id: string) => {
    await fetchApi(`/admin/coupons/${id}`, { method: "DELETE" });
    void queryClient.invalidateQueries({ queryKey: ["coupons"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("coupons.title")}</h1>
        {canWrite && (
          <Button
            onClick={() => {
              navigate("/coupons/generate");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("coupons.generateCoupon")}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{uiText("interface.allCoupons")}</CardTitle>
          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={uiText("interface.mode")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{uiText("interface.allModes")}</SelectItem>
              <SelectItem value="SHARED">{uiText("interface.shared")}</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="LIMITED">{uiText("interface.limited")}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-destructive">{uiText("interface.failedToLoadCoupons")}</p>
          ) : data.items.length === 0 ? (
            <p className="text-muted-foreground">{t("common.noResults")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{uiText("interface.code")}</TableHead>
                    <TableHead>{t("campaigns.type")}</TableHead>
                    <TableHead>{uiText("interface.mode")}</TableHead>
                    <TableHead>{uiText("interface.usage")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{uiText("interface.expires")}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {translateLabel(DISCOUNT_LABELS, c.discountType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {translateLabel(modeLabels, c.mode)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.usedCount}
                        {c.maxUses != null ? ` / ${String(c.maxUses)}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }
                        >
                          {c.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString(uiLocale.language)
                          : uiText("interface.never")}
                      </TableCell>
                      <TableCell>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              void handleDelete(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((p) => p - 1);
                    }}
                  >
                    {t("common.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {uiText("interface.page")} {page} {uiText("interface.of")} {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => {
                      setPage((p) => p + 1);
                    }}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
