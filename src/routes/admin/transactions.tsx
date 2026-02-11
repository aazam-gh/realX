import { createFileRoute } from '@tanstack/react-router'
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
import { Search, Upload } from 'lucide-react'

export const Route = createFileRoute('/admin/transactions')({
  component: RouteComponent,
})

interface Transaction {
  id: string
  date: string
  transactionId: string
  fullName: string
  totalBill: string
  vendorName: string
  isSelected?: boolean
}

const transactions: Transaction[] = [
  {
    id: '1',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY294',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 67',
    vendorName: 'Tim Hortons',
    isSelected: true,
  },
  {
    id: '2',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Krispy Kreme',
  },
  {
    id: '3',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Krispy Kreme',
  },
  {
    id: '4',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Krispy Kreme',
  },
  {
    id: '5',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Krispy Kreme',
  },
  {
    id: '6',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Tim Hortons',
  },
  {
    id: '7',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Tim Hortons',
  },
  {
    id: '8',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Tim Hortons',
  },
  {
    id: '9',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Krispy Kreme',
  },
  {
    id: '10',
    date: 'Apr 1 at 3:34am',
    transactionId: 'WAQTSHAIY384',
    fullName: 'Ahmed Shabaneh',
    totalBill: 'QAR 12',
    vendorName: 'Tim Hortons',
  },
]

function RouteComponent() {
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
              <TableHead className="text-black font-bold text-base">Transaction ID</TableHead>
              <TableHead className="text-black font-bold text-base">Full Name</TableHead>
              <TableHead className="text-black font-bold text-base">Total Bill</TableHead>
              <TableHead className="text-black font-bold text-base text-right pr-8">Vendor Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="h-16 border-b border-gray-100 hover:bg-gray-50/50">
                <TableCell>
                  <Checkbox
                    className={tx.isSelected ? "bg-[#18B852] border-[#18B852] text-white" : ""}
                    checked={tx.isSelected}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900">{tx.date}</TableCell>
                <TableCell className="font-medium text-gray-900">{tx.transactionId}</TableCell>
                <TableCell className="font-medium text-gray-900">{tx.fullName}</TableCell>
                <TableCell className="font-bold text-gray-900">{tx.totalBill}</TableCell>
                <TableCell className="text-right font-medium text-gray-900 pr-8">{tx.vendorName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <Button variant="outline" size="sm" className="h-8 w-auto px-3 text-xs text-gray-500">
          « First
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-auto px-3 text-xs text-gray-500">
          ‹ Back
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs text-gray-500">
          1
        </Button>
        <Button size="sm" className="h-8 w-8 p-0 text-xs bg-[#18B852] hover:bg-[#18B852] text-white">
          2
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs text-gray-500">
          3
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs text-gray-500">
          4
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs text-gray-500" disabled>
          ...
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-xs text-gray-500">
          25
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-auto px-3 text-xs text-gray-500">
          Next ›
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-auto px-3 text-xs text-gray-500">
          Last »
        </Button>
      </div>
    </div>
  )
}
