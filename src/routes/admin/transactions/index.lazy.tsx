import { createLazyFileRoute, Link, useSearch } from '@tanstack/react-router'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, Upload, Eye, CreditCard, Tag, User, Receipt } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, type Transaction } from './index'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

export const Route = createLazyFileRoute('/admin/transactions/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { page, pageSize } = useSearch({ from: '/admin/transactions/' })
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['transactions-list', page, pageSize],
        queryFn: () => fetchTransactions(page, pageSize),
        staleTime: 1000 * 60 * 5,
    })

    const transactionList = data?.transactions || []
    const totalTransactions = data?.totalCount || 0
    const loading = isQueryLoading

    // Simplified Pagination logic
    const hasNextPage = page * pageSize < totalTransactions
    const hasPrevPage = page > 1

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2">
                <div className="flex items-center justify-center p-1 rounded bg-blue-50">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-blue-500"
                    >
                        <path
                            d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                            fill="currentColor"
                            fillOpacity="0.1"
                        />
                        <path
                            d="M7 12H17M17 12L13 8M17 12L13 16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" fill="#EF4444" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for transactions"
                        className="pl-9 bg-muted/50 border-none h-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Select defaultValue="all-time">
                        <SelectTrigger className="w-[200px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Date Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-time">Date Range: All Time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-12">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="text-black font-bold text-base">Date</TableHead>
                            <TableHead className="text-black font-bold text-base">Type</TableHead>
                            <TableHead className="text-black font-bold text-base">Vendor</TableHead>
                            <TableHead className="text-black font-bold text-base text-right">Amount</TableHead>
                            <TableHead className="text-black font-bold text-base text-right">Rewards</TableHead>
                            <TableHead className="text-black font-bold text-base text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#18B852] border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading transactions...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : transactionList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                                                ) : (
                            transactionList.map((tx: Transaction) => (
                                <TableRow 
                                    key={tx.id} 
                                    className="h-20 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                                    onClick={() => setSelectedTransaction(tx)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span className="whitespace-nowrap">{tx.date}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-mono">{tx.id.slice(0, 8)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={tx.type === 'offer_redemption' ? 'default' : 'secondary'}
                                            className={tx.type === 'offer_redemption' ? 'bg-[#18B852] hover:bg-[#18B852]/90' : 'bg-blue-500 hover:bg-blue-500/90'}
                                        >
                                            {tx.type.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{tx.vendorName}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-gray-900">{tx.totalAmount}</span>
                                            {tx.finalAmount !== undefined && tx.finalAmount !== parseInt(tx.totalAmount.replace(/[^\d]/g, '')) && (
                                                <span className="text-[10px] text-muted-foreground line-through">
                                                    QAR {tx.totalAmount}
                                                </span>
                                            )}
                                            {tx.discountAmount !== undefined && tx.discountAmount > 0 && (
                                                <span className="text-[10px] text-red-500">
                                                    -{tx.discountAmount} {tx.discountType === 'percentage' ? '%' : 'off'}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {tx.type === 'offer_redemption' ? (
                                            <div className="flex flex-col items-end">
                                                {tx.cashbackAmount !== undefined && (
                                                    <span className="font-bold text-green-600">
                                                        +QAR {tx.cashbackAmount}
                                                    </span>
                                                )}
                                                {tx.creatorCode && (
                                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-100">
                                                        Code: {tx.creatorCode}
                                                    </span>
                                                )}
                                            </div>
                                        ) : tx.type === 'giftcard_redemption' ? (
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-blue-600">
                                                    -QAR {tx.redemptionCardAmount}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Rem: QAR {tx.remainingAmount}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(tx)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple Pagination */}
            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/transactions/"
                        search={(prev: any) => ({
                            ...prev,
                            page: Math.max(1, page - 1),
                        })}
                        disabled={!hasPrevPage}
                        className={!hasPrevPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasPrevPage}
                        >
                            ‹ Previous
                        </Button>
                    </Link>

                    <div className="text-sm font-medium text-muted-foreground">
                        Page {page}
                    </div>

                    <Link
                        from="/admin/transactions/"
                        search={(prev: any) => ({
                            ...prev,
                            page: page + 1,
                        })}
                        disabled={!hasNextPage}
                        className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-auto px-4 gap-2 text-sm font-medium"
                            disabled={!hasNextPage}
                        >
                            Next ›
                        </Button>
                    </Link>
                </div>
            )}

            {/* Transaction Details Dialog */}
            <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-[#18B852]" />
                            Transaction Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTransaction && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Transaction ID</p>
                                    <p className="font-mono text-sm">{selectedTransaction.id}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Date</p>
                                    <p className="text-sm">{selectedTransaction.date}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-gray-900">{selectedTransaction.vendorName}</span>
                                    </div>
                                    <Badge 
                                        className={selectedTransaction.type === 'offer_redemption' ? 'bg-[#18B852]' : 'bg-blue-500'}
                                    >
                                        {selectedTransaction.type.replace(/_/g, ' ')}
                                    </Badge>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Original Total</span>
                                        <span>{selectedTransaction.totalAmount}</span>
                                    </div>
                                    
                                    {selectedTransaction.type === 'offer_redemption' && (
                                        <>
                                            {selectedTransaction.discountAmount && (
                                                <div className="flex justify-between text-sm text-red-500">
                                                    <span>Discount ({selectedTransaction.discountType})</span>
                                                    <span>-QAR {selectedTransaction.discountAmount}</span>
                                                </div>
                                            )}
                                            <Separator className="my-2" />
                                            <div className="flex justify-between font-bold">
                                                <span>Final Amount</span>
                                                <span>QAR {selectedTransaction.finalAmount}</span>
                                            </div>
                                        </>
                                    )}

                                    {selectedTransaction.type === 'giftcard_redemption' && (
                                        <>
                                            <div className="flex justify-between text-sm text-blue-500">
                                                <span>Card Amount Used</span>
                                                <span>-QAR {selectedTransaction.redemptionCardAmount}</span>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Remaining Balance</span>
                                                <span className="font-medium text-gray-900">QAR {selectedTransaction.remainingAmount}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {selectedTransaction.type === 'offer_redemption' && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-semibold">Rewards & Cashback</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-green-50/50 p-4 rounded-lg border border-green-100">
                                        <div className="space-y-1">
                                            <p className="text-xs text-green-700 uppercase font-semibold">User Cashback</p>
                                            <p className="font-bold text-green-600">QAR {selectedTransaction.cashbackAmount || 0}</p>
                                        </div>
                                        {selectedTransaction.creatorCode && (
                                            <div className="space-y-1 text-right">
                                                <p className="text-xs text-orange-700 uppercase font-semibold">Creator Earned</p>
                                                <p className="font-bold text-orange-600">QAR {selectedTransaction.creatorCashbackAmount || 0}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {selectedTransaction.creatorCode && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4" />
                                            <span>Used Code: <span className="font-bold text-gray-900">{selectedTransaction.creatorCode}</span></span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 text-[10px] text-muted-foreground text-center">
                                PIN: {selectedTransaction.pin || 'N/A'} • User: {selectedTransaction.userId?.slice(0, 8)}...
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
