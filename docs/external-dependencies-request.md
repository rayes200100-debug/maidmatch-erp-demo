# MaidMatch ERP — External Dependency Request

**To:** maids.cc technical team
**From:** MaidMatch ERP project
**Date:** 3 September 2026
**Status:** Awaiting response — see §7 for how to reply

---

## 1. Why you're reading this

MaidMatch is being built as a dedicated ERP for the retraction → media production → publishing → trial pipeline. It is not a standalone product: at almost every step it either reads from maids.cc, writes back to maids.cc, or pushes to one of the three publishing platforms.

We have designed and prototyped the full workflow already. What we cannot do is build against systems we can't see. This document is the complete list of everything we need from outside our own team, so we can agree scope and sequencing in one pass rather than discovering blockers one at a time mid-build.

**Please read §2 before §3.** It defines what "we have that API" needs to mean for it to actually unblock us.

---

## 2. What we are asking for — and what is not enough

> **An endpoint URL is not an integration.**

We have been in this situation before: a list of URLs arrives, the team starts building, and three weeks are then lost to guessing field names, discovering undocumented required parameters, hitting rate limits nobody mentioned, and finding that the sandbox returns different shapes to production.

For **every** item in the register below, we need the following before we can commit to an estimate. This is the standard, not a wish list.

### 2.1 Per-endpoint documentation checklist

| # | Requirement | Why we need it |
|---|---|---|
| 1 | **Base URLs** for sandbox/staging and production, stated separately | We build and test against sandbox for months before we touch production |
| 2 | **Authentication method** — API key, OAuth2 client credentials, mTLS, IP allowlist — plus how we request credentials, token lifetime, and the rotation process | Determines our secret-management design; cannot be retrofitted |
| 3 | **Full request schema** — every parameter, its type, whether it is required, its constraints, and its default | Guessing this is where integrations die |
| 4 | **Full response schema** — every field, its type, **whether it can be null or absent**, and what each value means | Nullability in particular is almost never documented and always bites |
| 5 | **Complete enumerations** — the full allowed value list for every coded field (nationality, housemaid type, complaint type, complaint status, etc.), with the exact strings | Our dropdowns must match yours character-for-character or the data will not join |
| 6 | **Error catalogue** — every HTTP status and error code the endpoint can return, what causes it, and what we should do about it (retry, fail, escalate) | We need to build correct retry and alerting behaviour, not guess |
| 7 | **Rate limits** — requests per second/minute, per what (key, IP, tenant), and the behaviour when exceeded (429? silent throttle? ban?) | Affects our batching and queueing design |
| 8 | **Pagination model** for any list endpoint — offset, cursor, or page-token — and the maximum page size | |
| 9 | **Idempotency** — for every write endpoint, how we safely retry without creating duplicates (idempotency key header? natural key? not supported?) | Networks fail mid-write. Without this we will create duplicate complaints and duplicate profile updates |
| 10 | **Latency expectation / SLA** — typical and worst-case response time, and your uptime commitment | Determines whether we call synchronously or queue |
| 11 | **Versioning and deprecation policy** — how versions are signalled, and how much notice we get before a breaking change | |
| 12 | **A working example per endpoint** — a curl command or a Postman/Insomnia collection with a real (sandbox) request and its real response | One working example resolves more ambiguity than ten pages of prose |
| 13 | **Sandbox credentials and test fixtures** — working credentials plus a set of test housemaid records covering the edge cases (MV, CC, CC-to-MV, with complaints, without complaints, expiring visa) | We cannot build the UI without realistic data |
| 14 | **A named technical contact** per API, and the channel for questions | So questions take hours, not weeks |

### 2.2 Two things that block everything

Two items in the checklist above are worth calling out separately because without them nothing else can proceed:

- **Sandbox environment (item 13).** We will not develop against production, and we will not accept "just be careful". If no sandbox exists, tell us now — building one becomes a project dependency in its own right, with its own timeline.
- **Service-to-service credentials (item 2).** Note this is *separate* from user login. ERP login/SSO for our staff is already solved on our side; what we need here is machine authentication for the ERP backend calling your APIs.

### 2.3 Where an API doesn't exist yet

If an item below has no API today, that is a perfectly acceptable answer — but we need it stated explicitly, along with whether you intend to build it, who owns it, and a realistic date. **A silent omission is the worst outcome**, because we will plan around a capability that never arrives.

For anything not available, please also tell us the interim option (manual export, direct database read, CSV drop, screen-scrape as a last resort) so we can design a fallback rather than a gap.

---

## 3. Dependency register

