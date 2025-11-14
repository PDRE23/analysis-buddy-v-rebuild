"use client";

/**
 * Integration Settings Component
 * Configure email, calendar, CRM, and document storage integrations
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Calendar, 
  Database, 
  Cloud, 
  Check, 
  X, 
  Settings,
  Link as LinkIcon,
} from "lucide-react";
import {
  getEmailAccounts,
  connectEmailAccount,
  disconnectEmailAccount,
  type EmailProvider,
} from "@/lib/integrations/email";
import {
  getCalendarAccounts,
  connectCalendarAccount,
  type CalendarProvider,
} from "@/lib/integrations/calendar";
import {
  getCRMAccounts,
  connectCRMAccount,
  type CRMProvider,
} from "@/lib/integrations/crm";

export function IntegrationSettings() {
  const [activeTab, setActiveTab] = useState<"email" | "calendar" | "crm" | "documents">("email");

  const emailAccounts = getEmailAccounts();
  const calendarAccounts = getCalendarAccounts();
  const crmAccounts = getCRMAccounts();

  const handleConnectEmail = (provider: EmailProvider) => {
    // In production, this would:
    // 1. Open OAuth flow for provider
    // 2. Get access token
    // 3. Call connectEmailAccount
    
    // For now, simulate connection
    const email = prompt("Enter your email address:");
    if (email) {
      connectEmailAccount(provider, email, email.split("@")[0], "mock-token");
      alert(`${provider} account connected! (In production, this would use OAuth)`);
      window.location.reload(); // Refresh to show new account
    }
  };

  const handleConnectCalendar = (provider: CalendarProvider) => {
    const email = prompt("Enter your email address:");
    if (email) {
      connectCalendarAccount(provider, email, email.split("@")[0], "mock-token");
      alert(`${provider} calendar connected! (In production, this would use OAuth)`);
      window.location.reload();
    }
  };

  const handleConnectCRM = (provider: CRMProvider) => {
    if (provider === "generic") {
      const name = prompt("Enter CRM name:");
      const apiUrl = prompt("Enter API URL:");
      const apiKey = prompt("Enter API Key:");
      
      if (name && apiUrl && apiKey) {
        // Would call connectGenericCRM with full config
        alert("Generic CRM connection would be configured here");
      }
    } else {
      const name = prompt("Enter account name:");
      if (name) {
        connectCRMAccount(provider, name, "mock-token");
        alert(`${provider} CRM connected! (In production, this would use OAuth)`);
        window.location.reload();
      }
    }
  };

  const tabs = [
    { id: "email", label: "Email", icon: Mail },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "crm", label: "CRM", icon: Database },
    { id: "documents", label: "Documents", icon: Cloud },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services to sync data and automate workflows
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Email Integration */}
      {activeTab === "email" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Email Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Gmail</div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync emails, create deals from emails, send proposals
                </p>
                <Button
                  onClick={() => handleConnectEmail("gmail")}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Gmail
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Outlook</div>
                  <Badge variant="outline">Available</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync emails, create deals from emails, send proposals
                </p>
                <Button
                  onClick={() => handleConnectEmail("outlook")}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect Outlook
                </Button>
              </div>
            </div>

            {/* Connected Accounts */}
            {emailAccounts.length > 0 && (
              <div className="mt-6">
                <div className="font-medium mb-2">Connected Accounts</div>
                <div className="space-y-2">
                  {emailAccounts.map((account) => (
                    <div
                      key={account.email}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {account.connected ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{account.email}</span>
                        <Badge variant="outline">{account.provider}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          disconnectEmailAccount(account.email);
                          window.location.reload();
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Integration */}
      {activeTab === "calendar" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Calendar Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Google Calendar</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync events, create reminders
                </p>
                <Button
                  onClick={() => handleConnectCalendar("google")}
                  className="w-full"
                  variant="outline"
                >
                  Connect
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Outlook Calendar</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync events, create reminders
                </p>
                <Button
                  onClick={() => handleConnectCalendar("outlook")}
                  className="w-full"
                  variant="outline"
                >
                  Connect
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">iCal Export</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Export events to iCal format
                </p>
                <Badge variant="outline">Always Available</Badge>
              </div>
            </div>

            {calendarAccounts.length > 0 && (
              <div className="mt-6">
                <div className="font-medium mb-2">Connected Calendars</div>
                <div className="space-y-2">
                  {calendarAccounts.map((account) => (
                    <div
                      key={`${account.provider}-${account.email}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{account.email}</span>
                        <Badge variant="outline">{account.provider}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CRM Integration */}
      {activeTab === "crm" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>CRM Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Salesforce</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync deals, two-way data sync
                </p>
                <Button
                  onClick={() => handleConnectCRM("salesforce")}
                  className="w-full"
                  variant="outline"
                >
                  Connect
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">HubSpot</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sync deals and contacts
                </p>
                <Button
                  onClick={() => handleConnectCRM("hubspot")}
                  className="w-full"
                  variant="outline"
                >
                  Connect
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Generic CRM</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect via API with custom mapping
                </p>
                <Button
                  onClick={() => handleConnectCRM("generic")}
                  className="w-full"
                  variant="outline"
                >
                  Configure
                </Button>
              </div>
            </div>

            {crmAccounts.length > 0 && (
              <div className="mt-6">
                <div className="font-medium mb-2">Connected CRMs</div>
                <div className="space-y-2">
                  {crmAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{account.name}</span>
                        <Badge variant="outline">{account.provider}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Integration */}
      {activeTab === "documents" && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Document Storage Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Google Drive</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Store files, auto-backup exports
                </p>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">Dropbox</div>
                <p className="text-sm text-muted-foreground mb-3">
                  File sync and storage
                </p>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="font-medium mb-2">OneDrive</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Enterprise file storage
                </p>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

