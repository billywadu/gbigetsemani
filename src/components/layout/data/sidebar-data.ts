import { Building2 } from 'lucide-react'
import { cmsNavigation } from '@/config/navigation'

export const sidebarData = {
  user: {
    name: 'Administrator',
    email: 'admin@gereja.org',
    avatar: null as string | null,
    role: 'SUPER_ADMIN' as const,
  },
  teams: [
    {
      name: 'CMS Gereja',
      logo: Building2,
      plan: 'CMS v4.2.0 Enterprise',
    },
  ],
  navGroups: cmsNavigation,
}