Items marked **[NEW]** were not on our original list of thirteen — they surfaced when we mapped the register against the working prototype. Your original numbering is preserved in the right-hand column so you can cross-reference.

### 3.1 Business rules and definitions — no API required

These are decisions, not code. We need them written down and agreed, because they are hard-coded into how the system routes work.

| ID | What we need | Why | Yours |
|---|---|---|---|
| **BR-1** | **Definition of a Golden Profile.** The exact rule: which nationalities, age range, visa-expiry window, housemaid types, and any other criteria. Whether it is computed live or a flag stored on the profile. Who owns changes to the rule. | Golden profiles are surfaced across the ERP and feed the retraction priority queue. Our prototype currently guesses (Filipino, 25–40, visa 3–24 months out, MV). | #9 |
| **BR-2** | **Retraction priority algorithm.** How the system decides which profile the retractor must handle next. We have prototyped FIFO, LIFO, Filipina-first and Golden-first — we need to know which is correct, or the real weighting if it's a composite score. Also: is the queue strictly locked to one profile at a time, or can a retractor skip? | This is the core of the retraction screen. Getting it wrong means the team works the wrong maids first. | #10 |
| **BR-3** | **[NEW] System of record.** Once a maid is retracted into the MaidMatch pipeline, who owns her profile — maids.cc or MaidMatch? If both can edit, what is the conflict-resolution rule? Which fields are MaidMatch-authoritative and which are read-only mirrors of maids.cc? | This is the single most consequential architectural question in the whole integration, and it determines whether WR-3 (profile update) is even needed. It must be answered before any endpoint is built. | — |
| **BR-4** | **[NEW] Canonical identifier.** Confirm the stable primary key for a housemaid across both systems. Specifically: does a maid who moves from CC to MV keep one ID or acquire a second? Is the ID we display as "Maids.cc ID" the same key we should use on every API call? | Every record we hold joins on this. If it is unstable or dual, we need to know before we build. | — |
| **BR-5** | **[NEW] Definition of "Moved to Offboarding".** What offboarding actually means operationally, what maids.cc expects to happen, and whether it is reversible. | It is one of our three terminal retraction outcomes and currently does nothing but change a status locally. | — |

### 3.2 maids.cc — read APIs

| ID | What we need | Where it's used | Yours |
|---|---|---|---|
| **RD-1** | **Search housemaid profiles.** Query by name, mobile, WhatsApp, maids.cc ID, nationality, housemaid type. With pagination and a documented sort order. | Reception intake and the housemaid directory — the entry point to the whole system. | #1 |
| **RD-2** | **Retrieve full housemaid profile.** All fields we display: name, nationality, age/DOB, housemaid type (MV / CC / CC-to-MV), mobile, WhatsApp, visa expiry, passport expiry, salary, current employer, current status. Plus anything that feeds BR-1. | Every screen. This is the backbone read. | #2 |
| **RD-3** | **Historical complaints for a housemaid.** Per complaint: type, description/summary, status (open/closed), date raised, assigned team, resolution, and the deep-link URL into the maids.cc ERP record. | Shown on the profile panel during retraction — the retractor's key decision input. | #4 |
| **RD-4** | **WPS salary history.** Which months, what amounts, and what the record means when a month is missing. | Profile panel; feeds retraction decisions. | #7 |
| **RD-5** | **Employment history.** Per placement: employer, start and end date, duration, family size, reason for ending, and whether the record is disputed. | Profile panel. Our prototype currently holds this as free-text strings — we need it structured. | #8 |
| **RD-6** | **[NEW] Reference data / enumerations.** The canonical lists: nationalities, housemaid types, complaint types, complaint statuses, teams. Ideally as an endpoint so we stay in sync; a signed-off static list is acceptable if the values are stable. | Every dropdown in the ERP. Ours are currently hard-coded and will drift out of sync the day yours change. | — |
| **RD-7** | **[NEW] Employer / client lookup.** Search and retrieve employers, so that when a maid goes under trial our sales team selects a real employer record rather than typing a free-text name. | The Under Trial screen currently takes a plain text employer name, which cannot be reconciled with anything. | — |
| **RD-8** | **[NEW] Housemaid documents.** Retrieval of passport copy, visa copy, and any existing profile photos — or confirmation that MaidMatch should not hold these at all. | Needed for the media production step and for expiry verification. Also a PII question — see XC-5. | — |

### 3.3 maids.cc — write APIs

