import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string()
    .min(2, { message: 'Username minimal 2 karakter.' })
    .transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, { message: 'Kata sandi (password) wajib diisi.' }),
})

export type LoginInput = z.infer<typeof loginSchema>
