"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.chequeEmail = chequeEmail;
exports.tenantRenewalEmail = tenantRenewalEmail;
exports.landlordContractEmail = landlordContractEmail;
exports.serviceChargeEmail = serviceChargeEmail;
async function sendEmail(to, subject, html, type = 'general') {
    const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log(`[EMAIL SKIPPED — no N8N_EMAIL_WEBHOOK_URL] To: ${to} | ${subject}`);
        return;
    }
    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html, type }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`n8n webhook error ${res.status}: ${text}`);
    }
    console.log(`[EMAIL SENT] To: ${to} | ${subject} | type: ${type}`);
}
function chequeEmail(cheque, days) {
    const urgency = days <= 1 ? '#c0392b' : days <= 7 ? '#e67e22' : '#2980b9';
    const label = days <= 1 ? '🚨 URGENT' : days <= 7 ? '⚠️ SOON' : '📅 UPCOMING';
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:${urgency};color:#fff;padding:20px">
    <h2 style="margin:0">Cheque Due Reminder | تذكير بموعد الشيك</h2>
    <p style="margin:4px 0 0">${label} — ${days} day${days === 1 ? '' : 's'} remaining</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Tenant</td><td style="padding:8px;border:1px solid #eee"><b>${cheque.tenant_name}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Building / Unit</td><td style="padding:8px;border:1px solid #eee">${cheque.building_name} — ${cheque.unit_number}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Amount</td><td style="padding:8px;border:1px solid #eee"><b>AED ${cheque.amount.toLocaleString()}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Due Date</td><td style="padding:8px;border:1px solid #eee">${cheque.due_date}</td></tr>
      ${cheque.bank_name ? `<tr><td style="padding:8px;border:1px solid #eee;color:#666">Bank</td><td style="padding:8px;border:1px solid #eee">${cheque.bank_name}</td></tr>` : ''}
      ${cheque.cheque_number ? `<tr><td style="padding:8px;border:1px solid #eee;color:#666">Cheque #</td><td style="padding:8px;border:1px solid #eee">${cheque.cheque_number}</td></tr>` : ''}
    </table>
    <p style="color:#666;margin-top:16px;font-size:14px">Please ensure this cheque is deposited on time to avoid any issues.</p>
  </div>
</div>`;
}
function tenantRenewalEmail(tenant, days) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1a5276;color:#fff;padding:20px">
    <h2 style="margin:0">Tenancy Contract Renewal Notice</h2>
    <p style="margin:4px 0 0">إشعار تجديد عقد الإيجار</p>
  </div>
  <div style="padding:24px">
    <p>Dear <b>${tenant.full_name}</b>,</p>
    <p>Your tenancy contract for unit <b>${tenant.unit_number} — ${tenant.building_name}</b> will expire in <b>${days} days</b> on <b>${tenant.contract_end}</b>.</p>
    <p>Please contact your landlord at your earliest convenience to discuss renewal terms.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p>عزيزي/عزيزتي <b>${tenant.full_name}</b>،</p>
    <p>ينتهي عقد إيجارك للوحدة <b>${tenant.unit_number} — ${tenant.building_name}</b> خلال <b>${days} يوماً</b> بتاريخ <b>${tenant.contract_end}</b>.</p>
    <p>يرجى التواصل مع المالك في أقرب وقت ممكن لمناقشة شروط التجديد.</p>
    <p style="color:#666;font-size:13px;margin-top:24px">This is an automated notice from your property management system.</p>
  </div>
</div>`;
}
function landlordContractEmail(tenant, days, annualRent, reraInfo) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1e8449;color:#fff;padding:20px">
    <h2 style="margin:0">📋 Contract Expiring — Action Required</h2>
    <p style="margin:4px 0 0">${days} days remaining</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Tenant</td><td style="padding:8px;border:1px solid #eee"><b>${tenant.full_name}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Email</td><td style="padding:8px;border:1px solid #eee">${tenant.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Unit</td><td style="padding:8px;border:1px solid #eee">${tenant.unit_number} — ${tenant.building_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Contract End</td><td style="padding:8px;border:1px solid #eee">${tenant.contract_end}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Current Rent</td><td style="padding:8px;border:1px solid #eee">AED ${annualRent.toLocaleString()}/year</td></tr>
    </table>
    <div style="background:#f8f9fa;border-radius:6px;padding:16px;margin-top:20px">
      <h3 style="margin:0 0 8px;color:#1a5276">🏛️ RERA Rent Increase Check</h3>
      <pre style="white-space:pre-wrap;font-family:Arial;font-size:13px;margin:0">${reraInfo}</pre>
    </div>
    <p style="color:#666;font-size:13px;margin-top:16px">✅ A renewal notice has been sent to the tenant at ${tenant.email}.</p>
  </div>
</div>`;
}
function serviceChargeEmail(unit) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#7d3c98;color:#fff;padding:20px">
    <h2 style="margin:0">🏢 Service Charge Due</h2>
    <p style="margin:4px 0 0">Annual service charge reminder</p>
  </div>
  <div style="padding:24px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Building</td><td style="padding:8px;border:1px solid #eee"><b>${unit.building_name}</b></td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Unit</td><td style="padding:8px;border:1px solid #eee">${unit.unit_number}</td></tr>
      <tr><td style="padding:8px;border:1px solid #eee;color:#666">Annual Amount</td><td style="padding:8px;border:1px solid #eee"><b>AED ${unit.service_charge.toLocaleString()}</b></td></tr>
    </table>
    <p style="color:#666;margin-top:16px;font-size:14px">Please arrange payment to Dubai Land Department / building management to avoid late fees.</p>
  </div>
</div>`;
}
//# sourceMappingURL=email.js.map