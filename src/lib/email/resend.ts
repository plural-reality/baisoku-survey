import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "倍速アンケート <onboarding@resend.dev>";

interface CompletionNotificationParams {
  to: string;
  presetTitle: string;
  presetSlug: string;
  sessionCount: number;
}

export async function sendCompletionNotification({
  to,
  presetTitle,
  presetSlug,
  sessionCount,
}: CompletionNotificationParams): Promise<void> {
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY 未設定のためスキップ: to=${to}, preset=${presetSlug}`
    );
    return;
  }

  const manageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/preset/${presetSlug}`;

  await resend.emails.send({
    from: fromEmail,
    to,
    subject: `新しい回答が完了しました - ${presetTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; color: #1a1a1a; margin-bottom: 8px;">新しい回答が完了しました</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 16px;">
          「<strong>${presetTitle}</strong>」に新しい回答が寄せられ、レポートが生成されました。
        </p>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
          現在の完了済み回答数: <strong>${sessionCount}件</strong>
        </p>
        <a href="${manageUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">
          管理画面を開く
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          このメールは倍速アンケートの通知設定により送信されています。管理画面から通知をオフにできます。
        </p>
      </div>
    `,
  });
}
