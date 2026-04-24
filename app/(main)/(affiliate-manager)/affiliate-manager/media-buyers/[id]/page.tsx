"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Link as LinkIcon,
  Users,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatter, dateFormatter } from "@/lib/utils";

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
  }[];
  referredUsers: {
    id: string;
    name: string | null;
    email: string | null;
    promoCodeUsed: string;
    joinedAt: string;
    totalCommission: string;
    ngr: string;
    transactions: {
      id: string;
      type: string;
      amount: string;
      status: string;
      createdAt: string;
    }[];
  }[];
  referredUsersPagination: ReferredUsersPagination;
}

const MediaBuyerDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userPage = parseInt(searchParams.get("userPage") || "1");

  const [buyer, setBuyer] = useState<MediaBuyerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [buyerBalance, setBuyerBalance] = useState({
    finalBalance: "0",
    commissionPercent: 0,
    netFlow: "0",
    commissionAmount: "0",
    totalOwnWithdrawals: "0",
  });

  const [balanceDetailsOpen, setBalanceDetailsOpen] = useState(false);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", description: "" });
  const [withdrawing, setWithdrawing] = useState(false);

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
      const response = await fetch(
        `/api/affiliate/media-buyers/${params.id}?page=${userPage}&limit=10`
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

  const fetchBuyerBalance = async () => {
    try {
      const res = await fetch(
        `/api/affiliate/media-buyers/${params.id}/balance`
      );
      if (res.ok) {
        const data = await res.json();
        setBuyerBalance({
          finalBalance: data.finalBalance,
          commissionPercent: data.commissionPercent,
          netFlow: data.netFlow,
          commissionAmount: data.commissionAmount,
          totalOwnWithdrawals: data.totalOwnWithdrawals,
        });
      }
    } catch (error) {
      console.error("Failed to fetch buyer balance", error);
    }
  };

  const openBalanceDetails = async (page = 1) => {
    setBalanceDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(
        `/api/affiliate/media-buyers/${params.id}/balance?details=true&page=${page}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setWithdrawalsList(data.withdrawals);
        setWithdrawalsPagination({
          page: data.withdrawalsPagination.page,
          totalPages: data.withdrawalsPagination.totalPages,
          total: data.withdrawalsPagination.total,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDetailsPageChange = (newPage: number) => {
    openBalanceDetails(newPage);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return;
    setWithdrawing(true);
    try {
      const res = await fetch(
        `/api/affiliate/media-buyers/${buyer.id}/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(withdrawForm.amount),
            description: withdrawForm.description,
          }),
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed");
      }
      toast.success("Withdrawal created");
      setWithdrawModalOpen(false);
      setWithdrawForm({ amount: "", description: "" });
      fetchBuyerDetails();
      fetchBuyerBalance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw");
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    fetchBuyerDetails();
    fetchBuyerBalance();
  }, [params.id, userPage]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) return;
    setCreating(true);
    try {
      const payload = {
        mediaBuyerId: buyer.id,
        description: newLinkForm.description,
        type: newLinkForm.type,
        bonusPercentage: newLinkForm.bonusPercentage
          ? parseFloat(newLinkForm.bonusPercentage)
          : null,
        maxBonusAmount: newLinkForm.maxBonusAmount
          ? parseFloat(newLinkForm.maxBonusAmount)
          : null,
        minDepositAmount: newLinkForm.minDepositAmount
          ? parseFloat(newLinkForm.minDepositAmount)
          : null,
        freeSpinsCount: newLinkForm.freeSpinsCount
          ? parseInt(newLinkForm.freeSpinsCount)
          : null,
        freeSpinsGame: newLinkForm.freeSpinsGame || null,
        cashbackPercentage: newLinkForm.cashbackPercentage
          ? parseFloat(newLinkForm.cashbackPercentage)
          : null,
        wageringRequirement: newLinkForm.wageringRequirement
          ? parseInt(newLinkForm.wageringRequirement)
          : null,
        commissionPercentage: parseFloat(newLinkForm.commissionPercentage),
        maxUses: newLinkForm.maxUses
          ? parseInt(newLinkForm.maxUses)
          : null,
        startDate: newLinkForm.startDate,
        endDate: newLinkForm.endDate || null,
      };

      const response = await fetch("/api/affiliate/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link");
      }
      const data = await response.json();
      toast.success(`Link created: ${data.code}`);
      setCreateLinkModalOpen(false);
      setNewLinkForm({
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
      fetchBuyerDetails();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    const signupUrl = `https://alt.win/r/${code}`;
    navigator.clipboard.writeText(signupUrl);
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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
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
                {formatAmount(buyerBalance.finalBalance)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openBalanceDetails()}>
                  Details
                </Button>
                <Button variant="outline" onClick={() => setWithdrawModalOpen(true)}>
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={balanceDetailsOpen} onOpenChange={setBalanceDetailsOpen}>
        <DialogContent className="bg-black border-gray-800 max-h-[80vh] overflow-y-auto w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Balance Calculation for {buyer.name || buyer.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">NGR</div>
                <div className="text-right font-mono">
                  {formatAmount(buyerBalance.netFlow)}
                </div>
                <div className="text-gray-400">Rate</div>
                <div className="text-right font-mono">
                  {buyerBalance.commissionPercent}%
                </div>
                <div className="text-gray-400">Commission Earned</div>
                <div className="text-right font-mono">
                  {formatAmount(buyerBalance.commissionAmount)}
                </div>
                <div className="text-gray-400">Withdrawals</div>
                <div className="text-right font-mono text-yellow-400">
                  – {formatAmount(buyerBalance.totalOwnWithdrawals)}
                </div>
                <hr className="col-span-2 border-gray-700" />
                <div className="text-white font-semibold">Available Balance</div>
                <div className="text-right font-mono font-bold text-green-400">
                  {formatAmount(buyerBalance.finalBalance)}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Withdrawals
              </h3>
              {loadingDetails ? (
                <div className="text-center py-4 text-gray-400">Loading...</div>
              ) : withdrawalsList.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No withdrawals yet.
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {withdrawalsList.map((w: any) => (
                      <div
                        key={w.id}
                        className="flex justify-between items-center border-b border-gray-800 pb-2 text-sm"
                      >
                        <div className="text-gray-300">
                          {dateFormatter.toIndianDateTime(w.createdAt)}
                        </div>
                        <div className="text-yellow-400 font-mono">
                          {formatAmount(w.amount)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {w.description || ""}
                        </div>
                      </div>
                    ))}
                  </div>
                  {withdrawalsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400">
                        Page {withdrawalsPagination.page} of{" "}
                        {withdrawalsPagination.totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={withdrawalsPagination.page <= 1}
                          onClick={() =>
                            handleDetailsPageChange(withdrawalsPagination.page - 1)
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            withdrawalsPagination.page >= withdrawalsPagination.totalPages
                          }
                          onClick={() =>
                            handleDetailsPageChange(withdrawalsPagination.page + 1)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{buyer.totalReferrals}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total NGR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-sky-400">
                {formatAmount(buyerBalance.netFlow)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-orange-400">
                {formatAmount(buyer.totalDeposits)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Active Promo Codes</h2>
        <Button
          onClick={() => setCreateLinkModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Create New Link
        </Button>
      </div>

      <div className="rounded-lg shadow-sm border mb-8 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Code</TableHead>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Bonus Details</TableHead>
              <TableHead className="whitespace-nowrap">Uses</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyer.assignedPromoCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                  No promo codes created yet.
                </TableCell>
              </TableRow>
            ) : (
              buyer.assignedPromoCodes.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="whitespace-nowrap">
                    <code className="bg-gray-800 px-2 py-1 rounded">
                      {promo.code}
                    </code>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{promo.type}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {promo.type === "DEPOSIT_BONUS" && promo.bonusPercentage && (
                      <span>
                        {promo.bonusPercentage}% up to{" "}
                        {formatAmount(promo.maxBonusAmount || "0")}
                      </span>
                    )}
                    {promo.type === "FREE_SPINS" && promo.freeSpinsCount && (
                      <span>
                        {promo.freeSpinsCount} spins{" "}
                        {promo.freeSpinsGame && `on ${promo.freeSpinsGame}`}
                      </span>
                    )}
                    {promo.type === "CASHBACK" && promo.cashbackPercentage && (
                      <span>{promo.cashbackPercentage}% cashback</span>
                    )}
                    {promo.type === "COMBINED" && <span>Multiple bonuses</span>}
                    {promo.wageringRequirement && (
                      <span className="block text-xs text-gray-400">
                        Wager: {promo.wageringRequirement}x
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {promo.currentUses}
                    {promo.maxUses && ` / ${promo.maxUses}`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        promo.status === "ACTIVE"
                          ? "bg-green-900 text-green-300"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {promo.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(promo.code)}
                    >
                      {copiedCode === promo.code ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copy Link
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-lg sm:text-xl font-semibold mb-4">Referred Users</h2>
      <div className="rounded-lg shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">User</TableHead>
              <TableHead className="whitespace-nowrap">Promo Code</TableHead>
              <TableHead className="whitespace-nowrap">Joined</TableHead>
              <TableHead className="whitespace-nowrap">NGR</TableHead>
              <TableHead className="whitespace-nowrap">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyer.referredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No referred users yet.
                </TableCell>
              </TableRow>
            ) : (
              buyer.referredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.name || "Unnamed"}
                      </span>
                      <span className="text-sm text-gray-400 truncate max-w-[200px]">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <code className="bg-gray-800 px-2 py-1 rounded text-sm">
                      {user.promoCodeUsed}
                    </code>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {dateFormatter.toIndianDateTime(user.joinedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{formatAmount(user.ngr)}</span>
                  </TableCell>
                  <TableCell>
                    {user.transactions.length > 0 ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Link
                          href={`/affiliate-manager/media-buyers/${buyer.id}/user/${user.id}/transactions`}
                        >
                          View Transactions
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-gray-500 text-sm pl-2">
                        No transactions
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {buyer.referredUsersPagination &&
          buyer.referredUsersPagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <div className="text-sm text-gray-400">
                Showing {(buyer.referredUsersPagination.currentPage - 1) * 10 + 1}{" "}
                to{" "}
                {Math.min(
                  buyer.referredUsersPagination.currentPage * 10,
                  buyer.referredUsersPagination.totalCount
                )}{" "}
                of {buyer.referredUsersPagination.totalCount} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    goToUserPage(buyer.referredUsersPagination.currentPage - 1)
                  }
                  disabled={!buyer.referredUsersPagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from(
                    { length: Math.min(5, buyer.referredUsersPagination.totalPages) },
                    (_, i) => {
                      let pageNum: number;
                      const total = buyer.referredUsersPagination.totalPages;
                      const current = buyer.referredUsersPagination.currentPage;
                      if (total <= 5) pageNum = i + 1;
                      else if (current <= 3) pageNum = i + 1;
                      else if (current >= total - 2) pageNum = total - 4 + i;
                      else pageNum = current - 2 + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={current === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToUserPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    goToUserPage(
                      buyer.referredUsersPagination.currentPage + 1
                    )
                  }
                  disabled={!buyer.referredUsersPagination.hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
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