| ID | What we need | Where it's used | Yours |
|---|---|---|---|
| **WR-1** | **Trigger Switch-to-CC flow** for a specific MV maid. Including what the call returns, whether it is synchronous, and how we learn whether the switch succeeded. | The "Retract to CC" outcome in the retraction workspace. | #3 |
| **WR-2** | **Create a complaint** with type, description and assigned team. Returning the created complaint's ID and deep-link URL. Idempotency is critical here. | Raised by ERP users against a housemaid during retraction or trial. | #5 |
| **WR-3** | **Update housemaid profile.** Conditional on BR-3. If MaidMatch can change facts that maids.cc must reflect — for example an MV maid who now has matching preference types — we need a write path, with the exact list of writable fields. | Depends entirely on the answer to BR-3. If maids.cc stays authoritative, this item disappears. | #6 |
| **WR-4** | **[NEW] Trigger offboarding** for a specific maid, mirroring WR-1. | The "Move to Offboarding" terminal outcome. Currently a dead end. | — |
| **WR-5** | **[NEW] Pipeline status sync.** A way to tell maids.cc that a maid is currently in the MaidMatch pipeline and at which stage — so your teams don't double-book or re-route a maid who is mid-shoot or under trial with us. | Prevents two systems acting on the same maid. Could be a status push or a read API you call on us; we're open on direction. | — |
| **WR-6** | **[NEW] Notify on Hired / Cancelled.** When a trial ends, maids.cc almost certainly needs to know — to generate a contract, to release the maid back to the pool, or to record the cancellation reason. | Hired and Cancelled are terminal in our flow and currently notify nobody. | — |

### 3.4 Publishing platforms

Your original items #11–13 asked for a publish API plus a success status for each platform. **We need more than publish.** A maid who is hired, cancelled, or sent back must come *off* the platforms — leaving a placed maid live on Peekaboo is a real commercial and reputational problem. So each of the three platforms needs the same four capabilities.

| ID | Platform | Yours |
|---|---|---|
| **PB-1** | MaidMatch platform | #11 |
| **PB-2** | Peekaboo | #12 |
| **PB-3** | Yaya | #13 |

For **each** of PB-1, PB-2 and PB-3 we need:

| | Capability | Note |
|---|---|---|
| a | **Publish** a housemaid profile | With the confirmation that it succeeded, and the resulting public listing URL |
| b | **Update** an already-published listing | For when media or details change after going live |
| c | **[NEW] Unpublish / delist** | Required for Hired, Cancelled, and "send back to pending publishing". Without this we cannot correctly represent availability |
| d | **[NEW] Read listing status** | So we can reconcile — the ERP must be able to ask "is she actually live right now?" rather than trusting our own last-write state |

And for each platform, the following documentation on top of the §2.1 checklist:

- **[NEW] The required field schema** — exactly which profile fields that platform requires, which are optional, and any content rules (character limits, prohibited content, language).
- **[NEW] Media specifications** — accepted image formats, dimensions, aspect ratios, maximum file size; and for video, format, codec, maximum length and size.
- **[NEW] Whether publishing is synchronous or queued.** If a publish request is accepted and processed later, we need a callback or a status endpoint — otherwise our UI will report success for something that silently failed. Our prototype currently assumes an immediate green tick, which we do not believe is realistic.
- **[NEW] Ownership of each platform integration.** Peekaboo and Yaya may be third parties rather than maids.cc systems. If so, tell us who owns each relationship and who we should be talking to — that is a separate conversation we need to start now, not later.

### 3.5 Events, intake and linking

| ID | What we need | Why | Yours |
|---|---|---|---|
| **EV-1** | **[NEW] How a housemaid enters Reception.** This is the biggest single gap in our original list. Our entire pipeline starts at Reception, and nothing currently defines how a maid arrives there. Is it a webhook from maids.cc when she is checked in? A scheduled poll? Manual entry by a receptionist typing an ID? A scan? | **Without this the ERP has no input at all.** We consider it the highest-priority item in this document. | — |
| **EV-2** | **[NEW] Change notifications.** If a maid's profile changes in maids.cc while she is in our pipeline — visa renewed, new complaint raised, reassigned elsewhere, offboarded independently — how do we find out? Webhook, event stream, or do we poll? If we poll, at what frequency are you comfortable with, given RD-2's rate limits? | Otherwise we will act on stale data. A maid could be hired elsewhere while our team is still shooting her profile. | — |
| **EV-3** | **[NEW] Deep-link URL patterns.** The canonical URL formats for linking from MaidMatch into a maids.cc housemaid profile and into a complaint record. Plus confirmation that an already-signed-in user following the link lands on the record, not a login screen. | We already surface these links in the UI. Right now the formats are invented. | — |

### 3.6 Media storage and production

