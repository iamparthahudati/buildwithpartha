# AI feature guardrails

AI is a future optional layer, not the operating foundation of LifeOS.

## Allowed first experiments

- Generate a proposed task checklist from selected user text.
- Categorize selected brain-dump items into proposed destinations.
- Summarize a user-selected date range or project activity.
- Suggest a draft daily/weekly plan using explicit capacity and selected work.

## Prohibited without a new decision

- Silent creation, rescheduling, completion, deletion, or messaging.
- Training on user data by default.
- Sending all LifeOS data when a narrower selection is sufficient.
- Using attachments or external content without prompt-injection isolation.
- Presenting guesses as facts or mental/medical/financial advice.

## Required before any AI ticket becomes Ready

- provider/model/data-region decision and contract review;
- data-flow and privacy impact diagram;
- retention/training controls;
- threat model, prompt-injection and exfiltration tests;
- cost/rate limits and per-user opt-in;
- preview/diff/confirm/undo UX;
- non-AI fallback and deletion/export treatment;
- observability that avoids logging sensitive prompts or outputs.

