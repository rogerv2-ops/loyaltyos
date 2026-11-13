import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, RefreshCw, Search, Undo2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { fetchApi } from "@/lib/api-client";
import { formatUiDate as format, translateEnum, useUiText } from "@/lib/ui-text";

interface CoalitionTransaction {
  id: string;
  accountId: string;
  type: "EARN" | "REDEEM";
  amount: number;
  localTxRef: string;
  externalTxRef: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED" | "REVERSED";
  idempotencyKey: string;
  attempts: number;
  lastError: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  FAILED: "destructive",
  REVERSED: "outline",
};

export function CoalitionTransactionsPage(): JSX.Element {
  const uiText = useUiText();

  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [memberIdFilter, setMemberIdFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<CoalitionTransaction | null>(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["coalition-transactions", statusFilter, memberIdFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (memberIdFilter) params.set("memberId", memberIdFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetchApi<CoalitionTransaction[]>(`/admin/coalition/transactions?${params.toString()}`);
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (input: { txRef: string; reason: string }) =>
      fetchApi("/coalition/reverse", {
        method: "POST",
        headers: { "idempotency-key": `admin-reverse-${input.txRef}-${String(Date.now())}` },
        body: JSON.stringify({ txRef: input.txRef, reason: input.reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coalition-transactions"] });
      setReverseDialogOpen(false);
      setReverseReason("");
    },
  });

  const statusBadge = (status: string) => (
    <Badge variant={STATUS_VARIANTS[status] ?? "secondary"}>{translateEnum(status)}</Badge>
  );

  const handleReverse = (): void => {
    if (!selectedTx || !reverseReason) return;
    reverseMutation.mutate({ txRef: selectedTx.localTxRef, reason: reverseReason });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{uiText("interface.coalitionTransactions")}</h1>
        <p className="mt-1 text-muted-foreground">
          {uiText("interface.viewAndManageExternalCoalitionTransactions")}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="status-filter">{uiText("common.status")}</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="status-filter" className="w-36">
                <SelectValue placeholder={uiText("interface.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{uiText("interface.all")}</SelectItem>
                <SelectItem value="PENDING">{uiText("interface.pending")}</SelectItem>
                <SelectItem value="CONFIRMED">{uiText("interface.confirmed")}</SelectItem>
                <SelectItem value="FAILED">{uiText("interface.failed")}</SelectItem>
                <SelectItem value="REVERSED">{uiText("interface.reversed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-filter">{uiText("interface.memberId")}</Label>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                id="member-filter"
                placeholder={uiText("interface.filterByMember")}
                value={memberIdFilter}
                onChange={(e) => {
                  setMemberIdFilter(e.target.value);
                  setPage(1);
                }}
                className="w-48"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setMemberIdFilter("");
              setPage(1);
            }}
          >
            {uiText("interface.clearFilters")}
          </Button>
        </CardContent>
      </Card>

      {/* Transactions Table */}
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
      ) : transactions && transactions.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiText("common.status")}</TableHead>
                <TableHead>{uiText("interface.type")}</TableHead>
                <TableHead>{uiText("interface.amount")}</TableHead>
                <TableHead>{uiText("interface.localRef")}</TableHead>
                <TableHead>{uiText("interface.externalRef")}</TableHead>
                <TableHead>{uiText("interface.attempts")}</TableHead>
                <TableHead>{uiText("common.date")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedTx(tx);
                  }}
                >
                  <TableCell>{statusBadge(tx.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{translateEnum(tx.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {tx.amount.toLocaleString(uiLocale.language)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{tx.localTxRef}</TableCell>
                  <TableCell className="font-mono text-xs">{tx.externalTxRef ?? "—"}</TableCell>
                  <TableCell>{tx.attempts}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    {(tx.status === "PENDING" || tx.status === "FAILED") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                          setReverseDialogOpen(true);
                        }}
                      >
                        <Undo2 className="mr-1 h-3 w-3" />
                        {uiText("interface.reverse")}
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
            <p className="text-muted-foreground">{uiText("interface.noTransactionsFound")}</p>
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
          disabled={!transactions || transactions.length < 20}
          onClick={() => {
            setPage(page + 1);
          }}
        >
          {uiText("common.next")}
        </Button>
      </div>

      {/* Transaction Detail Panel */}
      {selectedTx && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uiText("interface.transactionDetail")}
              {statusBadge(selectedTx.status)}
            </CardTitle>
            <CardDescription>{selectedTx.localTxRef}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">ID</Label>
                <p className="font-mono text-sm">{selectedTx.id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{uiText("interface.type")}</Label>
                <p>{translateEnum(selectedTx.type)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.amount")}
                </Label>
                <p className="font-mono">{selectedTx.amount.toLocaleString(uiLocale.language)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.attempts")}
                </Label>
                <p>{selectedTx.attempts}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.externalTxRef")}
                </Label>
                <p className="font-mono text-sm">{selectedTx.externalTxRef ?? "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.idempotencyKey")}
                </Label>
                <p className="font-mono text-sm">{selectedTx.idempotencyKey}</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.createdAt")}
                </Label>
                <p className="text-sm">{format(new Date(selectedTx.createdAt), "PPpp")}</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  {uiText("interface.updatedAt")}
                </Label>
                <p className="text-sm">{format(new Date(selectedTx.updatedAt), "PPpp")}</p>
              </div>
              {selectedTx.lastError && (
                <div className="sm:col-span-2">
                  <Label className="text-xs text-destructive">
                    {uiText("interface.lastError")}
                  </Label>
                  <p className="text-sm text-destructive">{selectedTx.lastError}</p>
                </div>
              )}
              {selectedTx.metadata != null && (
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    {uiText("interface.metadata")}
                  </Label>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(selectedTx.metadata as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <Label className="text-xs text-muted-foreground">
                {uiText("interface.timeline")}
              </Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">{uiText("interface.pending2")}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedTx.createdAt), "PPpp")}
                    </p>
                  </div>
                </div>

                {selectedTx.status === "CONFIRMED" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium">{uiText("interface.confirmed2")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedTx.updatedAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTx.status === "FAILED" && selectedTx.lastError && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{uiText("interface.failed2")}</p>
                      <p className="text-xs text-muted-foreground">{selectedTx.lastError}</p>
                    </div>
                  </div>
                )}

                {selectedTx.status === "REVERSED" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                      <ArrowLeftRight className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{uiText("interface.reversed2")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedTx.updatedAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reverse Action */}
            {(selectedTx.status === "PENDING" || selectedTx.status === "FAILED") && (
              <div className="mt-6">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setReverseDialogOpen(true);
                  }}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {uiText("interface.forceReverse")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reverse Confirmation Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiText("interface.reverseTransaction")}</DialogTitle>
            <DialogDescription>
              {uiText(
                "interface.thisWillAttemptToReverseTheExternalCoalitionTransactionThisActionCannot",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reverse-reason">{uiText("interface.reason")}</Label>
              <Input
                id="reverse-reason"
                value={reverseReason}
                onChange={(e) => {
                  setReverseReason(e.target.value);
                }}
                placeholder={uiText("interface.eGCustomerRefundSystemError")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReverseDialogOpen(false);
              }}
            >
              {uiText("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={!reverseReason || reverseMutation.isPending}
            >
              {reverseMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {uiText("interface.confirmReverse")}
            </Button>
          </DialogFooter>
          {reverseMutation.isError && (
            <p className="text-sm text-destructive">
              {reverseMutation.error instanceof Error
                ? reverseMutation.error.message
                : uiText("interface.reverseFailed")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
