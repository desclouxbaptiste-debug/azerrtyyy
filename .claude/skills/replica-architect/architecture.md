# Architecture: <app name> clone

Source: `replica/recon.md`, `replica/features.csv` · Date: <YYYY-MM-DD>

## Summary

- **Stack:** <one line>
- **Tables:** <n> · **Routes:** <n> · **Jobs:** <n>
- **Riskiest parts:** 1. <…> 2. <…> 3. <…>
- **Next step:** `/replica-design`

## 1. Stack

| layer | choice | why |
| --- | --- | --- |
| web app | | |
| styling | | |
| mobile | | |
| database | | |
| ORM | | |
| auth | | |
| payments | | |
| email | | |
| jobs | | |
| files | | |
| hosting | | |

## 2. Schema

Access rules: <Postgres RLS | authorisation check per query in the data layer>

Full SQL: `replica/schema.sql` (or first migration: `<path>`)

| table | owner column | key relations (on delete) | indexes | notes |
| --- | --- | --- | --- | --- |
| | | | | |

### Hard constraints

- <e.g. no double booking: exclusion constraint on (host_id, tstzrange(start_at, end_at))>

## 3. API

### Flow: <flow name>

| method path | what it does | who can call it | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

### Webhooks in

| source | event | handler | idempotency key |
| --- | --- | --- | --- |
| | | | |

### Webhooks out

| event | payload | consumer |
| --- | --- | --- |
| | | |

### Background jobs

| job | schedule | what it does |
| --- | --- | --- |
| | | |

## 4. The parts that bite

- **Time zones / DST:**
- **Idempotency:**
- **Race conditions:**
- **Rate limits:**
- **File size limits:**
- **Search:**
- **Realtime:**
- **Offline:**
- **Email deliverability:**
- **Multi-tenancy:**
- **GDPR deletion:**

(Delete the lines that don't apply.)

## 5. Build order

### M1: vertical slice

- Screens: <S-IDs>
- Tables: <…>
- Routes: <…>
- Done when: sign up → do the one thing → see the result.

### M2: must-haves

| area | screens | tables | routes |
| --- | --- | --- | --- |
| | | | |

### M3: should-haves, then could-haves

| area | screens | tables | routes |
| --- | --- | --- | --- |
| | | | |

### M4: fixes from replica-entrepreneur

- <filled in once /replica-entrepreneur has run>
