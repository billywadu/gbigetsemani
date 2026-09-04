'use client'

import React from 'react'
import { Permission, hasPermission, isRoleAllowed } from '@/lib/permissions'
import { Role } from '@/config/navigation'

interface PermissionGateProps {
  children: React.ReactNode
  role?: Role
  permission?: Permission
  allowedRoles?: Role[]
  fallback?: React.ReactNode
}

export function PermissionGate({
  children,
  role = 'SUPER_ADMIN', // Default demo role to enable full UI exploration
  permission,
  allowedRoles,
  fallback = null,
}: PermissionGateProps) {
  if (allowedRoles && !isRoleAllowed(role, allowedRoles)) {
    return <>{fallback}</>
  }

  if (permission && !hasPermission(role, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
