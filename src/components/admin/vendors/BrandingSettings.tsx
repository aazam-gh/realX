import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload, X, Phone, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/firebase/config"

interface BrandingSettingsProps {
    formData: any
    setFormData: (val: any) => void
    vendorId: string
}

export function BrandingSettings({ formData, setFormData, vendorId }: BrandingSettingsProps) {
    const [keywordInputEn, setKeywordInputEn] = useState("")
    const [keywordInputAr, setKeywordInputAr] = useState("")
    const [tagInputEn, setTagInputEn] = useState("")
    const [tagInputAr, setTagInputAr] = useState("")
    const [uploadingProfile, setUploadingProfile] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const profileInputRef = useRef<HTMLInputElement>(null)
    const coverInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profilePicture' | 'coverImage') => {
        const file = e.target.files?.[0]
        if (!file) return

        const isProfile = type === 'profilePicture'
        if (isProfile) setUploadingProfile(true)
        else setUploadingCover(true)

        try {
            const extension = file.name.split('.').pop()
            const fileName = type === 'profilePicture' ? 'logo' : 'banner'
            const storagePath = `vendors/${vendorId}/branding/${fileName}.${extension}`
            const storageRef = ref(storage, storagePath)
            const snapshot = await uploadBytes(storageRef, file)
            const downloadURL = await getDownloadURL(snapshot.ref)

            setFormData({ ...formData, [type]: downloadURL })
        } catch (error) {
            console.error("Upload failed:", error)
        } finally {
            if (isProfile) setUploadingProfile(false)
            else setUploadingCover(false)
        }
    }

    const handleAddKeywordEn = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && keywordInputEn.trim()) {
            e.preventDefault()
            const keywords = formData.keywordsEn || []
            if (!keywords.includes(keywordInputEn.trim())) {
                setFormData({ ...formData, keywordsEn: [...keywords, keywordInputEn.trim()] })
            }
            setKeywordInputEn("")
        }
    }

    const handleRemoveKeywordEn = (keyword: string) => {
        setFormData({
            ...formData,
            keywordsEn: (formData.keywordsEn || []).filter((k: string) => k !== keyword)
        })
    }

    const handleAddKeywordAr = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && keywordInputAr.trim()) {
            e.preventDefault()
            const keywords = formData.keywordsAr || []
            if (!keywords.includes(keywordInputAr.trim())) {
                setFormData({ ...formData, keywordsAr: [...keywords, keywordInputAr.trim()] })
            }
            setKeywordInputAr("")
        }
    }

    const handleRemoveKeywordAr = (keyword: string) => {
        setFormData({
            ...formData,
            keywordsAr: (formData.keywordsAr || []).filter((k: string) => k !== keyword)
        })
    }

    const handleAddTagEn = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInputEn.trim()) {
            e.preventDefault()
            const tags = formData.tagsEn || []
            if (!tags.includes(tagInputEn.trim())) {
                setFormData({ ...formData, tagsEn: [...tags, tagInputEn.trim()] })
            }
            setTagInputEn("")
        }
    }

    const handleRemoveTagEn = (tag: string) => {
        setFormData({
            ...formData,
            tagsEn: (formData.tagsEn || []).filter((t: string) => t !== tag)
        })
    }

    const handleAddTagAr = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInputAr.trim()) {
            e.preventDefault()
            const tags = formData.tagsAr || []
            if (!tags.includes(tagInputAr.trim())) {
                setFormData({ ...formData, tagsAr: [...tags, tagInputAr.trim()] })
            }
            setTagInputAr("")
        }
    }

    const handleRemoveTagAr = (tag: string) => {
        setFormData({
            ...formData,
            tagsAr: (formData.tagsAr || []).filter((t: string) => t !== tag)
        })
    }

    return (
        <div className="space-y-8">
            <div className="flex gap-8">
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Profile Picture</Label>
                    <div className="relative w-36 h-36">
                        <input
                            type="file"
                            ref={profileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'profilePicture')}
                        />
                        <div className={`w-full h-full rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all ${formData.profilePicture ? 'bg-transparent' : 'bg-slate-50 border border-slate-100 shadow-sm'}`}>
                            {uploadingProfile ? (
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            ) : formData.profilePicture ? (
                                <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Upload className="w-8 h-8 text-slate-300" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => profileInputRef.current?.click()}
                            disabled={uploadingProfile}
                            className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <Label className="text-base font-semibold text-slate-700">Cover Image</Label>
                    <div className="relative h-36 w-full max-w-2xl group">
                        <input
                            type="file"
                            ref={coverInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'coverImage')}
                        />
                        <div className={`w-full h-full rounded-[2.5rem] flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-200 ${formData.coverImage ? 'bg-transparent' : 'bg-slate-50 border border-slate-100 shadow-sm'}`}>
                            {uploadingCover ? (
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            ) : formData.coverImage ? (
                                <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                            className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-slate-500" />
                        </button>
                        <Button
                            variant="secondary"
                            type="button"
                            className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-xs h-8 rounded-full shadow-sm"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover}
                        >
                            {uploadingCover ? 'Uploading...' : 'Change Cover'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Brand Name */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Brand Name (English & Arabic)</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            placeholder="Tim Hortons"
                            value={formData.name || ""}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                        />
                        <Input
                            placeholder="تيم هورتنز"
                            value={formData.nameAr || ""}
                            onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                            dir="rtl"
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 h-14 rounded-2xl px-5 text-sm"
                        />
                    </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="+974 4432 9958"
                            value={formData.phoneNumber || ""}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 pl-12 h-14 rounded-2xl text-sm"
                        />
                    </div>
                </div>

                {/* Short Description */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Short Description (English)</Label>
                    <Textarea
                        placeholder="Tim Hortons"
                        value={formData.shortDescriptionEn || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescriptionEn: e.target.value })}
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 min-h-[160px] rounded-2xl p-5 text-sm"
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Short Description (Arabic)</Label>
                    <Textarea
                        placeholder="Tim Hortons"
                        value={formData.shortDescriptionAr || ""}
                        onChange={(e) => setFormData({ ...formData, shortDescriptionAr: e.target.value })}
                        dir="rtl"
                        className="bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-400 min-h-[160px] rounded-2xl p-5 text-sm"
                    />
                </div>

                {/* Keywords */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Keywords (For Search & Filtering)</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[56px] border border-transparent focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                        {(formData.keywordsEn || []).map((keyword: string) => (
                            <Badge key={keyword} variant="secondary" className="gap-2 bg-white hover:bg-white text-slate-600 py-1.5 px-3 rounded-xl border border-slate-100 shadow-sm text-xs font-medium">
                                {keyword}
                                <X className="w-3.5 h-3.5 cursor-pointer text-red-500 hover:text-red-600 transition-colors" onClick={() => handleRemoveKeywordEn(keyword)} />
                            </Badge>
                        ))}
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] px-2 text-slate-600 placeholder:text-slate-400"
                            placeholder="Add keyword..."
                            value={keywordInputEn}
                            onChange={(e) => setKeywordInputEn(e.target.value)}
                            onKeyDown={handleAddKeywordEn}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Keywords (Arabic)</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[56px] border border-transparent focus-within:ring-1 focus-within:ring-blue-400 transition-all" dir="rtl">
                        {(formData.keywordsAr || []).map((keyword: string) => (
                            <Badge key={keyword} variant="secondary" className="gap-2 bg-white hover:bg-white text-slate-600 py-1.5 px-3 rounded-xl border border-slate-100 shadow-sm text-xs font-medium">
                                {keyword}
                                <X className="w-3.5 h-3.5 cursor-pointer text-red-500 hover:text-red-600 transition-colors" onClick={() => handleRemoveKeywordAr(keyword)} />
                            </Badge>
                        ))}
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] px-2 text-slate-600 placeholder:text-slate-400"
                            placeholder="اضافة كلمة..."
                            value={keywordInputAr}
                            onChange={(e) => setKeywordInputAr(e.target.value)}
                            onKeyDown={handleAddKeywordAr}
                        />
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Tags</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[56px] border border-transparent focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                        {(formData.tagsEn || []).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="gap-2 bg-white hover:bg-white text-slate-600 py-1.5 px-3 rounded-xl border border-slate-100 shadow-sm text-xs font-medium">
                                {tag}
                                <X className="w-3.5 h-3.5 cursor-pointer text-red-500 hover:text-red-600 transition-colors" onClick={() => handleRemoveTagEn(tag)} />
                            </Badge>
                        ))}
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] px-2 text-slate-600 placeholder:text-slate-400"
                            placeholder="Add tag..."
                            value={tagInputEn}
                            onChange={(e) => setTagInputEn(e.target.value)}
                            onKeyDown={handleAddTagEn}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-semibold text-slate-700">Tags (Arabic)</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl min-h-[56px] border border-transparent focus-within:ring-1 focus-within:ring-blue-400 transition-all" dir="rtl">
                        {(formData.tagsAr || []).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="gap-2 bg-white hover:bg-white text-slate-600 py-1.5 px-3 rounded-xl border border-slate-100 shadow-sm text-xs font-medium">
                                {tag}
                                <X className="w-3.5 h-3.5 cursor-pointer text-red-500 hover:text-red-600 transition-colors" onClick={() => handleRemoveTagAr(tag)} />
                            </Badge>
                        ))}
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] px-2 text-slate-600 placeholder:text-slate-400"
                            placeholder="اضافة تاغ..."
                            value={tagInputAr}
                            onChange={(e) => setTagInputAr(e.target.value)}
                            onKeyDown={handleAddTagAr}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
