import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/firebase/config'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Globe, Mail, Phone, Shield } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/admin/vendors/$vendorId/settings')({
    component: VendorSettingsComponent
})

interface Vendor {
    id: string
    name?: string
    vendorName?: string
    email?: string
    phoneNumber?: string
    website?: string
    status?: string
    isFeatured?: boolean
}

function VendorSettingsComponent() {
    const { vendorId } = Route.useParams()
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState<Vendor | null>(null)

    const { data: vendor, isLoading } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: async () => {
            const docRef = doc(db, 'vendors', vendorId)
            const snapshot = await getDoc(docRef)
            if (!snapshot.exists()) {
                throw new Error('Vendor not found')
            }
            return { id: snapshot.id, ...snapshot.data() } as Vendor
        }
    })

    useEffect(() => {
        if (vendor) {
            setFormData(vendor)
        }
    }, [vendor])

    const updateMutation = useMutation({
        mutationFn: async (updatedData: Partial<Vendor>) => {
            const { id, ...dataToUpdate } = updatedData
            const docRef = doc(db, 'vendors', vendorId)
            await updateDoc(docRef, dataToUpdate)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
            alert('Settings updated successfully!')
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
            </div>
        )
    }

    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>

    const handleSave = () => {
        if (formData) {
            updateMutation.mutate(formData)
        }
    }

    return (
        <div className="p-8 space-y-6 w-full max-w-[1200px] mx-auto">
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/vendors"
                    search={{ page: 1, pageSize: 10 }}
                    className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Settings</h1>
                    <p className="text-muted-foreground">Manage configuration for {vendor?.name || vendor?.vendorName || 'Unnamed Vendor'}</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="offers">Offers</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update vendor profile details and contact information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Brand Name</Label>
                                    <Input
                                        id="name"
                                        value={formData?.name || formData?.vendorName || ''}
                                        onChange={(e) => setFormData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Business Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            className="pl-9"
                                            value={formData?.email || ''}
                                            onChange={(e) => setFormData(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            className="pl-9"
                                            value={formData?.phoneNumber || ''}
                                            onChange={(e) => setFormData(prev => prev ? ({ ...prev, phoneNumber: e.target.value }) : null)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="website"
                                            className="pl-9"
                                            placeholder="https://example.com"
                                            value={formData?.website || ''}
                                            onChange={(e) => setFormData(prev => prev ? ({ ...prev, website: e.target.value }) : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Status & Visibility</CardTitle>
                            <CardDescription>Control how the vendor appears to customers.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base cursor-pointer" htmlFor="active-status">Active Status</Label>
                                    <p className="text-sm text-muted-foreground">Is this vendor currently active and accepting offers?</p>
                                </div>
                                <Checkbox
                                    id="active-status"
                                    checked={formData?.status === 'Active'}
                                    onCheckedChange={(checked) => setFormData(prev => prev ? ({ ...prev, status: checked ? 'Active' : 'Inactive' }) : null)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base cursor-pointer" htmlFor="featured">Featured Vendor</Label>
                                    <p className="text-sm text-muted-foreground">Highlight this vendor in the discovery section.</p>
                                </div>
                                <Checkbox
                                    id="featured"
                                    checked={formData?.isFeatured || false}
                                    onCheckedChange={(checked) => setFormData(prev => prev ? ({ ...prev, isFeatured: !!checked }) : null)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="branding" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>Choose what updates the vendor receives.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Email Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Receive emails for new transactions.</p>
                                </div>
                                <Checkbox defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">System Messages</Label>
                                    <p className="text-sm text-muted-foreground">Get notified about platform updates.</p>
                                </div>
                                <Checkbox defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="offers" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Offers</CardTitle>
                            <CardDescription>Manage account security and access control.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base">Two-Factor Authentication</Label>
                                        <Shield className="h-4 w-4 text-green-500" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Add an extra layer of security to the account.</p>
                                </div>
                                <Button variant="outline">Enable</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setFormData(vendor)}>Reset Changes</Button>
                <Button
                    className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white gap-2"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                >
                    <Save className="h-4 w-4" />
                    {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    )
}
