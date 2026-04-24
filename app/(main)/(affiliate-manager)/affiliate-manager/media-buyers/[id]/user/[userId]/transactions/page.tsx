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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatter, dateFormatter } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string | null;
}

interface Summary {
  depositsCategoryTransactions: string;
  withdrawalsCategoryTransactions: string;
  depositsOther: string;
  withdrawalsOther: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const UserTransactionsPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [promoCode, setPromoCode] = useState<string>("");
  const [ngr, setNgr] = useState<string>("0");
  const [summary, setSummary] = useState<Summary>({
    depositsCategoryTransactions: "0",
    withdrawalsCategoryTransactions: "0",
    depositsOther: "0",
    withdrawalsOther: "0",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);

  const mediaBuyerId = params.id as string;
  const userId = params.userId as string;

  const fetchTransactions = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/affiliate/media-buyers/${mediaBuyerId}/user/${userId}/transactions?page=${page}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data.transactions);
      setUserInfo(data.user);
      setPromoCode(data.promoCode);
      setNgr(data.ngr);                            // <-- changed
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (error) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [mediaBuyerId, userId, currentPage]);

  const goToPage = (page: number) => {
    router.push(
      `/affiliate-manager/media-buyers/${mediaBuyerId}/user/${userId}/transactions?page=${page}`
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-900 text-green-300";
      case "pending":
        return "bg-yellow-900 text-yellow-300";
      case "fail":
        return "bg-red-900 text-red-300";
      default:
        return "bg-gray-800 text-gray-400";
    }
  };

  const formatAmount = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return formatter.format(num);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-40">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Transactions: {userInfo?.name || userInfo?.email || "User"}
          </h1>
          <p className="text-gray-400">
            {userInfo?.email} • Promo Code:{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">{promoCode}</code>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-500" />
              Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatAmount(summary.depositsCategoryTransactions)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatAmount(summary.withdrawalsCategoryTransactions)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Turnover (plus)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatAmount(summary.depositsOther)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Turnover (minus)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {formatAmount(summary.withdrawalsOther)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- NGR card (replaces Total Commission Earned) ---------- */}
      <Card className="bg-black border-gray-800 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
            Total NGR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-400">
            {formatAmount(ngr)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found for this user.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {dateFormatter.toIndianDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell>{formatAmount(tx.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tx.status)}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.category || "-"}</TableCell>
                      <TableCell>{tx.description || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-2 py-4 border-t border-gray-800 mt-4">
                <div className="text-sm text-gray-400">
                  Showing {(pagination.currentPage - 1) * 20 + 1} to{" "}
                  {Math.min(pagination.currentPage * 20, pagination.totalCount)} of{" "}
                  {pagination.totalCount} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.currentPage >=
                          pagination.totalPages - 2
                        ) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.currentPage === pageNum
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => goToPage(pageNum)}
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
                    onClick={() => goToPage(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserTransactionsPage;