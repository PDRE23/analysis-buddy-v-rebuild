/**
 * Simple delete confirmation dialog
 */

import React from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { AlertCircle } from 'lucide-react';

export interface DeleteConfirmation {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface DeleteConfirmationDialogProps {
  confirmation: DeleteConfirmation;
}

export function DeleteConfirmationDialog({ confirmation }: DeleteConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {confirmation.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmation.message}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={confirmation.onCancel}
            >
              {confirmation.cancelText || "Cancel"}
            </Button>
            <Button 
              onClick={confirmation.onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {confirmation.confirmText || "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

