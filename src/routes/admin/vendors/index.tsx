import { createFileRoute, Link } from '@tanstack/react-router'
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
import { Search, Upload, Plus, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { db, functions } from '@/firebase/config'
import { collection, getDocs, query } from 'firebase/firestore'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'


export const Route = createFileRoute('/admin/vendors/')({
    component: RouteComponent,
})

interface Vendor {
    id: string
    name: string
    status: 'Active' | 'Inactive'
    contact: string
    // mainOffer: string
    offersCount: number
    logoURL?: string
}



function RouteComponent() {
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })

    const { data: vendorList = [], isLoading: isQueryLoading } = useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            console.log('Fetching vendors...')
            const q = query(collection(db, 'vendors'))
            const snapshot = await getDocs(q)
            return snapshot.docs.map((doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    name: data.name || 'Unnamed Vendor',
                    status: data.status ? ('Active' as const) : ('Inactive' as const),
                    contact: data.phoneNumber?.toString() || data.contact || '',
                    offersCount: data.offers || 0,
                    logoURL: data.logoURL || '',
                } as Vendor
            })
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })


    const addVendorMutation = useMutation({
        mutationFn: async (formData: typeof form) => {
            const createVendorUser = httpsCallable(functions, 'createVendorUser')
            const result = await createVendorUser({
                vendorName: formData.name,
                email: formData.email,
                password: formData.password,
            })
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
            setForm({ name: '', email: '', password: '' })
            setOpen(false)
        },
        onError: (error) => {
            console.error('Error adding vendor: ', error)
            alert('Failed to add vendor: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    })

    const loading = isQueryLoading || addVendorMutation.isPending

    const handleAddVendor = async () => {
        if (!form.name || !form.email || !form.password) return
        addVendorMutation.mutate(form)
    }

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <h1 className="text-3xl font-bold tracking-tight">Vendor Overview</h1>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for vendors"
                        className="pl-9 bg-muted/50 border-none h-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white gap-2 h-10">
                                <Plus className="h-4 w-4" /> Add New Vendor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Vendor</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Vendor Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Enter vendor name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="Enter email address"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Enter password"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                                    onClick={handleAddVendor}
                                >
                                    Add Vendor
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Select defaultValue="alphabetical">
                        <SelectTrigger className="w-[180px] h-10 bg-muted/50 border-none">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alphabetical">Sort by: Alphabetical</SelectItem>
                            <SelectItem value="newest">Sort by: Newest</SelectItem>
                            <SelectItem value="oldest">Sort by: Oldest</SelectItem>
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
                            <TableHead className="text-black font-bold text-base">Brand Name</TableHead>
                            <TableHead className="text-black font-bold text-base">Status</TableHead>
                            <TableHead className="text-black font-bold text-base">Contact Info</TableHead>
                            {/* <TableHead className="text-black font-bold text-base">Main Offer</TableHead> */}
                            <TableHead className="text-black font-bold text-base text-center">Number of Offers</TableHead>
                            <TableHead className="text-black font-bold text-base text-right pr-8">Actions:</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading vendors...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : vendorList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    No vendors found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            vendorList.map((vendor) => (
                                <TableRow key={vendor.id} className="h-16 border-b border-gray-100 hover:bg-gray-50/50">
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {vendor.logoURL ? (
                                                <img src={vendor.logoURL} alt={vendor.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                    <span className="text-gray-400 text-xs font-bold">{vendor.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="font-medium text-base">{vendor.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`font-medium ${vendor.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                                            {vendor.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">{vendor.contact}</TableCell>
                                    {/* <TableCell className="font-medium text-gray-900">{vendor.mainOffer}</TableCell> */}
                                    <TableCell className="text-center font-medium text-gray-900">{vendor.offersCount}</TableCell>
                                    <TableCell className="text-right">
                                        {/* <Link from={Route.fullPath} to="settings">
                                            <Button variant="outline" size="sm" className="rounded-full h-8 px-4 gap-1 text-xs font-semibold">
                                                Manage <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        </Link> */}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
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
                <Button size="sm" className="h-8 w-8 p-0 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
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
