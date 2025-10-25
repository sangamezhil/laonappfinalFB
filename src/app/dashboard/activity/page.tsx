
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useUserActivity, getCurrentUserSync } from '@/lib/data'
import { format } from 'date-fns'
import { IndianRupee } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

type User = {
  username: string;
  role: string;
}

const renderActivityDetails = (activity: { action: string, details: string }) => {
  if (activity.action === 'Record Collection') {
    const parts = activity.details.split(/₹(\d[\d,]*\.?\d*)/);
    if (parts.length === 3) {
      const [before, amount, after] = parts;
      return (
        <span>
          {before}
          <span className="inline-flex items-center">
            <IndianRupee className="w-4 h-4 mx-1" />
            {parseFloat(amount.replace(/,/g, '')).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          {after}
        </span>
      );
    }
  }
  return activity.details;
}

export default function ActivityLogPage() {
  const { activities, isLoaded } = useUserActivity();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const u = getCurrentUserSync();
    if (u) {
      setUser(u);
      if (u.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/dashboard');
      }
      return;
    }
    fetch('/api/session').then(async (res) => {
      if (!res.ok) return router.push('/login');
      const json = await res.json();
      if (!json) return router.push('/login');
      setUser(json);
      try { (window as any).__currentSession = json } catch (e) {}
      if (json.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/dashboard');
      }
    }).catch(() => router.push('/login'));
  }, [router, toast]);

  const sortedActivities = React.useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activities])

  if (!isLoaded || !user || user.role !== 'Admin') {
      return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
                <Skeleton className="w-full h-64" />
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>A record of all significant actions taken by users.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoaded ? (
              sortedActivities.length > 0 ? (
                sortedActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{format(new Date(activity.timestamp), 'dd MMM yyyy, HH:mm:ss')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.username}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.action}</TableCell>
                    <TableCell>{renderActivityDetails(activity)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading activity...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
