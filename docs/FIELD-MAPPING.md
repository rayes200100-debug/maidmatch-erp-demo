# MaidMatch ERP — Field Mapping

**Purpose:** what feeds each on-screen field, so nobody has to guess which ERP field maps to
which label. Where a field name is not confirmed it is marked **Pending API** and must be
checked against a live call. Base host for ERP calls: `erpbackendpro.maids.cc`.

The prototype uses simplified single fields (e.g. one `name` string, one `maidsCcId`); the
production build splits them per this mapping.

## Reception results table

| Shown on screen | Comes from | Field |
|---|---|---|
| Name | Profile call | `firstName`, `lastName` (`middleName` also available) |
| Photo | ERP | **Pending API** |
| Nationality | Profile call | `nationality.name` |
| Age | Profile call | `age`, or derived from `birthdate` |
| Maid type and sub-type | Profile call | **Pending API** |
| Mobile number | Numbers call | `phoneNumber` |
| WhatsApp number | Numbers call | `whatsAppPhoneNumber` |
| maids.cc ERP ID | Any call | `id` / `maid_id` — consistent across all calls |
| Visa expiry date | Profile call | `rVisaExpiryDate` |
| Status in MaidMatch | MaidMatch's own data | Not an ERP field |

## Retraction task — left panel

| Shown on screen | Comes from | Field |
|---|---|---|
| Identity block | Profile + numbers calls | As above |
| Visa start date | Profile call | **Pending API** |
| Visa expiry date | Profile call | `rVisaExpiryDate` |
| Passport expiry date | Profile call | **Pending API** |
| Visa status pill | Profile call, derived | **No single field.** Candidates: `visaAnsariStatus`, `visaRenewingStatus`, `rVisaExpiryDate`, `status`. **The rule must be agreed before the pill is built.** |
| Golden profile pill | Computed in MaidMatch | Nationality + age + visa expiry + maid type vs. the System Configuration definition |
| Unpaid leave due (preview) | Computed in MaidMatch | Today's date + day-of-month rule. No ERP field |
| Current salary | Profile call | One of `basicSalary` / `primarySalary` / `accommodationSalary` — **we pick which** |
| WPS, last 3 salaries | WPS call | **To be built** — month + paid / pending / not-sent status per month |
| Employment history | Employment history call | **To be built** — client name, start, end, salary, cancellation/termination reason per row |
| Termination summary | Employment history call | The reason on her most recent row |
| Complaints open to the retractor | Complaints call | **To be built** — title, summary, type, status, owning team, ERP link per complaint |

## Notes

- The profile and numbers calls are **both** required: numbers come back **masked** on the
  profile call, and WhatsApp should be used rather than phone (they differ; the contact flow
  depends on WhatsApp).
- The profile call returns ~120 fields — extract only what this document names and discard
  the rest.
- All calls run on a **service account** with its own credential (XC-1), never a person's
  login token.
