"use client";

/**
 * Email Templates Manager
 * Create and manage email templates
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Edit } from "lucide-react";
import {
  getEmailTemplates,
  saveEmailTemplate,
  type EmailTemplate,
} from "@/lib/integrations/email";

const EMAIL_TEMPLATES_STORAGE_KEY = "email-templates";

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(getEmailTemplates());
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "custom" as EmailTemplate["category"],
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      alert("Please fill in all fields");
      return;
    }

    // Extract variables from template
    const variables = [
      ...formData.subject.matchAll(/\{\{(\w+)\}\}/g),
      ...formData.body.matchAll(/\{\{(\w+)\}\}/g),
    ].map(match => `{{${match[1]}}}`);

    const uniqueVariables = Array.from(new Set(variables));

    if (editingTemplate) {
      // Update existing
      const updated = templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, ...formData, variables: uniqueVariables }
          : t
      );
      setTemplates(updated);
      localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      setEditingTemplate(null);
    } else {
      // Create new
      const newTemplate = saveEmailTemplate({
        ...formData,
        variables: uniqueVariables,
      });
      setTemplates([...templates, newTemplate]);
    }

    setFormData({ name: "", subject: "", body: "", category: "custom" });
    setShowAddForm(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this template?")) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const categories: EmailTemplate["category"][] = ["proposal", "follow-up", "meeting", "thank-you", "custom"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable email templates with variables
          </p>
        </div>
        <Button
          onClick={() => {
            setShowAddForm(true);
            setEditingTemplate(null);
            setFormData({ name: "", subject: "", body: "", category: "custom" });
          }}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{editingTemplate ? "Edit Template" : "New Template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Proposal Follow-up"
              />
            </div>

            <div>
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Use {{variable}} for placeholders"
              />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Use {{variable}} for placeholders"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {"Available variables: {{clientName}}, {{clientCompany}}, {{propertyAddress}}, {{rsf}}, etc."}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="rounded-2xl">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTemplate(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{template.category}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium">Subject:</div>
                  <div className="text-sm text-muted-foreground">{template.subject}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Body:</div>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {template.body}
                  </div>
                </div>
                {template.variables.length > 0 && (
                  <div>
                    <div className="text-sm font-medium">Variables:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

