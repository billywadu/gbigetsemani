'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Search,
  FilterX,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  EyeOff,
  RefreshCw,
  Lock,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuditLogListAction, verifyAuditChainAction } from '@/actions/audit'
import { toast } from 'sonner'

export default function AuditPage() {
  const [loading, setLoading] = useState(true)
  const [auditList, setAuditList] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})

  // Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null)

  // Integrity Verification State
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any | null>(null)

  // Column Visibility States
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    actor: true,
    action: true,
    entity: true,
    hashes: true,
  })

  // Pagination states
  const [pageSize, setPageSize] = useState(10)
  const [pageIndex, setPageIndex] = useState(0)

  // Sorting state
  const [sortField, setSortField] = useState<'timestamp' | 'actor' | 'action' | null>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch Data Function from PostgreSQL
  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await getAuditLogListAction({
      search: searchTerm,
      actionFilter: actionFilter !== 'ALL' ? actionFilter : undefined,
      entityFilter: entityFilter !== 'ALL' ? entityFilter : undefined,
      page: pageIndex + 1,
      pageSize,
    })

    if (res.success && res.data) {
      setAuditList(res.data.items)
      setTotalCount(res.data.total)
    } else {
      toast.error(res.error || 'Gagal memuat data log audit.')
    }
    setLoading(false)
  }, [searchTerm, actionFilter, entityFilter, pageIndex, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true)
    setVerificationResult(null)

    const res = await verifyAuditChainAction()
    setIsVerifying(false)

    if (res.success && res.data) {
      setVerificationResult(res.data)
      if (res.data.isChainValid) {
        toast.success('Integritas 100% Valid! Rantai Hash SHA-256 tidak mengalami manipulasi.')
      } else {
        toast.error('PERINGATAN: Integritas Rantai Audit Terdeteksi Rusak / Dimanipulasi!')
      }
    } else {
      toast.error(res.error || 'Gagal melakukan verifikasi integritas audit.')
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const selectedCount = Object.values(selectedRows).filter(Boolean).length

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    auditList.forEach((item) => {
      updated[item.id] = checked
    })
    setSelectedRows(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => ({ ...prev, [id]: checked }))
  }

  const isAllPaginatedSelected =
    auditList.length > 0 && auditList.every((item) => selectedRows[item.id])

  const renderColumnHeader = (
    title: string,
    field?: 'timestamp' | 'actor' | 'action',
    columnKey?: keyof typeof visibleColumns
  ) => {
    const isSorted = field && sortField === field

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='-ms-3 h-8 data-[state=open]:bg-accent font-semibold text-xs text-foreground flex items-center gap-1.5'
          >
            <span>{title}</span>
            {isSorted ? (
              sortOrder === 'asc' ? (
                <ArrowUp className='size-3.5' />
              ) : (
                <ArrowDown className='size-3.5' />
              )
            ) : (
              field && <ArrowUpDown className='size-3.5 opacity-50' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-36'>
          {field && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('asc')
                }}
                className='text-xs gap-2'
              >
                <ArrowUp className='size-3.5 text-muted-foreground' /> Asc
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortField(field)
                  setSortOrder('desc')
                }}
                className='text-xs gap-2'
              >
                <ArrowDown className='size-3.5 text-muted-foreground' /> Desc
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {columnKey && (
            <DropdownMenuItem
              onClick={() => setVisibleColumns((prev) => ({ ...prev, [columnKey]: false }))}
              className='text-xs gap-2'
            >
              <EyeOff className='size-3.5 text-muted-foreground' /> Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4'>
        <div className='flex items-start sm:items-center gap-3'>
          <div className='p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0'>
            <ShieldCheck className='size-5' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>Audit Log Keamanan</h1>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Rekam jejak mutasi data terenkripsi hash chain SHA-256.
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto'>
          <Button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className='w-full sm:w-auto h-9 sm:h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          >
            {isVerifying ? <Loader2 className='size-3.5 animate-spin' /> : <ShieldCheck className='size-3.5' />}
            {isVerifying ? 'Memverifikasi...' : 'Verifikasi Integritas'}
          </Button>
        </div>
      </div>

      {/* Verification Result Alert Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-start gap-3 shadow-xs ${
            verificationResult.isChainValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {verificationResult.isChainValid ? (
            <CheckCircle2 className='size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5' />
          ) : (
            <AlertTriangle className='size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5' />
          )}
          <div className='space-y-1'>
            <div className='font-bold text-sm'>
              {verificationResult.isChainValid
                ? 'INTEGRITAS KRIPTOGRAFI 100% VALID'
                : 'TERDETEKSI KERUSAKAN / MANIPULASI HASIL HASH'}
            </div>
            <div>{verificationResult.details}</div>
          </div>
        </div>
      )}

      {/* Toolbar Filter Section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Input
            placeholder='Cari aktor, aksi, entitas, hash...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPageIndex(0)
            }}
            className='h-8 text-xs w-full sm:w-50'
          />

          <div className='grid grid-cols-2 sm:flex sm:flex-row items-center gap-2'>
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-32.5 px-2.5'>
                <SelectValue placeholder='Aksi' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Semua Aksi</SelectItem>
                <SelectItem value='LOGIN_SUCCESS'>LOGIN_SUCCESS</SelectItem>
                <SelectItem value='LOGIN_FAILED'>LOGIN_FAILED</SelectItem>
                <SelectItem value='ACCOUNT_LOCKED'>ACCOUNT_LOCKED</SelectItem>
                <SelectItem value='LOGOUT'>LOGOUT</SelectItem>
                <SelectItem value='JEMAAT_CREATED'>JEMAAT_CREATED</SelectItem>
                <SelectItem value='JEMAAT_UPDATED'>JEMAAT_UPDATED</SelectItem>
                <SelectItem value='JEMAAT_DELETED'>JEMAAT_DELETED</SelectItem>
                <SelectItem value='KELUARGA_CREATED'>KELUARGA_CREATED</SelectItem>
                <SelectItem value='KELUARGA_UPDATED'>KELUARGA_UPDATED</SelectItem>
                <SelectItem value='KELUARGA_DELETED'>KELUARGA_DELETED</SelectItem>
                <SelectItem value='ANGGOTA_KELUARGA_ADDED'>ANGGOTA_ADDED</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={entityFilter}
              onValueChange={(val) => {
                setEntityFilter(val)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className='h-8 text-xs w-full sm:w-32.5 px-2.5'>
                <SelectValue placeholder='Entitas' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Semua Entitas</SelectItem>
                <SelectItem value='Jemaat'>Jemaat</SelectItem>
                <SelectItem value='Keluarga'>Keluarga</SelectItem>
                <SelectItem value='AnggotaKeluarga'>AnggotaKeluarga</SelectItem>
                <SelectItem value='User'>User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || actionFilter !== 'ALL' || entityFilter !== 'ALL') && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setSearchTerm('')
                setActionFilter('ALL')
                setEntityFilter('ALL')
                setPageIndex(0)
              }}
              className='h-8 px-2 text-xs gap-1 text-muted-foreground w-full sm:w-auto'
            >
              <FilterX className='size-3.5' /> Reset
            </Button>
          )}
        </div>

        {/* View Options Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 gap-1.5 w-full sm:w-auto text-xs font-medium justify-center'>
              <SlidersHorizontal className='size-3.5' /> View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuLabel className='text-xs'>Toggle Kolom</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={visibleColumns.timestamp}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, timestamp: !!c }))}
            >
              Waktu (Timestamp)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.actor}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, actor: !!c }))}
            >
              Pelaku (Actor)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.action}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, action: !!c }))}
            >
              Tindakan (Action)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.entity}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, entity: !!c }))}
            >
              Entitas Target
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.hashes}
              onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, hashes: !!c }))}
            >
              SHA-256 Hash
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Data Table */}
      <div className='rounded-md border overflow-hidden bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent border-b'>
                <TableHead className='w-10 px-3'>
                  <Checkbox
                    checked={isAllPaginatedSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                {visibleColumns.timestamp && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Waktu (Timestamp)', 'timestamp', 'timestamp')}
                  </TableHead>
                )}
                {visibleColumns.actor && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Pelaku (Actor)', 'actor', 'actor')}
                  </TableHead>
                )}
                {visibleColumns.action && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Action', 'action', 'action')}
                  </TableHead>
                )}
                {visibleColumns.entity && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('Entity & Target ID', undefined, 'entity')}
                  </TableHead>
                )}
                {visibleColumns.hashes && (
                  <TableHead className='px-3'>
                    {renderColumnHeader('SHA-256 Hash Linkage', undefined, 'hashes')}
                  </TableHead>
                )}
                <TableHead className='w-12.5 px-3 text-end'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-sm'>
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin text-primary' /> Memuat catatan log audit...
                    </div>
                  </TableCell>
                </TableRow>
              ) : auditList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-sm'>
                    No results. Belum ada rekaman audit log.
                  </TableCell>
                </TableRow>
              ) : (
                auditList.map((log) => {
                  const isSelected = !!selectedRows[log.id]
                  return (
                    <TableRow
                      key={log.id}
                      className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className='px-3 py-2.5'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(log.id, !!checked)}
                        />
                      </TableCell>
                      {visibleColumns.timestamp && (
                        <TableCell className='px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap'>
                          {new Date(log.timestamp).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </TableCell>
                      )}
                      {visibleColumns.actor && (
                        <TableCell className='px-3 py-2.5 font-semibold text-xs text-foreground'>
                          {log.actor}
                        </TableCell>
                      )}
                      {visibleColumns.action && (
                        <TableCell className='px-3 py-2.5'>
                          <Badge
                            className={`font-mono text-[10px] font-normal ${
                              log.action.includes('CREATED') || log.action.includes('SUCCESS') || log.action.includes('ADDED')
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : log.action.includes('DELETED') || log.action.includes('LOCKED') || log.action.includes('FAILED')
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.entity && (
                        <TableCell className='px-3 py-2.5 text-xs'>
                          <div className='font-semibold text-foreground'>{log.entity}</div>
                          <div className='font-mono text-[10px] text-muted-foreground truncate max-w-30'>
                            {log.entityId}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.hashes && (
                        <TableCell className='px-3 py-2.5 font-mono text-[10px] space-y-0.5'>
                          <div className='text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-45'>
                            Curr: {log.currentHash.substring(0, 16)}...
                          </div>
                          <div className='text-muted-foreground truncate max-w-45'>
                            Prev: {log.previousHash.substring(0, 16)}...
                          </div>
                        </TableCell>
                      )}
                      <TableCell className='px-3 py-2.5 text-end'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-7'
                          onClick={() => setSelectedDetail(log)}
                        >
                          <Eye className='size-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Pagination */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t text-xs text-muted-foreground bg-card'>
          <div className='whitespace-nowrap'>
            {selectedCount} dari {totalCount} baris dipilih.
          </div>

          <div className='flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-6'>
            <div className='flex items-center gap-2'>
              <span className='whitespace-nowrap'>Per halaman</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className='h-7 w-16 text-xs px-2'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='25'>25</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                  <SelectItem value='100'>100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='whitespace-nowrap font-medium'>
              Hal. {pageIndex + 1} / {totalPages}
            </div>

            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon'
                className='size-7'
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}
              >
                <ChevronsLeft className='size-3.5' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='size-7'
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className='size-3.5' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='size-7'
                disabled={pageIndex >= totalPages - 1}
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight className='size-3.5' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='size-7'
                disabled={pageIndex >= totalPages - 1}
                onClick={() => setPageIndex(totalPages - 1)}
              >
                <ChevronsRight className='size-3.5' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detail Log Audit */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className='max-w-2xl w-full overflow-hidden'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
              <ShieldCheck className='size-5 text-emerald-500 shrink-0' /> Rincian Rekaman Log Audit Cryptographic
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              Rincian metadata audit trail terbukti tahan manipulasi (SHA-256 Linked Chain).
            </DialogDescription>
          </DialogHeader>

          {selectedDetail && (
            <div className='space-y-4 py-2 text-xs min-w-0'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border'>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Timestamp:</span>
                  <span className='font-mono font-semibold text-foreground block truncate'>
                    {new Date(selectedDetail.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Pelaku (Actor):</span>
                  <span className='font-semibold text-foreground block truncate'>{selectedDetail.actor}</span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Aksi (Action):</span>
                  <Badge variant='outline' className='font-mono text-[11px]'>
                    {selectedDetail.action}
                  </Badge>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground block text-[11px]'>Entitas / Target ID:</span>
                  <span className='font-semibold text-foreground text-[11px] break-all block'>
                    {selectedDetail.entity}{' '}
                    <span className='font-mono text-muted-foreground font-normal'>({selectedDetail.entityId})</span>
                  </span>
                </div>
              </div>

              <div className='space-y-2 p-3 rounded-lg border font-mono text-[11px] bg-slate-950 text-slate-100 dark:bg-slate-900 overflow-hidden'>
                <div className='min-w-0'>
                  <span className='text-slate-400 block text-[10px]'>Current SHA-256 Hash:</span>
                  <span className='text-emerald-400 break-all text-[11px] block'>{selectedDetail.currentHash}</span>
                </div>
                <div className='min-w-0'>
                  <span className='text-slate-400 block text-[10px]'>Previous Linked Hash:</span>
                  <span className='text-slate-300 break-all text-[11px] block'>{selectedDetail.previousHash}</span>
                </div>
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <Code className='size-3.5 text-primary shrink-0' /> Formatted Canonical State Payload:
                </Label>
                <pre className='p-3 rounded-lg bg-muted border font-mono text-[11px] overflow-x-auto max-h-48 text-foreground whitespace-pre-wrap wrap-break-word'>
                  {selectedDetail.stateChange || 'No payload state logged.'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
