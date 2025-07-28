
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useUserActivity } from '@/lib/data'
import { format } from 'date-fns'
import { IndianRupee } from 'lucide-react'

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
            {parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          {after}
        </span>
      );
    }
  }
  return activity.details;
}

export default function ActivityLogPage() {
  const { activities, isLoaded } = useUserActivity()

  const sortedActivities = React.useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activities])

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Activity Log</CardTitle>
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
            {isLoaded && sortedActivities.length > 0 ? (
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
                  {isLoaded ? 'No activity recorded yet.' : 'Loading activity...'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
