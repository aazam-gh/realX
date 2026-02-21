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
import { Search, Upload, Plus, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useState, useRef } from 'react'
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
import { collection, getDocs, query, limit, orderBy, getCountFromServer, startAt } from 'firebase/firestore'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'

export const Route = createLazyFileRoute('/admin/students/')({
    component: RouteComponent,
})

interface Student {
    id: string
    firstName: string
    lastName: string
    name: string
    contact: string
    isVerified: boolean
    creatorCode: string
    profilePicture?: string
}

function RouteComponent() {
    const queryClient = useQueryClient()
    const { page, pageSize } = useSearch({ from: '/admin/students/' })
    const cursors = useRef<Record<number, string>>({})
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })

    const { data, isLoading: isQueryLoading } = useQuery({
        queryKey: ['students', page, pageSize],
        queryFn: async () => {
            console.log(`Loading page ${page}...`)
            const collRef = collection(db, 'students')

            const countSnapshot = await getCountFromServer(collRef)
            const totalCount = countSnapshot.data().count

            // Check if we have a cursor for THIS page
            const currentCursor = cursors.current[page]

            let q;
            if (currentCursor) {
                q = query(
                    collRef,
                    orderBy('firstName'),
                    startAt(currentCursor),
                    limit(pageSize)
                )
            } else {
                q = query(
                    collRef,
                    orderBy('firstName'),
                    limit(page * pageSize)
                )
            }

            const snapshot = await getDocs(q)

            const pageDocs = currentCursor
                ? snapshot.docs
                : snapshot.docs.slice((page - 1) * pageSize);

            const students = await Promise.all(pageDocs.map(async (doc) => {
                const data = doc.data()
                return {
                    id: doc.id,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    name: (data.firstName || data.lastName) ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : (data.name || 'Unnamed Student'),
                    contact: data.email || data.phoneNumber || 'No contact',
                    isVerified: !!data.isVerified,
                    creatorCode: data.creatorCode || '----',
                    profilePicture: data.profilePicture || '',
                } as Student
            }))

            if (pageDocs.length === pageSize) {
                const nextDocIndex = currentCursor ? pageSize : page * pageSize;
                const nextDoc = snapshot.docs[nextDocIndex];
                if (nextDoc) {
                    const nextDocData = nextDoc.data();
                    cursors.current[page + 1] = nextDocData.firstName;
                }
            }

            return { students, totalCount }
        },
        staleTime: 1000 * 60 * 5,
    })

    const studentList = data?.students || []
    const totalStudents = data?.totalCount || 0

    const addStudentMutation = useMutation({
        mutationFn: async (formData: typeof form) => {
            const createStudentUser = httpsCallable(functions, 'createStudentUser')
            const result = await createStudentUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
            })
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
            setForm({ name: '', email: '', password: '' })
            setOpen(false)
        },
        onError: (error) => {
            console.error('Error adding student: ', error)
            alert('Failed to add student (The cloud function might not be implemented yet): ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    })

    const loading = isQueryLoading

    const handleAddStudent = async () => {
        if (!form.name || !form.email || !form.password) return
        addStudentMutation.mutate(form)
    }

    const hasNextPage = page * pageSize < totalStudents
    const hasPrevPage = page > 1

    return (
        <div className="p-8 space-y-6 w-full max-w-[1600px] mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Student Overview</h1>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for students"
                        className="pl-9 bg-muted/50 border-none h-10"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 h-10">
                        Export <Upload className="h-4 w-4" />
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-brand-green hover:bg-brand-green/90 text-white gap-2 h-10">
                                <Plus className="h-4 w-4" /> Add New Student
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Student</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Student Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Enter student name"
                                        disabled={addStudentMutation.isPending}
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
                                        disabled={addStudentMutation.isPending}
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
                                        disabled={addStudentMutation.isPending}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-brand-green hover:bg-brand-green/90 text-white"
                                    onClick={handleAddStudent}
                                    disabled={addStudentMutation.isPending}
                                >
                                    {addStudentMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding Student...
                                        </>
                                    ) : (
                                        'Add Student'
                                    )}
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

            <div className="rounded-md bg-card border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="w-12">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="text-foreground font-bold text-base">Student Name</TableHead>
                            <TableHead className="text-foreground font-bold text-base">Contact Info</TableHead>
                            <TableHead className="text-foreground font-bold text-base">Verified status</TableHead>
                            <TableHead className="text-foreground font-bold text-base">Creator Code</TableHead>
                            <TableHead className="text-foreground font-bold text-base text-right pr-8">Actions:</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
                                        <p className="text-muted-foreground font-medium">Loading students...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : studentList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            studentList.map((student: Student) => (
                                <TableRow key={student.id} className="h-16 border-b border-border hover:bg-muted/50">
                                    <TableCell>
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {student.profilePicture ? (
                                                <img src={student.profilePicture} alt={student.name} className="h-10 w-10 rounded-lg object-cover shrink-0" loading="lazy" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <span className="text-muted-foreground text-xs font-bold">{student.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="font-medium text-base text-foreground">{student.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">{student.contact}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {student.isVerified ? (
                                                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span>Verified</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-500 font-medium">
                                                    <XCircle className="h-4 w-4" />
                                                    <span>Unverified</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono font-medium text-foreground tracking-widest">{student.creatorCode}</TableCell>
                                    <TableCell className="text-right">
                                        <Link to="/admin/students/$studentId/settings" params={{ studentId: student.id }}>
                                            <Button variant="outline" size="sm" className="rounded-full h-8 px-4 gap-1 text-xs font-semibold">
                                                Manage <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {(hasPrevPage || hasNextPage) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        from="/admin/students/"
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
                        from="/admin/students/"
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
        </div>
    )
}