| ID | What we need | Why | Yours |
|---|---|---|---|
| **MD-1** | **[NEW] Where media lives.** The media team shoots stock photos and video, then delivers edited finals. We need the agreed storage target — your DAM, an S3 bucket, or MaidMatch's own storage — and the upload mechanism, size limits, and retention policy. | Currently our prototype just accepts a URL and assumes someone else solved this. Nobody has. | — |
| **MD-2** | **[NEW] Whether final media flows back to maids.cc.** Once a profile photo and video are produced, does the maids.cc main profile need them? If yes, that is a write path with its own schema. | Determines whether MaidMatch is the media system of record or a producer feeding yours. Related to BR-3. | — |

### 3.7 Cross-cutting

| ID | What we need | Why |
|---|---|---|
| **XC-1** | **Service-to-service authentication.** Method, credential issuance process, token lifetime, rotation procedure, and separate credentials per environment. *(Distinct from ERP user login/SSO, which is already handled on our side.)* | Blocks every API call |
| **XC-2** | **Sandbox environment** with working credentials and realistic test fixtures. | Blocks all development |
| **XC-3** | **Rate limits and expected volumes.** Your limits, and your view on our likely throughput — how many maids per day pass through retraction, so we can size batching and queueing. | Design input |
| **XC-4** | **Idempotency and retry semantics** across all write endpoints (WR-*, PB-*). | Prevents duplicate complaints and duplicate publishes |
| **XC-5** | **PII, retention and data residency.** Housemaid passport numbers, salary, phone numbers and complaint histories will cross a system boundary. We need to know what MaidMatch is permitted to store versus what must be fetched live and discarded, how long we may retain it, and any residency constraints. | Governance. Far cheaper to design in than to retrofit |
| **XC-6** | **Preference / matching vocabulary.** Our retraction step captures housemaid preferences (no babies under 2, live-in vs live-out, day off, and so on). If maids.cc performs employer matching on these, our vocabulary must be yours. Please share the canonical schema — or confirm these are MaidMatch-only. | Otherwise the preferences we capture are unusable downstream |
| **XC-7** | **Escalation path and support hours.** Who we contact when a production integration fails at 9pm, and the expected response time. | Operational readiness |

---

## 4. What we are *not* asking for

To keep the conversation focused — these are already handled on our side and need no input from you:

- DevOps, hosting, CI/CD, environments for the MaidMatch application itself
- ERP **user** login and SSO integration with maids.cc identity
- MaidMatch's internal role and permission model
- Working hours, break policy, and task-assignment configuration

---

## 5. Priority and sequencing

Not everything is equally urgent. In rough order of what blocks what:

**Tier 1 — blocks all development.** Nothing meaningful can be built until these land.
`EV-1` (how maids enter Reception) · `XC-1` (service auth) · `XC-2` (sandbox) · `BR-3` (system of record) · `BR-4` (canonical ID)

**Tier 2 — blocks the core pipeline.** These make the main workflow real.
`RD-1` `RD-2` `RD-3` `RD-6` · `BR-1` `BR-2` · `WR-1` `WR-4`

**Tier 3 — blocks publishing, the end of the pipeline.**
`PB-1` `PB-2` `PB-3` (all four capabilities each) · `MD-1` · platform ownership

**Tier 4 — completes the picture.**
`RD-4` `RD-5` `RD-7` `RD-8` · `WR-2` `WR-3` `WR-5` `WR-6` · `EV-2` `EV-3` · `MD-2` · `XC-3` → `XC-7`

If a Tier 1 item cannot be delivered, please tell us immediately rather than at the next checkpoint — it changes the project plan, not just a ticket.

---

## 6. A note on the prototype

We have a working prototype of the full pipeline, using seeded demo data in place of every dependency above. It is the fastest way to see exactly where each of these APIs plugs in, and we would recommend a joint walkthrough before you scope the work — it will save both sides a round of clarifying questions.

We are happy to run that session at your convenience.

---

## 7. How to respond

Rather than a prose reply, please return this table. One row per register ID, including the ones where the answer is "doesn't exist".

| Register ID | Status | Owner | Documentation link | Sandbox ready | Target date | Notes |
|---|---|---|---|---|---|---|
| BR-1 | | | | | | |
| BR-2 | | | | | | |
| … | | | | | | |

**Status** should be one of: `Available & documented` · `Available, needs documentation` · `Partially available` · `Not built — will build` · `Not built — no plan` · `Not applicable`.

For anything marked `Not built — no plan`, please say what our interim option is.

We would like a first pass on this within two weeks so we can convert it into a build plan. Happy to work through it live if that's faster than filling in a table — in which case, let's book the session.
