import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  let errMsg = 'Terjadi kesalahan pada server.'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Tidak ada konten.'
  }

  toast.error(errMsg)
}
