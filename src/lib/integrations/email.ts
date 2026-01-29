/**
 * Email Integration
 * Gmail and Outlook integration for email sync and sending
 */

import { nanoid } from "nanoid";
import type { Deal } from "../types/deal";
import type { AnalysisMeta } from "@/types";

export type EmailProvider = "gmail" | "outlook";

export interface EmailAccount {
  provider: EmailProvider;
  email: string;
  name: string;
  connected: boolean;
  lastSync?: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: string;
  attachments?: Array<{
    filename: string;
    size: number;
    mimeType: string;
  }>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "proposal" | "follow-up" | "meeting" | "thank-you" | "custom";
  variables: string[]; // e.g., ["{{clientName}}", "{{propertyAddress}}"]
}

const EMAIL_ACCOUNTS_STORAGE_KEY = "email-accounts";
const EMAIL_TEMPLATES_STORAGE_KEY = "email-templates";

/**
 * Connect email account
 */
export function connectEmailAccount(
  provider: EmailProvider,
  email: string,
  name: string,
  accessToken: string
): EmailAccount {
  const accounts = getEmailAccounts();
  const account: EmailAccount = {
    provider,
    email,
    name,
    connected: true,
    lastSync: new Date().toISOString(),
  };

  // Store token securely (in production, use secure storage)
  localStorage.setItem(`email-token-${email}`, accessToken);

  const existingIndex = accounts.findIndex(a => a.email === email);
  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  localStorage.setItem(EMAIL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  
  return account;
}

/**
 * Get connected email accounts
 */
export function getEmailAccounts(): EmailAccount[] {
  try {
    const stored = localStorage.getItem(EMAIL_ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Disconnect email account
 */
export function disconnectEmailAccount(email: string): void {
  const accounts = getEmailAccounts();
  const filtered = accounts.filter(a => a.email !== email);
  localStorage.setItem(EMAIL_ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
  localStorage.removeItem(`email-token-${email}`);
}

/**
 * Sync emails for a deal
 * In production, this would call the email API
 */
export async function syncEmailsForDeal(
  dealId: string,
  email: string
): Promise<EmailMessage[]> {
  // In production, this would:
  // 1. Get access token for email account
  // 2. Call Gmail API or Outlook API to search for emails
  // 3. Filter by deal-related keywords (client name, property address, etc.)
  // 4. Return matching emails
  
  // For now, return empty array
  return [];
}

/**
 * Parse email content to extract deal information
 */
export function parseEmailForDeal(emailBody: string, emailSubject: string): {
  clientName?: string;
  clientCompany?: string;
  rsf?: number;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  expectedCloseDate?: string;
  notes?: string;
} {
  const extracted: any = {};

  // Extract client name (look for patterns like "Client: X" or "Name: X")
  const nameMatch = emailBody.match(/(?:client|name|tenant)[:\s]+([A-Z][a-zA-Z\s]+)/i);
  if (nameMatch) {
    extracted.clientName = nameMatch[1].trim();
  }

  // Extract company name
  const companyMatch = emailBody.match(/(?:company|corporation|corp)[:\s]+([A-Z][a-zA-Z\s&]+)/i);
  if (companyMatch) {
    extracted.clientCompany = companyMatch[1].trim();
  }

  // Extract RSF (look for patterns like "RSF: 5000" or "5,000 SF")
  const rsfMatch = emailBody.match(/(?:rsf|square\s+feet|sf)[:\s]+([\d,]+)/i);
  if (rsfMatch) {
    extracted.rsf = parseInt(rsfMatch[1].replace(/,/g, ""));
  }

  // Extract address
  const addressMatch = emailBody.match(/(\d+\s+[A-Z][a-zA-Z\s]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln))/i);
  if (addressMatch) {
    extracted.propertyAddress = addressMatch[1].trim();
  }

  // Extract city/state
  const cityStateMatch = emailBody.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/);
  if (cityStateMatch) {
    extracted.propertyCity = cityStateMatch[1].trim();
    extracted.propertyState = cityStateMatch[2].trim();
  }

  // Extract date (look for common date patterns)
  const dateMatch = emailBody.match(/(?:close|commence|start|deadline)[:\s]+([\d]{1,2}[\/-][\d]{1,2}[\/-][\d]{2,4})/i);
  if (dateMatch) {
    extracted.expectedCloseDate = dateMatch[1];
  }

  // Use email body as notes if structured data found
  if (Object.keys(extracted).length > 0) {
    extracted.notes = emailBody;
  }

  return extracted;
}

/**
 * Create deal from email
 */
export function createDealFromEmail(email: EmailMessage): Partial<Deal> {
  const parsed = parseEmailForDeal(email.body, email.subject);
  
  return {
    clientName: parsed.clientName || email.from.split("@")[0],
    clientCompany: parsed.clientCompany,
    propertyAddress: parsed.propertyAddress,
    propertyCity: parsed.propertyCity,
    propertyState: parsed.propertyState,
    rsf: parsed.rsf,
    expectedCloseDate: parsed.expectedCloseDate,
    notes: parsed.notes || email.body,
    // Link email to deal
    activities: [
      {
        id: nanoid(),
        type: "email",
        description: `Email from ${email.from}: ${email.subject}`,
        timestamp: email.date,
      },
    ],
  };
}

/**
 * Get email templates
 */
export function getEmailTemplates(): EmailTemplate[] {
  try {
    const stored = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultEmailTemplates();
  } catch {
    return getDefaultEmailTemplates();
  }
}

function getDefaultEmailTemplates(): EmailTemplate[] {
  return [
    {
      id: "proposal-followup",
      name: "Proposal Follow-up",
      subject: "Proposal for {{clientName}} - {{propertyAddress}}",
      body: `Dear {{clientName}},

I wanted to follow up on the proposal we sent for {{propertyAddress}}.

Key highlights:
- RSF: {{rsf}}
- Effective Rate: {{effectiveRate}}/SF/yr
- Total Lease Value: {{totalValue}}

Please let me know if you have any questions or would like to discuss further.

Best regards,
{{brokerName}}`,
      category: "proposal",
      variables: ["{{clientName}}", "{{propertyAddress}}", "{{rsf}}", "{{effectiveRate}}", "{{totalValue}}", "{{brokerName}}"],
    },
    {
      id: "meeting-request",
      name: "Meeting Request",
      subject: "Property Tour Request - {{propertyAddress}}",
      body: `Hi {{clientName}},

I'd like to schedule a property tour for {{propertyAddress}}.

Available dates:
- {{date1}}
- {{date2}}
- {{date3}}

Please let me know what works best for you.

Best,
{{brokerName}}`,
      category: "meeting",
      variables: ["{{clientName}}", "{{propertyAddress}}", "{{date1}}", "{{date2}}", "{{date3}}", "{{brokerName}}"],
    },
    {
      id: "thank-you",
      name: "Thank You",
      subject: "Thank You - {{clientName}}",
      body: `Dear {{clientName}},

Thank you for your interest in {{propertyAddress}}.

I'm excited to work with you on this opportunity and will keep you updated on any developments.

Best regards,
{{brokerName}}`,
      category: "thank-you",
      variables: ["{{clientName}}", "{{propertyAddress}}", "{{brokerName}}"],
    },
  ];
}

/**
 * Save email template
 */
export function saveEmailTemplate(template: Omit<EmailTemplate, "id">): EmailTemplate {
  const templates = getEmailTemplates();
  const newTemplate: EmailTemplate = {
    ...template,
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  templates.push(newTemplate);
  localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

/**
 * Render email template with variables
 */
export function renderEmailTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, "g"), value);
    body = body.replace(new RegExp(placeholder, "g"), value);
  });

  return { subject, body };
}

/**
 * Send email with attachment
 * In production, this would call the email API
 */
export async function sendEmail(
  to: string[],
  subject: string,
  body: string,
  attachments?: Array<{
    filename: string;
    content: Blob;
    mimeType: string;
  }>,
  fromEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // In production, this would:
  // 1. Get access token for email account
  // 2. Call Gmail API or Outlook API to send email
  // 3. Attach files if provided
  // 4. Return success/error
  
  // For now, simulate success
  return {
    success: true,
    messageId: `msg-${Date.now()}`,
  };
}

/**
 * Track email opens
 * In production, this would use email tracking pixels
 */
export function trackEmailOpen(messageId: string): void {
  // In production, this would:
  // 1. Record open event
  // 2. Update analytics
  // 3. Send notification if enabled
  
  console.log(`Email opened: ${messageId}`);
}

/**
 * Get email thread for a deal
 */
export async function getEmailThreadForDeal(dealId: string): Promise<EmailMessage[]> {
  // In production, this would:
  // 1. Get linked email IDs from deal
  // 2. Fetch email thread from email API
  // 3. Return thread messages
  
  return [];
}

