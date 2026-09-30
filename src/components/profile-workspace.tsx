import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, LogOut, Save } from "lucide-react";
import { getAIPreferences, getProfile, updateAIPreferences, updateProfile, type AIPreferences, type AIPreferencesInput, type Profile } from "@/lib/api";
import { getJWTToken } from "@/lib/auth-client";
import { ValidatedForm } from "./ui";
import styles from "./profile-workspace.module.css";

type Props = {
  fallbackName: string;
  fallbackEmail: string;
  sessionToken?: string;
  sessionExpiresAt?: string;
  onProfileUpdated: (profile: Profile) => void;
  onPrivacy: () => void;
  onSignOut: () => void;
  onPasswordReset: () => Promise<void>;
};

function preferenceLines(value: string): string[] {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

export function ProfileWorkspace({ fallbackName, fallbackEmail, sessionToken, sessionExpiresAt, onProfileUpdated, onPrivacy, onSignOut, onPasswordReset }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<AIPreferences | null>(null);
  const [name, setName] = useState(fallbackName);
  const [avatar, setAvatar] = useState("");
  const [writingStyle, setWritingStyle] = useState<NonNullable<AIPreferencesInput["writing_style"]>>("natural");
  const [detail, setDetail] = useState<NonNullable<AIPreferencesInput["response_detail"]>>("balanced");
  const [goals, setGoals] = useState("");
  const [interests, setInterests] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const accountLock = useRef(false);
  const preferenceLock = useRef(false);
  const mounted = useRef(true);

  const requiredToken = useCallback(async () => {
    const token = await getJWTToken({ token: sessionToken, expiresAt: sessionExpiresAt });
    if (!token) throw new Error("Your session has expired. Sign in again.");
    return token;
  }, [sessionToken, sessionExpiresAt]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const token = await requiredToken();
      const [account, ai] = await Promise.all([getProfile(token), getAIPreferences(token)]);
      if (!mounted.current) return;
      setProfile(account);
      setPreferences(ai);
      setName(account.display_name ?? fallbackName);
      setAvatar(account.avatar_url ?? "");
      setWritingStyle(ai.writing_style ?? "natural");
      setDetail(ai.response_detail ?? "balanced");
      setGoals((ai.personal_goals ?? []).join("\n"));
      setInterests((ai.interests ?? []).join("\n"));
    } catch (error) {
      if (mounted.current) setLoadError(error instanceof Error ? error.message : "Unable to load your profile.");
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [fallbackName, requiredToken]);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); mounted.current = false; };
  }, [load]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountLock.current) return;
    accountLock.current = true;
    setIsSavingAccount(true);
    setAccountStatus("");
    setActionError("");
    try {
      const updated = await updateProfile(await requiredToken(), { display_name: name.trim() || null, avatar_url: avatar.trim() || null });
      if (!mounted.current) return;
      setProfile(updated);
      setAccountStatus("Profile saved.");
      onProfileUpdated(updated);
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      accountLock.current = false;
      if (mounted.current) setIsSavingAccount(false);
    }
  }

  async function savePreferences(input: AIPreferencesInput, consentOnly = false) {
    if (preferenceLock.current) return;
    for (const items of [input.personal_goals, input.interests]) {
      if (items && (items.length > 20 || items.some(item => item.length > 200))) {
        setActionError("Use up to 20 goals or topics, with at most 200 characters each.");
        return;
      }
    }
    preferenceLock.current = true;
    setIsSavingPreferences(true);
    setPreferenceStatus("");
    setActionError("");
    try {
      const updated = await updateAIPreferences(await requiredToken(), input);
      if (!mounted.current) return;
      setPreferences(updated);
      setPreferenceStatus(consentOnly ? updated.use_profile_context ? "Profile context enabled." : "Profile context disabled." : "AI preferences saved.");
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : "Unable to save AI preferences.");
    } finally {
      preferenceLock.current = false;
      if (mounted.current) setIsSavingPreferences(false);
    }
  }

  async function resetPassword() {
    if (isResettingPassword) return;
    setIsResettingPassword(true);
    setActionError("");
    try { await onPasswordReset(); }
    catch (error) { if (mounted.current) setActionError(error instanceof Error ? error.message : "Unable to send a reset code."); }
    finally { if (mounted.current) setIsResettingPassword(false); }
  }

  const email = profile?.email ?? fallbackEmail;
  const avatarUrl = profile?.avatar_url;
  return (
    <section className={styles.workspace} aria-labelledby="profile-title">
      <header className={styles.header}>
        <div className={styles.avatar} aria-hidden="true">
          {avatarUrl && failedAvatar !== avatarUrl ? (
            // User-supplied HTTPS image; no server fetch or image-proxy allowlist is needed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatarUrl)} />
          ) : (profile?.display_name || fallbackName || "M").slice(0, 1).toUpperCase()}
        </div>
        <div><h1 id="profile-title">Profile</h1><p>{email}</p></div>
      </header>
      {isLoading ? <p role="status" className={styles.status}>Loading your profile...</p> : loadError ? <div role="alert" className={styles.error}><p>{loadError}</p><button className="mp-button mp-button-secondary" type="button" onClick={() => void load()}>Try again</button></div> : <>
        <ValidatedForm className={styles.section} onSubmit={saveAccount}>
          <h2>Account</h2>
          <div className={styles.fields}>
            <label>Preferred name<input className="modern-control" value={name} onChange={event => setName(event.target.value)} autoComplete="nickname" maxLength={255} /></label>
            <label>Email<input className="modern-control" value={email} type="email" readOnly autoComplete="email" /></label>
            <label className={styles.fullWidth}>Avatar URL<input className="modern-control" value={avatar} onChange={event => setAvatar(event.target.value)} type="url" pattern="https://.*" placeholder="https://" maxLength={2048} /></label>
          </div>
          <div className={styles.actions}><button className="mp-button mp-button-primary" disabled={isSavingAccount}><Save size={16} aria-hidden="true" />{isSavingAccount ? "Saving..." : "Save profile"}</button><span role="status">{accountStatus}</span></div>
        </ValidatedForm>
        <section className={styles.section} aria-labelledby="personalization-title">
          <h2 id="personalization-title">AI personalization</h2>
          <label className={styles.consent}><span>Use my profile with Ask my mind</span><input type="checkbox" checked={preferences?.use_profile_context ?? false} disabled={isSavingPreferences} onChange={event => void savePreferences({ use_profile_context: event.target.checked }, true)} /></label>
          <p className={styles.disclosure}>When enabled, your preferred name, goals, topics, and response preferences may be sent to OpenAI with your question. Your email and avatar are not sent. Thought permissions stay unchanged.</p>
          <ValidatedForm onSubmit={event => { event.preventDefault(); void savePreferences({ writing_style: writingStyle, response_detail: detail, personal_goals: preferenceLines(goals), interests: preferenceLines(interests) }); }}>
            <div className={styles.fields}>
              <label>Writing style<select className="modern-control" value={writingStyle} onChange={event => setWritingStyle(event.target.value as typeof writingStyle)}><option value="natural">Natural</option><option value="conversational">Conversational</option><option value="formal">Formal</option></select></label>
              <label>Response length<select className="modern-control" value={detail} onChange={event => setDetail(event.target.value as typeof detail)}><option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select></label>
              <div className={styles.field}><label htmlFor="profile-goals">Personal goals</label><textarea id="profile-goals" className="modern-control" value={goals} onChange={event => setGoals(event.target.value)} rows={4} maxLength={4020} placeholder="One goal per line" /></div>
              <div className={styles.field}><label htmlFor="profile-interests">Topics I care about</label><textarea id="profile-interests" className="modern-control" value={interests} onChange={event => setInterests(event.target.value)} rows={4} maxLength={4020} placeholder="One topic per line" /></div>
            </div>
            <div className={styles.actions}><button className="mp-button mp-button-secondary" disabled={isSavingPreferences}><Save size={16} aria-hidden="true" />{isSavingPreferences ? "Saving..." : "Save AI preferences"}</button><span role="status">{preferenceStatus}</span></div>
          </ValidatedForm>
        </section>
        <section className={styles.section} aria-labelledby="security-title"><h2 id="security-title">Security &amp; data</h2><div className={styles.securityActions}>
          <button className="mp-button mp-button-secondary" type="button" onClick={() => void resetPassword()} disabled={isResettingPassword}><KeyRound size={16} aria-hidden="true" />{isResettingPassword ? "Sending code..." : "Reset password"}</button>
          <button className="mp-button mp-button-secondary" type="button" onClick={onPrivacy}><LockKeyhole size={16} aria-hidden="true" />Privacy &amp; data</button>
          <button className="mp-button mp-button-ghost" type="button" onClick={onSignOut}><LogOut size={16} aria-hidden="true" />Sign out</button>
        </div></section>
      </>}
      {actionError ? <p className={styles.error} role="alert">{actionError}</p> : null}
    </section>
  );
}
