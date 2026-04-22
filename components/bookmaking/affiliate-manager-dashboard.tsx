"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  UserPlus,
  Link as LinkIcon,
  Users,
  IndianRupee,
  Eye,
  Copy,
  Check,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatter, dateFormatter } from "@/lib/utils";

interface MediaBuyer {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  isBlocked: boolean;
  _count: {
    assignedPromoCodes: number;
  };
  assignedPromoCodes: {
    id: string;
    code: string;
    commissionPercentage: number;
    currentUses: number;
    maxUses: number | null;
    status: string;
    type: string;
    bonusPercentage: number | null;
    maxBonusAmount: string | null;
    minDepositAmount: string | null;
    freeSpinsCount: number | null;
    freeSpinsGame: string | null;
    cashbackPercentage: number | null;
    wageringRequirement: number | null;
    _count: {
      userPromoCodes: number;
    };
    influencerEarnings: {
      amount: string;
    }[];
  }[];
  totalReferrals: number;
  totalCommission: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const AffiliateManagerDashboard = () => {
  const [mediaBuyers, setMediaBuyers] = useState<MediaBuyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [mounted, setMounted] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [selectedBuyerForLink, setSelectedBuyerForLink] = useState<MediaBuyer | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const router = useRouter();

  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
  });

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

  const [globalTotals, setGlobalTotals] = useState({
    totalDeposits: "0",
    totalWithdrawals: "0",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMediaBuyers = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
      });
      const response = await fetch(`/api/affiliate/media-buyers?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch media buyers: ${response.status}`);
      const data = await response.json();
      setMediaBuyers(data.users);
      setPagination(data.pagination);
      if (data.globalTotals) {
        setGlobalTotals(data.globalTotals);
      }
    } catch (error) {
      console.error("Error fetching media buyers:", error);
      toast.error("Failed to load media buyers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMediaBuyers(1, searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm("");
    fetchMediaBuyers(1);
  };

  const goToPage = (page: number) => {
    fetchMediaBuyers(page, searchTerm);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch("/api/affiliate/media-buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create media buyer");
      }
      toast.success("Media buyer created successfully");
      setCreateUserModalOpen(false);
      setNewUserForm({ name: "", email: "", password: "" });
      fetchMediaBuyers(pagination.currentPage, searchTerm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create media buyer");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuyerForLink) return;
    setCreating(true);
    try {
      const payload = {
        mediaBuyerId: selectedBuyerForLink.id,
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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link");
      }
      const data = await response.json();
      toast.success(`Link created: ${data.code}`);
      setCreateLinkModalOpen(false);
      setSelectedBuyerForLink(null);
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
      fetchMediaBuyers(pagination.currentPage, searchTerm);
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
    toast.success("Signup link copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatAmount = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return formatter.format(num);
  };

  useEffect(() => {
    fetchMediaBuyers();
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-40">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  const totalStats = mediaBuyers.reduce(
    (acc, buyer) => {
      acc.totalReferrals += buyer.totalReferrals;
      acc.totalCommission += buyer.totalCommission;
      return acc;
    },
    { totalReferrals: 0, totalCommission: 0 }
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Media Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{pagination.totalCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <LinkIcon className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-2xl font-bold">{totalStats.totalReferrals}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <IndianRupee className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">{formatAmount(totalStats.totalCommission)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Total Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-2xl font-bold">{formatAmount(globalTotals.totalDeposits)}</span>
          </div>
        </CardContent>
      </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:flex-1 sm:max-w-md">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search media buyers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">Search</Button>
              <Button type="button" variant="outline" onClick={clearSearch} className="flex-1 sm:flex-none">
                Clear
              </Button>
            </div>
          </form>
        </div>
        <Button onClick={() => setCreateUserModalOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Media Buyer
        </Button>
      </div>

      <div className="rounded-lg shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Media Buyer</TableHead>
              <TableHead className="whitespace-nowrap">Referrals</TableHead>
              <TableHead className="whitespace-nowrap">Commission</TableHead>
              <TableHead className="whitespace-nowrap">Active Links</TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : mediaBuyers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No media buyers found.
                </TableCell>
              </TableRow>
            ) : (
              mediaBuyers.map((buyer) => (
                <TableRow key={buyer.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">{buyer.name || "Unnamed"}</div>
                      <div className="text-sm text-gray-400 truncate max-w-[200px]">{buyer.email}</div>
                      <div className="text-xs text-gray-500">Joined {dateFormatter.toIndianDateTime(buyer.createdAt)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{buyer.totalReferrals}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatAmount(buyer.totalCommission)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {buyer.assignedPromoCodes.filter(p => p.status === "ACTIVE").map(promo => (
                        <div key={promo.id} className="flex items-center gap-1 text-sm">
                          <code className="bg-gray-800 px-1 py-0.5 rounded">{promo.code}</code>
                          <span className="text-gray-400">({promo._count.userPromoCodes} uses)</span>
                          <button
                            onClick={() => copyToClipboard(promo.code)}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedCode === promo.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                      {buyer.assignedPromoCodes.filter(p => p.status === "ACTIVE").length === 0 && (
                        <span className="text-gray-500 text-sm">No active links</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBuyerForLink(buyer);
                          setCreateLinkModalOpen(true);
                        }}
                        className="w-full sm:w-auto"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Create Link
                      </Button>
                      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href={`/affiliate-manager/media-buyers/${buyer.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && mediaBuyers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t">
            <div className="text-sm text-gray-400">
              Showing {(pagination.currentPage - 1) * 10 + 1} to {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} media buyers
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToPage(pagination.currentPage - 1)} disabled={!pagination.hasPrev}>
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) pageNum = i + 1;
                  else if (pagination.currentPage <= 3) pageNum = i + 1;
                  else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                  else pageNum = pagination.currentPage - 2 + i;
                  return (
                    <Button key={pageNum} variant={pagination.currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => goToPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <span className="sm:hidden text-sm text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => goToPage(pagination.currentPage + 1)} disabled={!pagination.hasNext}>
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="bg-black border-gray-800 w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Media Buyer Account</DialogTitle>
            <DialogDescription>
              Add a new media buyer who can create and manage their own affiliate links.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Media Buyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createLinkModalOpen} onOpenChange={setCreateLinkModalOpen}>
        <DialogContent className="bg-black border-gray-800 max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tracking Link with Bonus</DialogTitle>
            <DialogDescription>
              Generate a new promo code/link for {selectedBuyerForLink?.name || selectedBuyerForLink?.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLink}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Facebook Campaign Q2"
                  value={newLinkForm.description}
                  onChange={(e) => setNewLinkForm({ ...newLinkForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Bonus Type</Label>
                <Select
                  value={newLinkForm.type}
                  onValueChange={(value) => setNewLinkForm({ ...newLinkForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bonus type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT_BONUS">Deposit Bonus</SelectItem>
                    <SelectItem value="FREE_SPINS">Free Spins</SelectItem>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="FREE_BET">Free Bet</SelectItem>
                    <SelectItem value="COMBINED">Combined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newLinkForm.type === "DEPOSIT_BONUS" || newLinkForm.type === "COMBINED") && (
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
                      onChange={(e) => setNewLinkForm({ ...newLinkForm, bonusPercentage: e.target.value })}
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
                      onChange={(e) => setNewLinkForm({ ...newLinkForm, maxBonusAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minDepositAmount">Min Deposit Amount (₹)</Label>
                    <Input
                      id="minDepositAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="20"
                      value={newLinkForm.minDepositAmount}
                      onChange={(e) => setNewLinkForm({ ...newLinkForm, minDepositAmount: e.target.value })}
                    />
                  </div>
                </>
              )}
              {(newLinkForm.type === "FREE_SPINS" || newLinkForm.type === "COMBINED") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="freeSpinsCount">Free Spins Count</Label>
                    <Input
                      id="freeSpinsCount"
                      type="number"
                      min="1"
                      placeholder="50"
                      value={newLinkForm.freeSpinsCount}
                      onChange={(e) => setNewLinkForm({ ...newLinkForm, freeSpinsCount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeSpinsGame">Game (optional)</Label>
                    <Input
                      id="freeSpinsGame"
                      placeholder="Starburst"
                      value={newLinkForm.freeSpinsGame}
                      onChange={(e) => setNewLinkForm({ ...newLinkForm, freeSpinsGame: e.target.value })}
                    />
                  </div>
                </>
              )}
              {newLinkForm.type === "CASHBACK" && (
                <div className="space-y-2">
                  <Label htmlFor="cashbackPercentage">Cashback Percentage (%)</Label>
                  <Input
                    id="cashbackPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={newLinkForm.cashbackPercentage}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, cashbackPercentage: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="wageringRequirement">Wagering Requirement (x)</Label>
                <Input
                  id="wageringRequirement"
                  type="number"
                  min="0"
                  placeholder="35"
                  value={newLinkForm.wageringRequirement}
                  onChange={(e) => setNewLinkForm({ ...newLinkForm, wageringRequirement: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission Percentage (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newLinkForm.commissionPercentage}
                  onChange={(e) => setNewLinkForm({ ...newLinkForm, commissionPercentage: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maximum Uses (leave empty for unlimited)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={newLinkForm.maxUses}
                  onChange={(e) => setNewLinkForm({ ...newLinkForm, maxUses: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newLinkForm.startDate}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newLinkForm.endDate}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Generate Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliateManagerDashboard;