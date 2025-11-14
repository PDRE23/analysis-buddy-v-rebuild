"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingSettings } from "./BrandingSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { DataSettings } from "./DataSettings";
import { Shield, Palette, Plug } from "lucide-react";

export function SettingsApp() {
  return (
    <div className="h-full overflow-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage integrations, branding, and data governance for your Analysis Buddy workspace.
          </p>
        </header>

        <Tabs defaultValue="data" className="flex-1">
          <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 md:gap-4">
            <TabsTrigger value="data" className="flex items-center justify-center gap-2 py-3">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Data & Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center justify-center gap-2 py-3">
              <Palette className="h-4 w-4" aria-hidden="true" />
              <span>Branding</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center justify-center gap-2 py-3">
              <Plug className="h-4 w-4" aria-hidden="true" />
              <span>Integrations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="focus-visible:outline-none">
            <DataSettings />
          </TabsContent>

          <TabsContent value="branding" className="focus-visible:outline-none">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="integrations" className="focus-visible:outline-none">
            <IntegrationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
