"use client";

/**
 * Email Composer Component
 * Compose and send emails from the app
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, X, FileText } from "lucide-react";
import {
  getEmailTemplates,
  renderEmailTemplate,
  sendEmail,
  type EmailTemplate,
} from "@/lib/integrations/email";
import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";

interface EmailComposerProps {
  deal?: Deal;
  analysis?: AnalysisMeta;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
  onCancel?: () => void;
}

export function EmailComposer({
  deal,
  analysis,
  defaultTo = [],
  defaultSubject,
  defaultBody,
  onSent,
  onCancel,
}: EmailComposerProps) {
  const [to, setTo] = useState<string[]>(defaultTo);
  const [toInput, setToInput] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<{ file: File; id: string }>>([]);
  const [sending, setSending] = useState(false);

  const templates = getEmailTemplates();

  const handleAddRecipient = (email: string, list: string[], setList: (emails: string[]) => void) => {
    if (email.trim() && email.includes("@")) {
      setList([...list, email.trim()]);
      return "";
    }
    return email;
  };

  const handleApplyTemplate = (template: EmailTemplate) => {
    if (!deal) return;

    const variables: Record<string, string> = {
      clientName: deal.clientName || "",
      clientCompany: deal.clientCompany || "",
      propertyAddress: deal.propertyAddress || deal.property.address || "",
      propertyCity: deal.propertyCity || deal.property.city || "",
      propertyState: deal.propertyState || deal.property.state || "",
      rsf: deal.rsf?.toString() || "",
      brokerName: "Your Name", // In production, get from user profile
    };

    if (analysis) {
      // Calculate metrics if needed
      variables.effectiveRate = "TBD"; // Would calculate from analysis
      variables.totalValue = "TBD";
    }

    const rendered = renderEmailTemplate(template, variables);
    setSubject(rendered.subject);
    setBody(rendered.body);
    setSelectedTemplate(template.id);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      setAttachments(prev => [...prev, { file, id: `file-${Date.now()}-${Math.random()}` }]);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = async () => {
    if (to.length === 0 || !subject.trim() || !body.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      const attachmentBlobs = await Promise.all(
        attachments.map(async (att) => ({
          filename: att.file.name,
          content: att.file,
          mimeType: att.file.type || "application/octet-stream",
        }))
      );

      const result = await sendEmail(to, subject, body, attachmentBlobs);
      
      if (result.success) {
        if (onSent) {
          onSent();
        } else {
          alert("Email sent successfully!");
        }
      } else {
        alert(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      alert(`Error sending email: ${error}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Compose Email</span>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Templates */}
        {templates.length > 0 && (
          <div>
            <Label>Email Templates</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant={selectedTemplate === template.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleApplyTemplate(template)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* To */}
        <div>
          <Label>To *</Label>
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {to.map((email, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {email}
                <button
                  onClick={() => setTo(to.filter((_, i) => i !== index))}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Enter email address"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                setToInput(handleAddRecipient(toInput, to, setTo));
              }
            }}
            onBlur={() => {
              setToInput(handleAddRecipient(toInput, to, setTo));
            }}
          />
        </div>

        {/* CC */}
        <div>
          <Label>CC</Label>
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {cc.map((email, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {email}
                <button
                  onClick={() => setCc(cc.filter((_, i) => i !== index))}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Enter CC email address"
            value={ccInput}
            onChange={(e) => setCcInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                setCcInput(handleAddRecipient(ccInput, cc, setCc));
              }
            }}
            onBlur={() => {
              setCcInput(handleAddRecipient(ccInput, cc, setCc));
            }}
          />
        </div>

        {/* Subject */}
        <div>
          <Label>Subject *</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>

        {/* Body */}
        <div>
          <Label>Message *</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body"
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        {/* Attachments */}
        <div>
          <Label>Attachments</Label>
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {attachments.map((att) => (
              <Badge key={att.id} variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {att.file.name}
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="ml-1 hover:bg-destructive/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              onChange={handleFileAttach}
              className="hidden"
              id="file-attach"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-attach")?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach File
            </Button>
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || to.length === 0 || !subject.trim() || !body.trim()}
            className="rounded-2xl"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

