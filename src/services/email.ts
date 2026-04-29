import nodemailer from 'nodemailer';
import type { Cheque, Contract, ServiceCharge } from '../types';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log(`[EMAIL SKIPPED — no Gmail credentials] To: ${to} | ${subject}`);
    return;
  }
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail({
      from: `"Dubai Property Manager" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] To: ${to} | ${subject} | messageId: ${info.messageId}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL ERROR] To: ${to} | ${subject} | ${msg}`, err);
    throw err;
  }
}

export function chequeEmail(cheque: Cheque, days: number): string {
  const urgency = days <= 7 ? '#c0392b' : days <= 14 ? '#e67e22' : '#2980b9';
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:${urgency};color:#fff;padding:20px">
    <h2 style="margin:0">Cheque Due Reminder | تذكير بموعد الشيك</h2>
    <p style="margin:4px 0 0">${days <= 7 ? '🚨 URGENT' : days <= 14 ? '⚠️ SOON' : '📅 UPCOMING'} — ${days} days remaining</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Tenant</td><td style="padding:8px;border:1px solid #eee"><b>${cheque.tenantName}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Unit</td><td style="padding:8px;border:1px solid #eee">${cheque.unit}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Amount</td><td style="padding:8px;border:1px solid #eee"><b>AED ${cheque.amount.toLocaleString()}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Due Date</td><td style="padding:8px;border:1px solid #eee">${cheque.chequeDate}</td></tr>
    </table>
    <p style="color:#666;margin-top:16px;font-size:14px">Please ensure this cheque is deposited on time to avoid any issues.</p>
  </div>
</div>`;
}

export function tenantRenewalEmail(contract: Contract, days: number): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1a5276;color:#fff;padding:20px">
    <h2 style="margin:0">Tenancy Contract Renewal Notice</h2>
    <p style="margin:4px 0 0">إشعار تجديد عقد الإيجار</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${contract.tenantName}</b>,</p>
    <p>Your tenancy contract for unit <b>${contract.unit}</b> will expire in <b>${days} days</b> on <b>${contract.endDate}</b>.</p>
    <p>Please contact your landlord at your earliest convenience to discuss renewal terms.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي/عزيزتي <b>${contract.tenantName}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${contract.unit}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${contract.endDate}</b>.</p>
    <p>يرجى التواصل مع المالك في أقرب وقت ممكن لمناقشة شروط التجديد.</p>
    <p style="color:#666;font-size:13px;margin-top:24px">This is an automated notice from your property management system.</p>
  </div>
</div>`;
}

export function landlordContractEmail(contract: Contract, days: number, reraInfo: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1e8449;color:#fff;padding:20px">
    <h2 style="margin:0">📋 Contract Expiring — Action Required</h2>
    <p style="margin:4px 0 0">${days} days remaining</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Tenant</td><td style="padding:8px;border:1px solid #eee"><b>${contract.tenantName}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Email</td><td style="padding:8px;border:1px solid #eee">${contract.tenantEmail}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Unit</td><td style="padding:8px;border:1px solid #eee">${contract.unit}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Contract End</td><td style="padding:8px;border:1px solid #eee">${contract.endDate}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Current Rent</td><td style="padding:8px;border:1px solid #eee">AED ${contract.rentAmount.toLocaleString()}/year</td></tr>
    </table>
    <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin-top:20px">
      <h3 style="margin:0 0 8px;color:#1a5276">🏛️ RERA Rent Increase Check</h3>
      <pre style="white-space:pre-wrap;font-family:Arial;font-size:13px;margin:0">${reraInfo}</pre>
    </div>
    <p style="color:#666;font-size:13px;margin-top:16px">✅ A renewal notice has been sent to the tenant at ${contract.tenantEmail}.</p>
  </div>
</div>`;
}

export function serviceChargeEmail(charge: ServiceCharge): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#7d3c98;color:#fff;padding:20px">
    <h2 style="margin:0">🏢 Service Charge Due</h2>
    <p style="margin:4px 0 0">Quarterly payment reminder</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Property</td><td style="padding:8px;border:1px solid #eee"><b>${charge.propertyName}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Unit</td><td style="padding:8px;border:1px solid #eee">${charge.unit}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Amount Due</td><td style="padding:8px;border:1px solid #eee"><b>AED ${charge.amount.toLocaleString()}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Due Date</td><td style="padding:8px;border:1px solid #eee">${charge.nextDueDate}</td></tr>
    </table>
    <p style="color:#666;margin-top:16px;font-size:14px">Please arrange payment to Dubai Land Department / building management to avoid late fees.</p>
  </div>
</div>`;
}
