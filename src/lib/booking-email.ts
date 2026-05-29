import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

type MailAddress = {
  email: string;
  name?: string;
};

type BookingEmailParams = {
  projectName: string;
  startsAt: string;
  endsAt: string;
  hostName: string;
  hostEmail?: string | null;
  guestName: string;
  guestEmail: string;
  googleMeetUrl?: string | null;
};

type CloudflareContextWithBrevo = {
  env?: {
    BREVO_API_KEY?: string;
    BREVO_FROM_EMAIL?: string;
    BREVO_FROM_NAME?: string;
    ADMIN_EMAILS?: string;
  };
};

function getEnvValue(key: keyof NonNullable<CloudflareContextWithBrevo["env"]>) {
  if (process.env[key]) {
    return process.env[key];
  }

  try {
    const context = getCloudflareContext() as CloudflareContextWithBrevo;
    return context.env?.[key];
  } catch {
    return undefined;
  }
}

function splitEmails(value?: string) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function uniqueRecipients(recipients: MailAddress[]) {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatDateTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startsAt))} - ${timeFormatter.format(new Date(endsAt))}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendBrevoEmail(params: {
  to: MailAddress[];
  subject: string;
  textContent: string;
  htmlContent: string;
}) {
  const apiKey = getEnvValue("BREVO_API_KEY");
  const fromEmail = getEnvValue("BREVO_FROM_EMAIL");
  const fromName = getEnvValue("BREVO_FROM_NAME") ?? "FirstAI予約";

  if (!apiKey || !fromEmail) {
    console.warn("Brevo email is skipped because BREVO_API_KEY or BREVO_FROM_EMAIL is not set.");
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: params.to,
      subject: params.subject,
      textContent: params.textContent,
      htmlContent: params.htmlContent,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Brevo email failed: ${response.status} ${detail}`);
  }
}

export async function sendBookingCreatedEmails(params: BookingEmailParams) {
  const dateTime = formatDateTimeRange(params.startsAt, params.endsAt);
  const meetText = params.googleMeetUrl
    ? `Google Meet: ${params.googleMeetUrl}`
    : "Google Meet URLは担当者側の連携状況により未発行です。";
  const meetHtml = params.googleMeetUrl
    ? `<p><a href="${escapeHtml(params.googleMeetUrl)}">Google Meetを開く</a></p>`
    : "<p>Google Meet URLは担当者側の連携状況により未発行です。</p>";

  const guestSubject = `【${params.projectName}】予約を受け付けました`;
  const guestText = `${params.guestName}様

ご予約を受け付けました。

日時: ${dateTime}
担当者: ${params.hostName}
${meetText}

当日は時間になりましたら上記URLからご参加ください。`;
  const guestHtml = `<p>${escapeHtml(params.guestName)}様</p>
<p>ご予約を受け付けました。</p>
<ul>
  <li>日時: ${escapeHtml(dateTime)}</li>
  <li>担当者: ${escapeHtml(params.hostName)}</li>
</ul>
${meetHtml}
<p>当日は時間になりましたら上記URLからご参加ください。</p>`;

  const adminRecipients = uniqueRecipients([
    ...(params.hostEmail ? [{ email: params.hostEmail, name: params.hostName }] : []),
    ...splitEmails(getEnvValue("ADMIN_EMAILS")).map((email) => ({ email })),
  ]);
  const adminSubject = `【新規予約】${params.projectName}`;
  const adminText = `新しい予約が入りました。

予約ページ: ${params.projectName}
日時: ${dateTime}
担当者: ${params.hostName}
お客様: ${params.guestName}
メール: ${params.guestEmail}
${meetText}`;
  const adminHtml = `<p>新しい予約が入りました。</p>
<ul>
  <li>予約ページ: ${escapeHtml(params.projectName)}</li>
  <li>日時: ${escapeHtml(dateTime)}</li>
  <li>担当者: ${escapeHtml(params.hostName)}</li>
  <li>お客様: ${escapeHtml(params.guestName)}</li>
  <li>メール: ${escapeHtml(params.guestEmail)}</li>
</ul>
${meetHtml}`;

  const tasks = [
    sendBrevoEmail({
      to: [{ email: params.guestEmail, name: params.guestName }],
      subject: guestSubject,
      textContent: guestText,
      htmlContent: guestHtml,
    }),
  ];

  if (adminRecipients.length > 0) {
    tasks.push(
      sendBrevoEmail({
        to: adminRecipients,
        subject: adminSubject,
        textContent: adminText,
        htmlContent: adminHtml,
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason);
    }
  }
}
