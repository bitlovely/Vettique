import type { AuthError } from "@supabase/supabase-js";

type AuthTab = "login" | "signup";

/**
 * GoTrue often returns `unexpected_failure` / "Error sending confirmation email" when
 * SMTP or Auth mail fails. The underlying reason is not exposed to the client; it
 * appears in Supabase Dashboard → Logs (Auth / API).
 */
export function formatAuthErrorMessage(error: AuthError, tab: AuthTab): string {
  const raw = (error.message || "").trim() || "Something went wrong.";
  const code =
    typeof (error as { code?: unknown }).code === "string"
      ? ((error as { code: string }).code as string)
      : undefined;
  const status =
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  const looksLikeConfirmationEmailFailure =
    tab === "signup" &&
    (code === "unexpected_failure" ||
      /confirmation email|error sending.*mail|sending confirmation/i.test(raw));

  if (looksLikeConfirmationEmailFailure) {
    const parts = [
      "We could not send the confirmation email. That usually means mail is misconfigured in your Supabase project (not a problem with the password you chose).",
      "Typical fixes: Authentication → Emails → configure custom SMTP (host, port, user, password/API key, sender) exactly as your provider (e.g. Resend) specifies; verify the sending domain (SPF/DKIM) in the provider; check Supabase Auth rate limits.",
      "While DNS or SMTP is still broken, you can temporarily turn off “Confirm email” under Authentication → Providers → Email so sign-ups are not blocked.",
      "The exact SMTP/API error is only in Supabase → Logs → filter Auth or Edge — the API does not return that text to the browser for security.",
    ];
    if (code) parts.push(`Reference code: ${code}.`);
    if (status) parts.push(`HTTP status: ${status}.`);
    return parts.join(" ");
  }

  const suffix =
    code && !raw.includes(code) ? ` (${code})` : status ? ` (HTTP ${status})` : "";
  return `${raw}${suffix}`;
}
