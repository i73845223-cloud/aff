"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Link as LinkIcon, Users, Copy, Check,
  ChevronLeft, ChevronRight, TrendingDown, IndianRupee,
  UserPlus, Banknote, Download,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatter, dateFormatter } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface ReferredUsersPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface MediaBuyerDetails {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  totalReferrals: number;
  totalCommission: number;
  totalDeposits: string;
  totalWithdrawals: string;
  totalNgr: string;
  totalBalance: string;
  commissionPercent: number;
  totalOwnWithdrawals: string;
  totalFtdCommission: number;
  totalRegistrations: number;
  totalFirstDeposits: number;
  assignedPromoCodes: {
    id: string;
    code: string;
    type: string;
    bonusPercentage: number | null;
    maxBonusAmount: string | null;
    minDepositAmount: string | null;
    freeSpinsCount: number | null;
    freeSpinsGame: string | null;
    cashbackPercentage: number | null;
    wageringRequirement: number | null;
    commissionPercentage: number;
    currentUses: number;
    maxUses: number | null;
    status: string;
    _count: { userPromoCodes: number };
    influencerEarnings: { amount: string }[];
    ftdCount: number;
    ftdCommission: string;
    registrations: number;
  }[];
  referredUsers: {
    id: string;
    name: string | null;
    email: string | null;
    promoCodeUsed: string;
    joinedAt: string;
    totalCommission: string;
    hasDeposited: boolean;
    transactions: {
      id: string; type: string; amount: string; status: string; createdAt: string;
    }[];
  }[];
  referredUsersPagination: ReferredUsersPagination;
}

const MediaBuyerDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const userPage = parseInt(searchParamsHook.get("userPage") || "1");

  const [buyer, setBuyer] = useState<MediaBuyerDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hasDepositedFilter, setHasDepositedFilter] = useState("all");

  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [balanceDetailsOpen, setBalanceDetailsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    page: 1, totalPages: 1, total: 0,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [withdrawForm, setWithdrawForm] = useState({ amount: "", description: "" });
  const [newLinkForm, setNewLinkForm] = useState({
    description: "",
    type: "DEPOSIT_BONUS",
    bonusPercentage: "",
    maxBonusAmount: "",
    minDepositAmount: "",
    freeSpinsCount: "",
    freeSpinsGame: "",
    cashbackPercentage: "",
    wageringRequirement: "",
    commissionPercentage: "1.0",
    maxUses: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  const fetchBuyerDetails = async () => {
    try {
      setLoading(true);
      const paramsObj = new URLSearchParams({
        page: userPage.toString(),
        limit: "10",
      });
      if (dateFrom) paramsObj.set("dateFrom", dateFrom);
      if (dateTo) paramsObj.set("dateTo", dateTo);
      paramsObj.set("hasDeposited", hasDepositedFilter);

      const response = await fetch(
        `/api/affiliate/media-buyers/${params.id}?${paramsObj}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setBuyer(data);
    } catch (error) {
      toast.error("Failed to load media buyer details");
    } finally {
      setLoading(false);
    }
  };

  const openBalanceDetails = async (page = 1) => {
    setBalanceDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const paramsObj = new URLSearchParams({
        details: 'true',
        page: page.toString(),
        limit: '10',
      });
      if (dateFrom) paramsObj.set('dateFrom', dateFrom);
      if (dateTo) paramsObj.set('dateTo', dateTo);
      const res = await fetch(
        `/api/affiliate/media-buyers/${params.id}/balance?${paramsObj}`
      );
      if (res.ok) {
        const d = await res.json();
        setWithdrawalsList(d.withdrawals);
        setWithdrawalsPagination({
          page: d.withdrawalsPagination.page,
          totalPages: d.withdrawalsPagination.totalPages,
          total: d.withdrawalsPagination.total,
        });
      }
    } catch (err) { console.error(err); }
    finally { setLoadingDetails(false); }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return;
    setCreating(true);
    try {
      const payload = {
        mediaBuyerId: buyer.id,
        description: newLinkForm.description,
        type: newLinkForm.type,
        bonusPercentage: newLinkForm.bonusPercentage ? parseFloat(newLinkForm.bonusPercentage) : null,
        maxBonusAmount: newLinkForm.maxBonusAmount ? parseFloat(newLinkForm.maxBonusAmount) : null,
        minDepositAmount: newLinkForm.minDepositAmount ? parseFloat(newLinkForm.minDepositAmount) : null,
        freeSpinsCount: newLinkForm.freeSpinsCount ? parseInt(newLinkForm.freeSpinsCount) : null,
        freeSpinsGame: newLinkForm.freeSpinsGame || null,
        cashbackPercentage: newLinkForm.cashbackPercentage ? parseFloat(newLinkForm.cashbackPercentage) : null,
        wageringRequirement: newLinkForm.wageringRequirement ? parseInt(newLinkForm.wageringRequirement) : null,
        commissionPercentage: parseFloat(newLinkForm.commissionPercentage),
        maxUses: newLinkForm.maxUses ? parseInt(newLinkForm.maxUses) : null,
        startDate: newLinkForm.startDate,
        endDate: newLinkForm.endDate || null,
      };

      const response = await fetch("/api/affiliate/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed");
      toast.success(`Link created: ${(await response.json()).code}`);
      setCreateLinkModalOpen(false);
      setNewLinkForm({
        description: "", type: "DEPOSIT_BONUS", bonusPercentage: "", maxBonusAmount: "", minDepositAmount: "",
        freeSpinsCount: "", freeSpinsGame: "", cashbackPercentage: "", wageringRequirement: "",
        commissionPercentage: "1.0", maxUses: "",
        startDate: new Date().toISOString().split("T")[0], endDate: "",
      });
      fetchBuyerDetails();
    } catch (error) {
      toast.error("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/affiliate/media-buyers/${buyer.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(withdrawForm.amount),
          description: withdrawForm.description,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Withdrawal created");
      setWithdrawModalOpen(false);
      setWithdrawForm({ amount: "", description: "" });
      fetchBuyerDetails();
    } catch (error) {
      toast.error("Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(`https://alt.win/r/${code}`);
    setCopiedCode(code);
    toast.success("Signup link copied");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatAmount = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return formatter.format(num);
  };

  const goToUserPage = (page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("userPage", page.toString());
    router.push(url.pathname + url.search);
  };

  const handleDownload = () => {
    window.open(
      `/api/affiliate/media-buyers/${buyer?.id}/dashboard/download?dateFrom=${dateFrom}&dateTo=${dateTo}&hasDeposited=${hasDepositedFilter}`,
      "_blank"
    );
  };

  useEffect(() => {
    fetchBuyerDetails();
  }, [params.id, userPage, dateFrom, dateTo, hasDepositedFilter]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-40">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Media Buyer Not Found</h2>
          <Button asChild>
            <Link href="/affiliate-manager">Go Back</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mt-2 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold truncate">
          {buyer.name || buyer.email}
        </h1>
      </div>

      <div className="mb-6">
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-white text-center sm:text-left">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="text-3xl font-bold text-green-400">
                $ {(buyer.totalBalance)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openBalanceDetails()}>
                  Details
                </Button>
                <Button variant="outline" onClick={() => setWithdrawModalOpen(true)}>
                  <TrendingDown className="h-4 w-4 mr-1" /> Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={balanceDetailsOpen} onOpenChange={setBalanceDetailsOpen}>
        <DialogContent className="bg-black border-gray-800 max-h-[80vh] overflow-y-auto w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Balance Calculation for {buyer.name || buyer.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">FTD Commission</div>
                <div className="text-right font-mono">$ {(buyer.totalFtdCommission)}</div>
                <div className="text-gray-400">Withdrawals</div>
                <div className="text-right font-mono text-yellow-400">–$ {(buyer.totalOwnWithdrawals)}</div>
                <hr className="col-span-2 border-gray-700" />
                <div className="text-white font-semibold">Available Balance</div>
                <div className="text-right font-mono font-bold text-green-400">
                  $ {(buyer.totalBalance)}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Withdrawals</h3>
              {loadingDetails ? (
                <div className="text-center py-4 text-gray-400">Loading...</div>
              ) : withdrawalsList.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No withdrawals yet.</div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {withdrawalsList.map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center border-b border-gray-800 pb-2 text-sm">
                        <div className="text-gray-300">{dateFormatter.toIndianDateTime(w.createdAt)}</div>
                        <div className="text-yellow-400 font-mono">${(w.amount)}</div>
                        <div className="text-gray-500 text-xs">{w.description || ''}</div>
                      </div>
                    ))}
                  </div>
                  {withdrawalsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400">Page {withdrawalsPagination.page} of {withdrawalsPagination.totalPages}</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={withdrawalsPagination.page <= 1} onClick={() => openBalanceDetails(withdrawalsPagination.page - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={withdrawalsPagination.page >= withdrawalsPagination.totalPages} onClick={() => openBalanceDetails(withdrawalsPagination.page + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-end mb-6">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <Label className="text-sm text-gray-400">From</Label>
          <DatePicker
            date={dateFrom ? new Date(dateFrom + 'T00:00:00') : undefined}
            onSelect={(d) => {
              if (d) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setDateFrom(`${year}-${month}-${day}`);
              } else setDateFrom('');
            }}
            placeholder="Start date"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <Label className="text-sm text-gray-400">To</Label>
          <DatePicker
            date={dateTo ? new Date(dateTo + 'T00:00:00') : undefined}
            onSelect={(d) => {
              if (d) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setDateTo(`${year}-${month}-${day}`);
              } else setDateTo('');
            }}
            placeholder="End date"
          />
        </div>
        <Button onClick={() => fetchBuyerDetails()} className="sm:self-end">Apply</Button>
        <Button onClick={handleDownload} variant="outline" className="sm:self-end">
          <Download className="h-4 w-4 mr-1" /> Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" /> FTD Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$ {(buyer.totalFtdCommission)}</div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-green-400" /> Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyer.totalRegistrations}</div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-yellow-400" /> First Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyer.totalFirstDeposits}</div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatAmount(buyer.totalDeposits)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Promo Codes</h2>
        <Button onClick={() => setCreateLinkModalOpen(true)} className="w-full sm:w-auto">
          <LinkIcon className="h-4 w-4 mr-2" /> Create New Link
        </Button>
      </div>
      <div className="rounded-lg shadow-sm border mb-8 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="whitespace-nowrap">FTD Commission</TableHead>
              <TableHead className="whitespace-nowrap">FTDs</TableHead>
              <TableHead className="whitespace-nowrap">Registrations</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Bonus Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyer.assignedPromoCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">No promo codes created yet.</TableCell>
              </TableRow>
            ) : (
              buyer.assignedPromoCodes.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-2 py-1 rounded">{promo.code}</code>
                      <button onClick={() => copyToClipboard(promo.code)} className="text-gray-400 hover:text-white">
                        {copiedCode === promo.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">$ {(promo.ftdCommission || "0")}</TableCell>
                  <TableCell className="whitespace-nowrap">{promo.ftdCount}</TableCell>
                  <TableCell className="whitespace-nowrap">{promo.registrations}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${promo.status === "ACTIVE" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"}`}>{promo.status}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {promo.type === "DEPOSIT_BONUS" && promo.bonusPercentage && (
                      <span>{promo.bonusPercentage}% up to {formatAmount(promo.maxBonusAmount || "0")}</span>
                    )}
                    {promo.type === "FREE_SPINS" && promo.freeSpinsCount && (
                      <span>{promo.freeSpinsCount} spins {promo.freeSpinsGame && `on ${promo.freeSpinsGame}`}</span>
                    )}
                    {promo.type === "CASHBACK" && promo.cashbackPercentage && (
                      <span>{promo.cashbackPercentage}% cashback</span>
                    )}
                    {promo.type === "COMBINED" && <span>Multiple bonuses</span>}
                    {promo.wageringRequirement && (
                      <span className="block text-xs text-gray-400">Wager: {promo.wageringRequirement}x</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Referred Users</h2>
        <Select value={hasDepositedFilter} onValueChange={(value) => setHasDepositedFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-black border-gray-800">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="deposited">Has Deposited</SelectItem>
            <SelectItem value="notdeposited">No Deposit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">User</TableHead>
              <TableHead className="whitespace-nowrap">Promo Code</TableHead>
              <TableHead className="whitespace-nowrap">Joined</TableHead>
              <TableHead className="whitespace-nowrap">Has Deposited</TableHead>
              <TableHead className="whitespace-nowrap">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyer.referredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">No referred users yet.</TableCell>
              </TableRow>
            ) : (
              buyer.referredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || "Unnamed"}</span>
                      <span className="text-sm text-gray-400 truncate max-w-[200px]">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <code className="bg-gray-800 px-2 py-1 rounded text-sm">{user.promoCodeUsed}</code>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{dateFormatter.toIndianDateTime(user.joinedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {user.hasDeposited ? (
                      <span className="text-green-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.transactions.length > 0 ? (
                      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href={`/affiliate-manager/media-buyers/${buyer.id}/user/${user.id}/transactions`}>
                          View Transactions
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-gray-500 text-sm pl-2">No transactions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {buyer.referredUsersPagination && buyer.referredUsersPagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-800">
            <div className="text-sm text-gray-400">
              Showing {(buyer.referredUsersPagination.currentPage - 1) * 10 + 1} to {Math.min(buyer.referredUsersPagination.currentPage * 10, buyer.referredUsersPagination.totalCount)} of {buyer.referredUsersPagination.totalCount} users
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToUserPage(buyer.referredUsersPagination.currentPage - 1)} disabled={!buyer.referredUsersPagination.hasPrev}>
                <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: Math.min(5, buyer.referredUsersPagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  const total = buyer.referredUsersPagination.totalPages;
                  const current = buyer.referredUsersPagination.currentPage;
                  if (total <= 5) pageNum = i + 1;
                  else if (current <= 3) pageNum = i + 1;
                  else if (current >= total - 2) pageNum = total - 4 + i;
                  else pageNum = current - 2 + i;
                  return (
                    <Button key={pageNum} variant={current === pageNum ? "default" : "outline"} size="sm" onClick={() => goToUserPage(pageNum)}>{pageNum}</Button>
                  );
                })}
              </div>
              <span className="sm:hidden text-sm text-gray-400">Page {buyer.referredUsersPagination.currentPage} of {buyer.referredUsersPagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => goToUserPage(buyer.referredUsersPagination.currentPage + 1)} disabled={!buyer.referredUsersPagination.hasNext}>
                <span className="hidden sm:inline mr-1">Next</span><ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={createLinkModalOpen} onOpenChange={setCreateLinkModalOpen}>
        <DialogContent className="bg-black border-gray-800 max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tracking Link with Bonus</DialogTitle>
            <DialogDescription>
              Generate a new promo code/link for {buyer.name || buyer.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLink}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Instagram Campaign"
                  value={newLinkForm.description}
                  onChange={(e) =>
                    setNewLinkForm({ ...newLinkForm, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftdFee">FTD Fee ($)</Label>
                <Input
                  id="ftdFee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500"
                  value={newLinkForm.commissionPercentage || ""}
                  onChange={(e) =>
                    setNewLinkForm({
                      ...newLinkForm,
                      commissionPercentage: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Bonus Type</Label>
                <Select
                  value={newLinkForm.type}
                  onValueChange={(value) =>
                    setNewLinkForm({ ...newLinkForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bonus type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT_BONUS">Deposit Bonus</SelectItem>
                    {/* <SelectItem value="FREE_SPINS">Free Spins</SelectItem>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="FREE_BET">Free Bet</SelectItem>
                    <SelectItem value="COMBINED">Combined</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              {(newLinkForm.type === "DEPOSIT_BONUS" ||
                newLinkForm.type === "COMBINED") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bonusPercentage">Bonus Percentage (%)</Label>
                    <Input
                      id="bonusPercentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="500"
                      placeholder="100"
                      value={newLinkForm.bonusPercentage}
                      onChange={(e) =>
                        setNewLinkForm({
                          ...newLinkForm,
                          bonusPercentage: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxBonusAmount">Max Bonus Amount (₹)</Label>
                    <Input
                      id="maxBonusAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="1000"
                      value={newLinkForm.maxBonusAmount}
                      onChange={(e) =>
                        setNewLinkForm({
                          ...newLinkForm,
                          maxBonusAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minDepositAmount">
                      Min Deposit Amount (₹)
                    </Label>
                    <Input
                      id="minDepositAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="20"
                      value={newLinkForm.minDepositAmount}
                      onChange={(e) =>
                        setNewLinkForm({
                          ...newLinkForm,
                          minDepositAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
              {(newLinkForm.type === "FREE_SPINS" ||
                newLinkForm.type === "COMBINED") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="freeSpinsCount">Free Spins Count</Label>
                    <Input
                      id="freeSpinsCount"
                      type="number"
                      min="1"
                      placeholder="50"
                      value={newLinkForm.freeSpinsCount}
                      onChange={(e) =>
                        setNewLinkForm({
                          ...newLinkForm,
                          freeSpinsCount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeSpinsGame">Game (optional)</Label>
                    <Input
                      id="freeSpinsGame"
                      placeholder="Starburst"
                      value={newLinkForm.freeSpinsGame}
                      onChange={(e) =>
                        setNewLinkForm({
                          ...newLinkForm,
                          freeSpinsGame: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
              {newLinkForm.type === "CASHBACK" && (
                <div className="space-y-2">
                  <Label htmlFor="cashbackPercentage">
                    Cashback Percentage (%)
                  </Label>
                  <Input
                    id="cashbackPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={newLinkForm.cashbackPercentage}
                    onChange={(e) =>
                      setNewLinkForm({
                        ...newLinkForm,
                        cashbackPercentage: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="wageringRequirement">
                  Wagering Requirement (x)
                </Label>
                <Input
                  id="wageringRequirement"
                  type="number"
                  min="0"
                  placeholder="35"
                  value={newLinkForm.wageringRequirement}
                  onChange={(e) =>
                    setNewLinkForm({
                      ...newLinkForm,
                      wageringRequirement: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">
                  Maximum Uses (leave empty for unlimited)
                </Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={newLinkForm.maxUses}
                  onChange={(e) =>
                    setNewLinkForm({
                      ...newLinkForm,
                      maxUses: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newLinkForm.startDate}
                    onChange={(e) =>
                      setNewLinkForm({
                        ...newLinkForm,
                        startDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newLinkForm.endDate}
                    onChange={(e) =>
                      setNewLinkForm({
                        ...newLinkForm,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateLinkModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="bg-black border-gray-800 w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Withdraw for {buyer.name || buyer.email}
            </DialogTitle>
            <DialogDescription>
              Create a withdrawal transaction for this media buyer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleWithdraw}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Amount (₹)</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={withdrawForm.amount}
                  onChange={(e) =>
                    setWithdrawForm({ ...withdrawForm, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawDescription">
                  Description (optional)
                </Label>
                <Input
                  id="withdrawDescription"
                  value={withdrawForm.description}
                  onChange={(e) =>
                    setWithdrawForm({
                      ...withdrawForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWithdrawModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={withdrawing}>
                {withdrawing ? "Processing..." : "Confirm Withdrawal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaBuyerDetailsPage;