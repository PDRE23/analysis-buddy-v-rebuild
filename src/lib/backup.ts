/**
 * Backup and Recovery System
 * Automated backups and data recovery
 */

/**
 * Create backup of all data
 */
export function createBackup(): {
  timestamp: string;
  version: string;
  data: {
    deals: unknown[];
    analyses: unknown[];
    notes: unknown[];
    settings: unknown;
  };
} {
  const deals = JSON.parse(localStorage.getItem("deals") || "[]");
  const analyses = JSON.parse(localStorage.getItem("analyses") || "[]");
  const notes = JSON.parse(localStorage.getItem("teamNotes") || "[]");
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");

  return {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    data: {
      deals,
      analyses,
      notes,
      settings,
    },
  };
}

/**
 * Export backup to file
 */
export function exportBackup(): void {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis-buddy-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restore backup from file
 */
export function restoreBackup(backupData: ReturnType<typeof createBackup>): {
  success: boolean;
  restored: {
    deals: number;
    analyses: number;
    notes: number;
  };
  errors: string[];
} {
  const errors: string[] = [];
  let dealsRestored = 0;
  let analysesRestored = 0;
  let notesRestored = 0;

  try {
    if (backupData.data.deals) {
      localStorage.setItem("deals", JSON.stringify(backupData.data.deals));
      dealsRestored = Array.isArray(backupData.data.deals) ? backupData.data.deals.length : 0;
    }
  } catch (error) {
    errors.push(`Error restoring deals: ${error}`);
  }

  try {
    if (backupData.data.analyses) {
      localStorage.setItem("analyses", JSON.stringify(backupData.data.analyses));
      analysesRestored = Array.isArray(backupData.data.analyses) ? backupData.data.analyses.length : 0;
    }
  } catch (error) {
    errors.push(`Error restoring analyses: ${error}`);
  }

  try {
    if (backupData.data.notes) {
      localStorage.setItem("teamNotes", JSON.stringify(backupData.data.notes));
      notesRestored = Array.isArray(backupData.data.notes) ? backupData.data.notes.length : 0;
    }
  } catch (error) {
    errors.push(`Error restoring notes: ${error}`);
  }

  try {
    if (backupData.data.settings) {
      localStorage.setItem("settings", JSON.stringify(backupData.data.settings));
    }
  } catch (error) {
    errors.push(`Error restoring settings: ${error}`);
  }

  return {
    success: errors.length === 0,
    restored: {
      deals: dealsRestored,
      analyses: analysesRestored,
      notes: notesRestored,
    },
    errors,
  };
}

/**
 * Restore backup from file upload
 */
export function restoreBackupFromFile(file: File): Promise<ReturnType<typeof restoreBackup>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        const result = restoreBackup(backupData);
        resolve(result);
      } catch (error) {
        reject(new Error(`Invalid backup file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading backup file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Schedule automatic backups
 */
export function scheduleAutomaticBackups(intervalHours: number = 24): () => void {
  let intervalId: NodeJS.Timeout | null = null;

  const performBackup = () => {
    const backup = createBackup();
    // Store backup in localStorage (in production, upload to server)
    const backups = JSON.parse(localStorage.getItem("backups") || "[]");
    backups.push(backup);
    
    // Keep only last 10 backups
    if (backups.length > 10) {
      backups.shift();
    }
    
    localStorage.setItem("backups", JSON.stringify(backups));
  };

  // Perform initial backup
  performBackup();

  // Schedule periodic backups
  intervalId = setInterval(performBackup, intervalHours * 60 * 60 * 1000);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Get backup history
 */
export function getBackupHistory(): Array<{
  timestamp: string;
  version: string;
  size: number;
}> {
  const backups = JSON.parse(localStorage.getItem("backups") || "[]");
  return backups.map((backup: ReturnType<typeof createBackup>) => ({
    timestamp: backup.timestamp,
    version: backup.version,
    size: JSON.stringify(backup.data).length,
  }));
}

