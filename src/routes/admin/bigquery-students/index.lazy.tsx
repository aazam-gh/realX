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
import {
    fetchBigQueryStudents,
    type BigQueryStudent,
    type BigQueryStudentSearch,
    type BigQueryStudentSort,
} from './index'

export const Route = createLazyFileRoute('/admin/bigquery-students/')({
    component: BigQueryStudentsRoute,
})

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

function SortIcon({ field, sort }: { field: 'name' | 'student_id'; sort?: string }) {
    if (!sort || !sort.startsWith(field)) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sort.endsWith('asc')
        ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-blue-500" />
        : <ArrowDown className="ml-1 h-3.5 w-3.5 text-blue-500" />
}

function BigQueryStudentsRoute() {
    const searchParams = useSearch({ from: '/admin/bigquery-students/' })
    const { page, pageSize, search, sort, cursor, history } = searchParams
    const navigate = useNavigate()
    const { data, isLoading, error } = useQuery({
        queryKey: ['bigquery-students-list', pageSize, search, sort, cursor],
        queryFn: () => fetchBigQueryStudents(pageSize, search, sort, cursor),
        staleTime: STALE_TIME.MEDIUM,
    })

    const updateSearch = (updates: Partial<BigQueryStudentSearch>) => {
        const nextSearch: BigQueryStudentSearch = {
            page: 1,
            pageSize,
        }
        const nextSearchText = Object.hasOwn(updates, 'search') ? updates.search : search
        const nextSort = Object.hasOwn(updates, 'sort') ? updates.sort : sort

        if (nextSearchText) nextSearch.search = nextSearchText
        if (nextSort) nextSearch.sort = nextSort

        navigate({
            to: '/admin/bigquery-students',
            search: nextSearch,
        })
    }

    const toggleSort = (field: 'name' | 'student_id') => {
        const next = !sort || !sort.startsWith(field) || sort.endsWith('asc')
            ? `${field}_desc`
            : `${field}_asc`
        updateSearch({ sort: next as BigQueryStudentSort })
    }

    const goNext = () => {
        if (!data?.nextCursor) return
        const cursorHistory = history ? history.split('.') : []
        const nextSearch: BigQueryStudentSearch = {
            page: page + 1,
            pageSize,
            cursor: data.nextCursor,
            history: [...cursorHistory, cursor || 'first'].join('.'),
        }

        if (search) nextSearch.search = search
        if (sort) nextSearch.sort = sort

        navigate({
            to: '/admin/bigquery-students',
            search: nextSearch,
        })
    }

    const goPrevious = () => {
        const cursorHistory = history ? history.split('.') : []
        const previous = cursorHistory.pop()
        const previousSearch: BigQueryStudentSearch = {
            page: Math.max(1, page - 1),
            pageSize,
        }

        if (search) previousSearch.search = search
        if (sort) previousSearch.sort = sort
        if (previous && previous !== 'first') previousSearch.cursor = previous
        if (cursorHistory.length) previousSearch.history = cursorHistory.join('.')

        navigate({
            to: '/admin/bigquery-students',
            search: previousSearch,
        })
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-8">
            <div className="flex items-center gap-3">
                <div className="rounded bg-blue-50 p-2"><Database className="h-5 w-5 text-blue-600" /></div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BigQuery Students</h1>
                    <p className="text-sm text-muted-foreground">Separate read-only BigQuery student evaluation page. Student mutations remain Firestore-backed.</p>
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

            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search students..."
                        className="h-10 border-none bg-muted/50 pl-9"
                        value={search || ''}
                        onChange={(event) => updateSearch({ search: event.target.value || undefined })}
                    />
                </div>
                <Select value={sort || 'name_asc'} onValueChange={(value) => updateSearch({ sort: value as BigQueryStudentSort })}>
                    <SelectTrigger className="h-10 w-[220px] border-none bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name_asc">Name: A-Z</SelectItem>
                        <SelectItem value="name_desc">Name: Z-A</SelectItem>
                        <SelectItem value="student_id_asc">Student ID: A-Z</SelectItem>
                        <SelectItem value="student_id_desc">Student ID: Z-A</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="cursor-pointer font-bold text-black" onClick={() => toggleSort('name')}>
                                <span className="inline-flex items-center">Student <SortIcon field="name" sort={sort} /></span>
                            </TableHead>
                            <TableHead className="font-bold text-black">Email</TableHead>
                            <TableHead className="cursor-pointer font-bold text-black" onClick={() => toggleSort('student_id')}>
                                <span className="inline-flex items-center">Student ID <SortIcon field="student_id" sort={sort} /></span>
                            </TableHead>
                            <TableHead className="font-bold text-black">Gender</TableHead>
                            <TableHead className="font-bold text-black">DOB</TableHead>
                            <TableHead className="font-bold text-black">Role</TableHead>
                            <TableHead className="text-right font-bold text-black">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center">Loading BigQuery students...</TableCell></TableRow>
                        ) : error ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center text-red-600">{error.message}</TableCell></TableRow>
                        ) : !data?.students.length ? (
                            <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No exported students found.</TableCell></TableRow>
                        ) : data.students.map((student: BigQueryStudent) => (
                            <TableRow
                                key={student.id}
                                className="h-20 cursor-pointer border-b border-gray-100 hover:bg-gray-50/50"
                                onClick={() => navigate({
                                    to: '/admin/students/$studentId/settings',
                                    params: { studentId: student.id },
                                    search: { page: 1, pageSize: 10, search: '' },
                                })}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{student.fullName || 'Unnamed Student'}</span>
                                        <span className="font-mono text-[10px] text-muted-foreground">ID: {student.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{student.email || 'N/A'}</TableCell>
                                <TableCell>{student.studentId || 'N/A'}</TableCell>
                                <TableCell>{student.gender || 'N/A'}</TableCell>
                                <TableCell>{student.dob || 'N/A'}</TableCell>
                                <TableCell><Badge className="w-fit">{student.role || 'student'}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild onClick={(event) => event.stopPropagation()}>
                                        <Link
                                            to="/admin/students/$studentId/settings"
                                            params={{ studentId: student.id }}
                                            search={{ page: 1, pageSize: 10, search: '' }}
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
