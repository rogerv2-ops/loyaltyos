import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, RefreshCw, Search, Unlink } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatUiDate as format, useUiText } from "@/lib/ui-text";

interface CoalitionAccount {
  id: string;
  memberId: string;
  programId: string;
  provider: string;
  externalId: string;
  externalBalance: number;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export function CoalitionLinkedMembersPage(): JSX.Element {
  const uiText = useUiText();

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [unlinkTarget, setUnlinkTarget] = useState<CoalitionAccount | null>(null);
  const canWrite = usePermission("coalition.write");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["coalition-linked-accounts", search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetchApi<CoalitionAccount[]>(`/admin/coalition/links?${params.toString()}`);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (memberId: string) =>
      fetchApi(`/admin/coalition/link/${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coalition-linked-accounts"] });
      setUnlinkTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{uiText("interface.linkedCoalitionMembers")}</h1>
        <p className="mt-1 text-muted-foreground">
          {uiText("interface.manageMembersLinkedToExternalCoalitionAccounts")}
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="member-search">{uiText("interface.searchMembers")}</Label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                id="member-search"
                placeholder={uiText("interface.searchByMemberIdOrExternalRef")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-72"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : accounts && accounts.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText("interface.memberId")}</TableHead>
                <TableHead>{uiText("interface.externalRef")}</TableHead>
                <TableHead>{uiText("interface.provider")}</TableHead>
                <TableHead>{uiText("interface.externalBalance")}</TableHead>
                <TableHead>{uiText("interface.linkedAt")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-mono text-sm">{acc.memberId}</TableCell>
                  <TableCell className="font-mono text-sm">{acc.externalId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{acc.provider}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {acc.externalBalance.toLocaleString(uiLocale.language)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(acc.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUnlinkTarget(acc);
                        }}
                      >
                        <Unlink className="mr-1 h-3 w-3" />
                        {uiText("interface.unlink")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Link2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">
              {uiText("interface.noLinkedAccountsFound")}
            </p>
            <p className="text-sm text-muted-foreground">
              {uiText("interface.useTheApiToLinkMembersToExternalCoalitionAccounts")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            setPage(page - 1);
          }}
        >
          {uiText("common.previous")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {uiText("interface.page")} {page}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!accounts || accounts.length < 20}
          onClick={() => {
            setPage(page + 1);
          }}
        >
          {uiText("common.next")}
        </Button>
      </div>

      {/* Unlink Confirmation Dialog */}
      <Dialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiText("interface.unlinkCoalitionAccount")}</DialogTitle>
            <DialogDescription>
              {uiText("interface.thisWillRemoveTheLinkBetweenTheMemberAndTheirExternalCoalition")}
            </DialogDescription>
          </DialogHeader>
          {unlinkTarget && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{uiText("interface.member")}</span>{" "}
                <code className="rounded bg-muted px-1">{unlinkTarget.memberId}</code>
              </p>
              <p>
                <span className="font-medium">{uiText("interface.externalRef2")}</span>{" "}
                <code className="rounded bg-muted px-1">{unlinkTarget.externalId}</code>
              </p>
              <p>
                <span className="font-medium">{uiText("interface.provider2")}</span>{" "}
                {unlinkTarget.provider}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUnlinkTarget(null);
              }}
            >
              {uiText("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (unlinkTarget) unlinkMutation.mutate(unlinkTarget.memberId);
              }}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {uiText("interface.confirmUnlink")}
            </Button>
          </DialogFooter>
          {unlinkMutation.isError && (
            <p className="text-sm text-destructive">
              {unlinkMutation.error instanceof Error
                ? unlinkMutation.error.message
                : uiText("interface.unlinkFailed")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
