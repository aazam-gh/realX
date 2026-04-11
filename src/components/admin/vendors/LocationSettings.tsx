import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"
import type { Vendor } from "@/queries"

interface LocationSettingsProps {
    formData: Vendor
    setFormData: (val: Vendor) => void
    vendorId: string
}

export function LocationSettings({ formData, setFormData }: LocationSettingsProps) {
    const hasCoordinates = typeof formData.latitude === 'number' && typeof formData.longitude === 'number'
    const latValid = formData.latitude == null || (formData.latitude >= -90 && formData.latitude <= 90)
    const lngValid = formData.longitude == null || (formData.longitude >= -180 && formData.longitude <= 180)

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Latitude */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Latitude</Label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="25.2854"
                        value={formData.latitude ?? ""}
                        onChange={(e) => {
                            const val = e.target.value === "" ? undefined : parseFloat(e.target.value)
                            setFormData({ ...formData, latitude: val })
                        }}
                        className={`bg-slate-50 border-none ring-0 focus-visible:ring-1 h-14 rounded-2xl px-5 text-sm ${!latValid ? 'focus-visible:ring-red-400' : 'focus-visible:ring-blue-400'}`}
                    />
                    {!latValid && (
                        <p className="text-xs text-red-500">Latitude must be between -90 and 90</p>
                    )}
                </div>

                {/* Longitude */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Longitude</Label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="51.5310"
                        value={formData.longitude ?? ""}
                        onChange={(e) => {
                            const val = e.target.value === "" ? undefined : parseFloat(e.target.value)
                            setFormData({ ...formData, longitude: val })
                        }}
                        className={`bg-slate-50 border-none ring-0 focus-visible:ring-1 h-14 rounded-2xl px-5 text-sm ${!lngValid ? 'focus-visible:ring-red-400' : 'focus-visible:ring-blue-400'}`}
                    />
                    {!lngValid && (
                        <p className="text-xs text-red-500">Longitude must be between -180 and 180</p>
                    )}
                </div>

                {/* Address English */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Address (English)</Label>
                    <Input
                        placeholder="Villaggio Mall, Level 2"
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Address Arabic */}
                <div className="space-y-4 text-right">
                    <Label className="text-base font-semibold text-slate-700">Address (Arabic)</Label>
                    <Input
                        placeholder="فيلاجيو مول، الطابق الثاني"
                        value={formData.addressAr || ""}
                        onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                        dir="rtl"
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                    />
                </div>

                {/* Geohash display */}
                <div className="space-y-4 md:col-span-2">
                    <Label className="text-base font-semibold text-slate-700">Geohash</Label>
                    <div className="flex items-center gap-2 bg-slate-50 h-14 rounded-2xl px-5 text-sm text-slate-500">
                        <MapPin className="w-4 h-4" />
                        <span className="font-mono">
                            {formData.geohash || "Will be computed on save"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Map preview */}
            {hasCoordinates && latValid && lngValid && (
                <div className="rounded-2xl overflow-hidden border border-slate-100">
                    <iframe
                        title="Location Preview"
                        width="100%"
                        height="300"
                        frameBorder="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.longitude! - 0.005},${formData.latitude! - 0.005},${formData.longitude! + 0.005},${formData.latitude! + 0.005}&layer=mapnik&marker=${formData.latitude},${formData.longitude}`}
                    />
                </div>
            )}
        </div>
    )
}
