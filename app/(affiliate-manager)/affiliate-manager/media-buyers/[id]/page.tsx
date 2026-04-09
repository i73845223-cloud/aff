"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  DollarSign,
  Users,
  Copy,
  Check,
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

interface MediaBuyerDetails {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  totalReferrals: number;
  totalCommission: number;
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
    transactions: {
      id: string;
      type: string;
      amount: string;
      status: string;
      createdAt: string;
    }[];
  }[];
}

const MediaBuyerDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const [buyer, setBuyer] = useState<MediaBuyerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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
      const response = await fetch(`/api/affiliate/media-buyers/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setBuyer(data);
    } catch (error) {
      toast.error("Failed to load media buyer details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyerDetails();
  }, [params.id]);

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

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-40">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{buyer.name || buyer.email}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{buyer.totalReferrals}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">${buyer.totalCommission.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Member Since</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg">{new Date(buyer.createdAt).toLocaleDateString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Active Promo Codes</h2>
        <Button onClick={() => setCreateLinkModalOpen(true)}>
          <LinkIcon className="h-4 w-4 mr-2" />
          Create New Link
        </Button>
      </div>

      <div className="rounded-lg shadow-sm border mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bonus Details</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
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
                  <TableCell>
                    <code className="bg-gray-800 px-2 py-1 rounded">{promo.code}</code>
                  </TableCell>
                  <TableCell>{promo.type}</TableCell>
                  <TableCell>
                    {promo.type === "DEPOSIT_BONUS" && promo.bonusPercentage && (
                      <span>{promo.bonusPercentage}% up to ${promo.maxBonusAmount}</span>
                    )}
                    {promo.type === "FREE_SPINS" && promo.freeSpinsCount && (
                      <span>{promo.freeSpinsCount} spins {promo.freeSpinsGame && `on ${promo.freeSpinsGame}`}</span>
                    )}
                    {promo.type === "CASHBACK" && promo.cashbackPercentage && (
                      <span>{promo.cashbackPercentage}% cashback</span>
                    )}
                    {promo.type === "COMBINED" && (
                      <span>Multiple bonuses</span>
                    )}
                    {promo.wageringRequirement && (
                      <span className="block text-xs text-gray-400">Wager: {promo.wageringRequirement}x</span>
                    )}
                  </TableCell>
                  <TableCell>{promo.commissionPercentage}%</TableCell>
                  <TableCell>
                    {promo.currentUses}
                    {promo.maxUses && ` / ${promo.maxUses}`}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      promo.status === "ACTIVE" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"
                    }`}>
                      {promo.status}
                    </span>
                  </TableCell>
                  <TableCell>
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

      <h2 className="text-xl font-semibold mb-4">Referred Users</h2>
      <div className="rounded-lg shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Promo Code</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Recent Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buyer.referredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                  No referred users yet.
                </TableCell>
              </TableRow>
            ) : (
              buyer.referredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || "Unnamed"}</span>
                      <span className="text-sm text-gray-400">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-800 px-2 py-1 rounded text-sm">{user.promoCodeUsed}</code>
                  </TableCell>
                  <TableCell>{new Date(user.joinedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.transactions.length > 0 ? (
                      <div className="space-y-1">
                        {user.transactions.slice(0, 2).map((tx) => (
                          <div key={tx.id} className="text-sm flex justify-between gap-4">
                            <span className="text-gray-400">{tx.type}</span>
                            <span>${parseFloat(tx.amount).toFixed(2)}</span>
                            <span className="text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                        {user.transactions.length > 2 && (
                          <div className="text-xs text-gray-500">+{user.transactions.length - 2} more</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No transactions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createLinkModalOpen} onOpenChange={setCreateLinkModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
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
                    <Label htmlFor="maxBonusAmount">Max Bonus Amount ($)</Label>
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
                    <Label htmlFor="minDepositAmount">Min Deposit Amount ($)</Label>
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
              <div className="grid grid-cols-2 gap-4">
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
            <DialogFooter>
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

export default MediaBuyerDetailsPage;