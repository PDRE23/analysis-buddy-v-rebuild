import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  exportBackup,
  restoreBackupFromFile,
  scheduleAutomaticBackups,
  getBackupHistory,
  createBackup,
} from "@/lib/backup";
import {
  exportUserData,
  deleteUserData,
  applyRetentionPolicies,
  type RetentionPolicy,
} from "@/lib/compliance";
import { getCurrentUser, type User } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { cn } from "@/lib/utils";

const AUTO_BACKUP_STORAGE_KEY = "settings:auto-backup";
const RETENTION_STORAGE_KEY = "settings:retention-policies";

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    resourceType: "deal",
    maxAgeDays: 365 * 5,
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: "analysis",
    maxAgeDays: 365 * 3,
    autoArchive: true,
    autoDelete: false,
  },
  {
    resourceType: "note",
    maxAgeDays: 365 * 2,
    autoArchive: false,
    autoDelete: true,
  },
];

interface AutoBackupState {
  enabled: boolean;
  intervalHours: number;
}

const FALLBACK_USER: User = {
  id: "local-user",
  email: "",
  name: "Local User",
  role: "admin",
};

export function DataSettings() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [autoBackup, setAutoBackup] = useState<AutoBackupState>({
    enabled: false,
    intervalHours: 24,
  });
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>(DEFAULT_RETENTION_POLICIES);
  const [backupHistory, setBackupHistory] = useState(() => getBackupHistory());
  const cleanupRef = useRef<null | (() => void)>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_USER);
  const autoBackupEnabled = autoBackup.enabled;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedAuto = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
      if (storedAuto) {
        const parsed = JSON.parse(storedAuto) as Partial<AutoBackupState>;
        setAutoBackup((prev) => ({
          enabled: parsed.enabled ?? prev.enabled,
          intervalHours: parsed.intervalHours ?? prev.intervalHours,
        }));
      }
      const storedRetention = localStorage.getItem(RETENTION_STORAGE_KEY);
      if (storedRetention) {
        const parsedPolicies = JSON.parse(storedRetention) as RetentionPolicy[];
        setRetentionPolicies(parsedPolicies);
      }
    } catch (error) {
      console.warn("Unable to load data settings", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((user) => {
        if (user && isMounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        setCurrentUser(FALLBACK_USER);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, JSON.stringify(autoBackup));
  }, [autoBackup]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(retentionPolicies));
  }, [retentionPolicies]);

  useEffect(() => {
    if (!autoBackupEnabled) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    cleanupRef.current = scheduleAutomaticBackups(autoBackup.intervalHours);
    logAction(currentUser, "settings:update", "settings", {
      details: {
        autoBackupEnabled: true,
        intervalHours: autoBackup.intervalHours,
      },
    });
    setStatusMessage(`Automatic backups scheduled every ${autoBackup.intervalHours} hour(s).`);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [autoBackupEnabled, autoBackup.intervalHours, currentUser]);

  const handleManualBackup = useCallback(() => {
    createBackup();
    exportBackup();
    setBackupHistory(getBackupHistory());
    setStatusMessage("Manual backup exported successfully.");
    logAction(currentUser, "settings:update", "settings", {
      details: { action: "manual_backup" },
    });
  }, [currentUser]);

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await restoreBackupFromFile(file);
      if (result.success) {
        setStatusMessage(`Backup restored (${result.restored.deals} deals, ${result.restored.analyses} analyses).`);
        setBackupHistory(getBackupHistory());
        logAction(currentUser, "settings:update", "settings", {
          details: { action: "restore_backup", fileName: file.name },
        });
      } else {
        setStatusMessage(result.errors?.join(", ") ?? "Restore encountered issues.");
      }
    } catch (error) {
      setStatusMessage(`Restore failed: ${error}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleAutoBackup = () => {
    setAutoBackup((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
    setStatusMessage(!autoBackupEnabled ? "Automatic backups enabled." : "Automatic backups disabled.");
    logAction(currentUser, "settings:update", "settings", {
      details: { autoBackupEnabled: !autoBackupEnabled },
    });
  };

  const handleIntervalChange = (value: string) => {
    const hours = Number(value);
    setAutoBackup((prev) => ({
      ...prev,
      intervalHours: Number.isFinite(hours) && hours > 0 ? hours : prev.intervalHours,
    }));
    setStatusMessage(`Auto-backup frequency set to every ${value} hour(s).`);
  };

  const updatePolicy = (resourceType: RetentionPolicy["resourceType"], field: keyof RetentionPolicy, value: string | number | boolean) => {
    setRetentionPolicies((prev) =>
      prev.map((policy) =>
        policy.resourceType === resourceType
          ? { ...policy, [field]: value }
          : policy
      )
    );
  };

  const handleApplyRetention = () => {
    const result = applyRetentionPolicies(retentionPolicies);
    setStatusMessage(`Retention policies applied. Archived: ${result.archived}, Deleted: ${result.deleted}.`);
    logAction(currentUser, "settings:update", "settings", {
      details: {
        action: "retention_applied",
        archived: result.archived,
        deleted: result.deleted,
      },
    });
  };

  const handleExportUserData = () => {
    const data = exportUserData(currentUser.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `user-data-${currentUser.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatusMessage("User data exported.");
    logAction(currentUser, "settings:update", "settings", {
      details: { action: "export_user_data" },
    });
  };

  const handleDeleteUserData = () => {
    const confirmation = window.confirm("This will delete all of your personal data. This action cannot be undone. Continue?");
    if (!confirmation) {
      return;
    }

    deleteUserData(currentUser.id);
    setStatusMessage("User data deleted and audit logs anonymized.");
    logAction(currentUser, "settings:update", "settings", {
      details: { action: "delete_user_data" },
    });
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700" role="status">
          {statusMessage}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Backups & Recovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">Manual Backup</h3>
              <p className="text-sm text-muted-foreground">
                Export a full snapshot of deals, analyses, notes, and settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleManualBackup} className="rounded-2xl">
                Download Backup
              </Button>
              <Button variant="outline" onClick={handleRestoreClick} className="rounded-2xl">
                Restore from File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleRestoreFromFile}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">Automatic Backups</h3>
              <p className="text-sm text-muted-foreground">
                Keep a rolling set of encrypted backups on this device.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <input
                  id="auto-backup-toggle"
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={handleToggleAutoBackup}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="auto-backup-toggle">Enable automatic backups</Label>
              </div>
              <Select
                id="auto-backup-interval"
                aria-label="Automatic backup frequency"
                value={String(autoBackup.intervalHours)}
                onChange={(event) => handleIntervalChange(event.target.value)}
                options={[
                  { value: "6", label: "Every 6 hours" },
                  { value: "12", label: "Every 12 hours" },
                  { value: "24", label: "Every 24 hours" },
                  { value: "72", label: "Every 3 days" },
                ]}
                className="md:w-48"
              />
            </div>
          </div>

          {backupHistory.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Recent Backups</h3>
              <div className="space-y-2">
                {backupHistory.slice(0, 5).map((backup) => (
                  <div key={backup.timestamp} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{new Date(backup.timestamp).toLocaleString()}</div>
                      <div className="text-muted-foreground">Version {backup.version}</div>
                    </div>
                    <Badge variant="outline">{Math.round(backup.size / 1024)} KB</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Retention Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium">Resource</th>
                  <th className="px-3 py-2 font-medium">Max Age (days)</th>
                  <th className="px-3 py-2 font-medium">Auto Archive</th>
                  <th className="px-3 py-2 font-medium">Auto Delete</th>
                </tr>
              </thead>
              <tbody>
                {retentionPolicies.map((policy) => (
                  <tr key={policy.resourceType} className="border-b last:border-0">
                    <td className="px-3 py-2 capitalize">{policy.resourceType}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={30}
                        step={30}
                        value={policy.maxAgeDays}
                        onChange={(event) => updatePolicy(policy.resourceType, "maxAgeDays", Number(event.target.value))}
                        className="w-32"
                        aria-label={`Retention days for ${policy.resourceType}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(policy.autoArchive)}
                        onChange={(event) => updatePolicy(policy.resourceType, "autoArchive", event.target.checked)}
                        aria-label={`Auto archive ${policy.resourceType}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(policy.autoDelete)}
                        onChange={(event) => updatePolicy(policy.resourceType, "autoDelete", event.target.checked)}
                        aria-label={`Auto delete ${policy.resourceType}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Archived items remain searchable but are hidden from dashboards. Auto-delete permanently removes content after the retention window.</p>
          </div>

          <Button onClick={handleApplyRetention} className="rounded-2xl self-start">
            Apply Policies
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Privacy Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Export Personal Data</h3>
            <p className="text-sm text-muted-foreground">
              Generate a GDPR-compliant export of your personal data, including deals, analyses, notes, and audit activity linked to your account.
            </p>
            <Button variant="outline" onClick={handleExportUserData} className="w-fit rounded-2xl">
              Export My Data
            </Button>
          </div>

          <div className={cn("flex flex-col gap-2", "border border-destructive/30 bg-destructive/5 p-4 rounded-xl")}
            role="alert"
          >
            <h3 className="font-semibold text-destructive">Delete Personal Data</h3>
            <p className="text-sm text-muted-foreground">
              Permanently remove your deals, analyses, and notes. Audit records will be anonymized but retained for compliance.
            </p>
            <Button variant="destructive" onClick={handleDeleteUserData} className="w-fit rounded-2xl">
              Delete My Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
