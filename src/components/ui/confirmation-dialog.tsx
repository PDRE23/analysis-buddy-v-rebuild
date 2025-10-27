/**
 * Confirmation dialog component for validation
 */

import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export interface ConfirmationRequest {
  section: string;
  message: string;
  fields: string[];
  type: 'optional' | 'recommended';
}

interface ConfirmationDialogProps {
  confirmations: ConfirmationRequest[];
  onConfirm: (section: string, confirmed: boolean) => void;
  onCancel: () => void;
  onProceedAnyway: () => void;
}

export function ConfirmationDialog({
  confirmations,
  onConfirm,
  onCancel,
  onProceedAnyway
}: ConfirmationDialogProps) {
  const [confirmedSections, setConfirmedSections] = React.useState<Set<string>>(new Set());

  const handleConfirm = (section: string, confirmed: boolean) => {
    if (confirmed) {
      setConfirmedSections(prev => new Set([...prev, section]));
    } else {
      setConfirmedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
    }
    onConfirm(section, confirmed);
  };

  const allConfirmed = confirmations.every(conf => confirmedSections.has(conf.section));
  const hasRecommended = confirmations.some(conf => conf.type === 'recommended');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <span>Confirm Missing Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The following sections appear to be incomplete. Please confirm if you intended to leave them blank:
          </p>

          {confirmations.map((confirmation, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {confirmation.section}
                    {confirmation.type === 'recommended' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {confirmation.message}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    Missing fields: {confirmation.fields.join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={confirmedSections.has(confirmation.section) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleConfirm(confirmation.section, true)}
                  className="text-green-700 hover:text-green-800"
                >
                  Yes, leave blank
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfirm(confirmation.section, false)}
                  className="text-blue-700 hover:text-blue-800"
                >
                  No, let me fill it out
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {confirmedSections.size} of {confirmations.length} sections confirmed
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              
              {allConfirmed && (
                <Button 
                  onClick={onProceedAnyway}
                  className={hasRecommended ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {hasRecommended ? "Proceed with Missing Info" : "Save Analysis"}
                </Button>
              )}
            </div>
          </div>

          {!allConfirmed && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Please confirm all sections before proceeding, or cancel to go back and fill them out.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
