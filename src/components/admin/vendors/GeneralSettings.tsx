import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Phone, Globe } from 'lucide-react'

import type { Vendor } from '@/routes/admin/vendors/$vendorId.settings'

interface GeneralSettingsProps {
    formData: Vendor | null
    setFormData: (val: any) => void
}

export function GeneralSettings({ formData, setFormData }: GeneralSettingsProps) {
    if (!formData) return null

    return (
        <div className="space-y-6">
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
                                value={formData?.name || ''}
                                onChange={(e) => setFormData((prev: any) => prev ? ({ ...prev, name: e.target.value }) : null)}
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
                                    onChange={(e) => setFormData((prev: any) => prev ? ({ ...prev, email: e.target.value }) : null)}
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
                                    onChange={(e) => setFormData((prev: any) => prev ? ({ ...prev, phoneNumber: e.target.value }) : null)}
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
                                    onChange={(e) => setFormData((prev: any) => prev ? ({ ...prev, website: e.target.value }) : null)}
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
                            onCheckedChange={(checked) => setFormData((prev: any) => prev ? ({ ...prev, status: checked ? 'Active' : 'Inactive' }) : null)}
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
                            onCheckedChange={(checked) => setFormData((prev: any) => prev ? ({ ...prev, isFeatured: !!checked }) : null)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
