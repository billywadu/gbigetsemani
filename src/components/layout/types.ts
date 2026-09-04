export type User = {
  name: string
  email: string
  avatar: string
  role?: string
}

export type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

export type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  roles?: string[]
  permission?: string
}

export type NavLink = BaseNavItem & {
  url: string
  items?: never
}

export type NavCollapsible = BaseNavItem & {
  url?: string
  items: (BaseNavItem & { url: string })[]
}

export type NavItem = NavLink | NavCollapsible

export type NavGroup = {
  title: string
  roles?: string[]
  items: NavItem[]
}

export type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}
