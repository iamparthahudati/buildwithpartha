# Authentication and onboarding wireframes

## Public entry — `/life-os`

```text
DESKTOP                                  MOBILE
┌──────────────────────────────────┐     ┌──────────────────────┐
│ LifeOS [A Logo]     Sign in      │     │ LifeOS      Sign in  │
├──────────────────────────────────┤     ├──────────────────────┤
│                                  │     │ Private planning,    │
│ Private planning for your life   │     │ focus and review.    │
│ One source for projects, time,   │     │                      │
│ focus and reflection.            │     │ (*) Create account   │
│                                  │     │     Sign in           │
│ (*) Create account  Sign in      │     ├──────────────────────┤
│                                  │     │ Privacy · Terms      │
│ [What stays private] [Core loop] │     └──────────────────────┘
├──────────────────────────────────┤
│ Privacy · Terms · buildwithpartha│
└──────────────────────────────────┘
```

No private app metrics, fake records, dashboard screenshot data or authenticated shell. `[A] Logo/Button/Link/Typography`; `[C] public PageFrame`.

## Signup — `/life-os/signup`

```text
┌────────────────────────────────────────┐
│ LifeOS                    Sign in      │
├────────────────────────────────────────┤
│ Create your private LifeOS             │
│ [Name..............................]    │
│ [Email.............................]    │
│ [Password..................][show]      │
│ Password requirements                  │
│ [ ] Accept Terms and Privacy            │
│ [form error summary / inline errors]   │
│ (*) Create account                     │
│ Already have an account? Sign in       │
└────────────────────────────────────────┘
```

Small uses the same single column with full-width primary action. `[A] Input/Password/Checkbox/Button/Link`; `[C] FormField/Alert/ErrorSummary`; `[F] AuthForm/PasswordRequirements`.

## Login — `/life-os/login`

```text
┌────────────────────────────────────────┐
│ LifeOS                                  │
├────────────────────────────────────────┤
│ Welcome back                           │
│ [Email.............................]    │
│ [Password..................][show]      │
│ Forgot password?                       │
│ [generic auth error]                   │
│ (*) Sign in                            │
│ New to LifeOS? Create account          │
└────────────────────────────────────────┘
```

Pending locks duplicate submission but preserves layout. Valid `returnTo` is invisible unless context copy helps (“Sign in to continue to your task”).

## Verification and recovery

```text
SENT / VERIFYING / SUCCESS / INVALID      FORGOT / RESET
┌────────────────────────────────────┐    ┌────────────────────────────────┐
│ [F VerificationState]              │    │ Reset your password            │
│ We sent a verification link.       │    │ [Email] OR [New password]      │
│ [resend cooldown/status]           │    │ [generic result/error]         │
│ (*) Continue / Resend / Sign in    │    │ (*) Send link / Reset          │
└────────────────────────────────────┘    └────────────────────────────────┘
```

Result language never reveals whether an email exists. Token values never render back into the page.

## Onboarding — `/life-os/app/onboarding`

```text
DESKTOP
┌────────────────────────────────────────────────────────────┐
│ LifeOS                                       Sign out       │
├───────────────┬────────────────────────────────────────────┤
│ 1 Welcome  ✓  │ Step heading                               │
│ 2 Time      • │ Short explanation                          │
│ 3 Planning    │                                            │
│ 4 Start       │ [F step-specific FormFields]               │
│               │ [preview / optional explanation]           │
│               │                                            │
│               │ Back       Skip (optional)  (*) Continue   │
│               │ Saved / Saving / Error                     │
└───────────────┴────────────────────────────────────────────┘

MOBILE
┌──────────────────────────────┐
│ LifeOS             Sign out  │
│ Step 2 of 4                  │
├──────────────────────────────┤
│ Time and week                │
│ [Timezone search]            │
│ [current-time preview]       │
│ [Week starts]                │
│ [Locale/time format]         │
│ [error summary]              │
├──────────────────────────────┤
│ Back              (*) Next  │
└──────────────────────────────┘
```

Step 4 shows Start empty as default, then optional first task/project/capture only when real services exist. It never shows fictional starter data.

## Public failure pages

Unavailable and Not Found use `[C] ErrorState` with LifeOS identity, Retry/Go to entry, correlation ID only for unexpected failures, and no authenticated navigation or private cached content.
