"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

type ApplicationStatus = "pending" | "accepted" | "rejected"

interface ApplicationWithDetails {
  _id: string
  volunteerAccountId: string
  opportunityId: string
  coverLetter: string
  status: ApplicationStatus
  appliedAt: number
  respondedAt?: number
  opportunity?: {
    _id: string
    title: string
    description: string
    location: { city: string; lat: number; lng: number }
    urgency: "low" | "medium" | "high"
    taskType: string
  }
  ngo?: {
    _id: string
    name: string
    description?: string
  }
}

export default function ApplicationsPage() {
  const applications = useQuery(api.queries.getMyApplications) as ApplicationWithDetails[] | undefined
  const [statusFilter, setStatusFilter] = React.useState<ApplicationStatus | "all">("all")

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    }
  }

  const filteredApplications =
    applications && statusFilter !== "all"
      ? applications.filter((app) => app.status === statusFilter)
      : applications

  const stats = React.useMemo(() => {
    if (!applications) return { total: 0, pending: 0, accepted: 0, rejected: 0 }
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      accepted: applications.filter((a) => a.status === "accepted").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }
  }, [applications])

  if (applications === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading your applications...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            Track the status of opportunities you've applied to
          </p>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        {stats.total > 0 && (
          <div className="mb-6 flex gap-2">
            {(["all", "pending", "accepted", "rejected"] as const).map((filter) => (
              <Button
                key={filter}
                variant={statusFilter === filter ? "default" : "outline"}
                onClick={() => setStatusFilter(filter)}
                className="capitalize"
              >
                {filter === "all" ? "All" : filter}
              </Button>
            ))}
          </div>
        )}

        {/* Applications List */}
        {filteredApplications && filteredApplications.length > 0 ? (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {application.opportunity?.title || "Unknown Opportunity"}
                      </CardTitle>
                      <CardDescription>
                        {application.ngo?.name && (
                          <span>
                            {application.ngo.name}
                            {application.opportunity?.location.city && (
                              <> • {application.opportunity.location.city}</>
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {application.opportunity && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Task Type:</strong> {application.opportunity.taskType}
                      </p>
                      <p>
                        <strong>Urgency:</strong>{" "}
                        <Badge
                          variant="outline"
                          className={
                            application.opportunity.urgency === "high"
                              ? "bg-red-50 text-red-800"
                              : application.opportunity.urgency === "medium"
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-blue-50 text-blue-800"
                          }
                        >
                          {application.opportunity.urgency}
                        </Badge>
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-1">Your Cover Letter:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {application.coverLetter}
                    </p>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <p>
                      <strong>Applied:</strong> {format(new Date(application.appliedAt), "PPP")}
                    </p>
                    {application.respondedAt && (
                      <p>
                        <strong>Responded:</strong>{" "}
                        {format(new Date(application.respondedAt), "PPP")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-center text-muted-foreground mb-4">
                {applications.length === 0
                  ? "You haven't applied to any opportunities yet."
                  : "No applications found with this status."}
              </p>
              <Link href="/" className="inline-flex h-10 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                Browse Opportunities
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
