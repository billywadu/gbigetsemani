'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { logoutAction } from '@/actions/auth'
import { toast } from 'sonner'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    const res = await logoutAction()
    setLoading(false)

    if (res.success) {
      toast.info('Sesi staff telah diakhiri (Sign Out). Log audit SHA-256 dicatat.')
      onOpenChange(false)
      router.push('/login')
    } else {
      toast.error(res.error || 'Gagal mengakhiri sesi.')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Keluar dari Dashboard Staff'
      desc='Apakah Anda yakin ingin keluar? Anda perlu memasukkan kredensial login staff kembali untuk mengakses sistem.'
      confirmText={loading ? 'Memproses...' : 'Keluar (Sign out)'}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
