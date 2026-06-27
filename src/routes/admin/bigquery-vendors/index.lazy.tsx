import { createLazyFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown, Database, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { STALE_TIME } from '@/lib/constants'
import type { Vendor } from '@/queries'
import {
    fetchBigQueryVendors,
    type BigQueryVendorSearch,
    type BigQueryVendorSort,
} from './index'

export const Route = createLazyFileRoute('/admin/bigquery-vendors/')({
    component: BigQueryVendorsRoute,
})

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

function SortIcon({ field, sort }: { field: 'name' | 'category'; sort?: string }) {
    if (!sort || !sort.startsWith(field)) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sort.endsWith('asc')
        ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-blue-500" />
        : <ArrowDown className="ml-1 h-3.5 w-3.5 text-blue-500" />
}

function BigQueryVendorsRoute() {
    const searchParams = useSearch({ from: '/admin/bigquery-vendors/' })
    const { page, pageSize, search, vendorType, xcard, sort, cursor, history } = searchParams
    const navigate = useNavigate()
    const { data, isLoading, error } = useQuery({
        queryKey: ['bigquery-vendors-list', pageSize, search, vendorType, xcard, sort, cursor],
        queryFn: () => fetchBigQueryVendors(pageSize, search, vendorType, xcard, sort, cursor),
        staleTime: STALE_TIME.MEDIUM,
    })

    const updateSearch = (updates: Partial<BigQueryVendorSearch>) => {
        const nextSearch: BigQueryVendorSearch = {
            page: 1,
            pageSize,
        }
        const nextSearchText = Object.hasOwn(updates, 'search') ? updates.search : search
        const nextVendorType = Object.hasOwn(updates, 'vendorType') ? updates.vendorType : vendorType
        const nextXcard = Object.hasOwn(updates, 'xcard') ? updates.xcard : xcard
        const nextSort = Object.hasOwn(updates, 'sort') ? updates.sort : sort

        if (nextSearchText) nextSearch.search = nextSearchText
        if (nextVendorType) nextSearch.vendorType = nextVendorType
        if (nextXcard) nextSearch.xcard = nextXcard
        if (nextSort) nextSearch.sort = nextSort

        navigate({
            to: '/admin/bigquery-vendors',
            search: nextSearch,
        })
    }

    const toggleSort = (field: 'name' | 'category') => {
        const next = !sort || !sort.startsWith(field) || sort.endsWith('asc')
            ? `${field}_desc`
            : `${field}_asc`
        updateSearch({ sort: next as BigQueryVendorSort })
    }

    const goNext = () => {
        if (!data?.nextCursor) return
        const cursorHistory = history ? history.split('.') : []
        const nextSearch: BigQueryVendorSearch = {
            page: page + 1,
            pageSize,
            cursor: data.nextCursor,
            history: [...cursorHistory, cursor || 'first'].join('.'),
        }

        if (search) nextSearch.search = search
        if (vendorType) nextSearch.vendorType = vendorType
        if (xcard) nextSearch.xcard = xcard
        if (sort) nextSearch.sort = sort

        navigate({
            to: '/admin/bigquery-vendors',
            search: nextSearch,
        })
    }

    const goPrevious = () => {
        const cursorHistory = history ? history.split('.') : []
        const previous = cursorHistory.pop()
        const previousSearch: BigQueryVendorSearch = {
            page: Math.max(1, page - 1),
            pageSize,
        }

        if (search) previousSearch.search = search
        if (vendorType) previousSearch.vendorType = vendorType
        if (xcard) previousSearch.xcard = xcard
        if (sort) previousSearch.sort = sort
        if (previous && previous !== 'first') previousSearch.cursor = previous
        if (cursorHistory.length) previousSearch.history = cursorHistory.join('.')

        navigate({
            to: '/admin/bigquery-vendors',
            search: previousSearch,
        })
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-8">
            <div className="flex items-center gap-3">
                <div className="rounded bg-blue-50 p-2"><Database className="h-5 w-5 text-blue-600" /></div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BigQuery Vendors</h1>
                    <p className="text-sm text-muted-foreground">Separate read-only BigQuery vendor evaluation page. Vendor mutations remain Firestore-backed.</p>
                </div>
            </div>

            {data && (
                <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">Query: {data.query.durationMs} ms</Badge>
                    <Badge variant="secondary">Processed: {formatBytes(data.query.bytesProcessed)}</Badge>
                    <Badge variant="secondary">Billed: {formatBytes(data.query.bytesBilled)}</Badge>
                    <Badge variant="secondary">{data.query.cacheHit ? 'Cache hit' : 'Cache miss'}</Badge>
                    <Badge variant="outline">
                        Freshness: {data.freshness ? new Date(data.freshness).toLocaleString() : 'No exported rows'}
                    </Badge>
                </div>
            )}

            <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search vendors..."
                        className="h-10 border-none bg-muted/50 pl-9"
                        value={search || ''}
                        onChange={(event) => updateSearch({ search: event.target.value || undefined })}
                    />
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                    <Select value={vendorType || 'all'} onValueChange={(value) => updateSearch({ vendorType: value as BigQueryVendorSearch['vendorType'] })}>
                        <SelectTrigger className="h-10 w-full border-none bg-muted/50 sm:w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Vendors</SelectItem>
                            <SelectItem value="in_store">In-store</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={xcard || 'all'} onValueChange={(value) => updateSearch({ xcard: value as BigQueryVendorSearch['xcard'] })}>
                        <SelectTrigger className="h-10 w-full border-none bg-muted/50 sm:w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Xcard</SelectItem>
                            <SelectItem value="enabled">Xcard Enabled</SelectItem>
                            <SelectItem value="disabled">Xcard Disabled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sort || 'name_asc'} onValueChange={(value) => updateSearch({ sort: value as BigQueryVendorSort })}>
                        <SelectTrigger className="h-10 w-full border-none bg-muted/50 sm:w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name_asc">Name: A-Z</SelectItem>
                            <SelectItem value="name_desc">Name: Z-A</SelectItem>
                            <SelectItem value="category_asc">Category: A-Z</SelectItem>
                            <SelectItem value="category_desc">Category: Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="cursor-pointer font-bold text-black" onClick={() => toggleSort('name')}>
                                <span className="inline-flex items-center">Vendor <SortIcon field="name" sort={sort} /></span>
                            </TableHead>
                            <TableHead className="font-bold text-black">Contact</TableHead>
                            <TableHead className="font-bold text-black">Type</TableHead>
                            <TableHead className="cursor-pointer font-bold text-black" onClick={() => toggleSort('category')}>
                                <span className="inline-flex items-center">Category <SortIcon field="category" sort={sort} /></span>
                            </TableHead>
                            <TableHead className="font-bold text-black">Xcard</TableHead>
                            <TableHead className="font-bold text-black">Trending</TableHead>
                            <TableHead className="text-right font-bold text-black">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center">Loading BigQuery vendors...</TableCell></TableRow>
                        ) : error ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center text-red-600">{error.message}</TableCell></TableRow>
                        ) : !data?.vendors.length ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No exported vendors found.</TableCell></TableRow>
                        ) : data.vendors.map((vendor: Vendor) => (
                            <TableRow
                                key={vendor.id}
                                className="h-20 cursor-pointer border-b border-gray-100 hover:bg-gray-50/50"
                                onClick={() => navigate({
                                    to: '/admin/vendors/$vendorId/settings',
                                    params: { vendorId: vendor.id },
                                    search: { page: 1, pageSize: 10 },
                                })}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{vendor.name}</span>
                                        <span className="font-mono text-[10px] text-muted-foreground">ID: {vendor.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{vendor.contact || 'N/A'}</span>
                                    </div>
                                </TableCell>
                                <TableCell><Badge className="w-fit">{vendor.vendorType?.replace(/_/g, ' ') || 'in store'}</Badge></TableCell>
                                <TableCell>{vendor.mainCategory || 'N/A'}</TableCell>
                                <TableCell>{vendor.xcard ? <Badge variant="secondary">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}</TableCell>
                                <TableCell>{vendor.isTrending ? <Badge>Trending</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild onClick={(event) => event.stopPropagation()}>
                                        <Link
                                            to="/admin/vendors/$vendorId/settings"
                                            params={{ vendorId: vendor.id }}
                                            search={{ page: 1, pageSize: 10 }}
                                        >
                                            Manage
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {(page > 1 || Boolean(data?.nextCursor)) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={goPrevious}>‹ Previous</Button>
                    <span className="text-sm font-medium text-muted-foreground">Page {page}</span>
                    <Button variant="outline" size="sm" disabled={!data?.nextCursor} onClick={goNext}>Next ›</Button>
                </div>
            )}
        </div>
    )
}
