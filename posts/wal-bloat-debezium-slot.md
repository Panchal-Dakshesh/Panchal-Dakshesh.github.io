<!--
DRAFT. Written from what you've told me about this incident, kept generic on purpose.
Fill in the bits marked TODO, remove anything internal to GoComet, then set draft: false in posts.js.
-->

## The problem

Disk usage on the Postgres primary kept climbing. Not a spike, a slow, steady slope. Queries were fine, Kafka was fine, and the Debezium connector reported itself as running. Nothing was obviously broken, which is the worst kind of broken.

The space was going into `pg_wal`. Postgres wasn't recycling old WAL segments.

## Context

We stream changes out of Postgres with Debezium (logical decoding), into Kafka, and on to ClickHouse. Debezium reads through a **logical replication slot**.

A slot is a promise: *"I will keep every WAL record this consumer hasn't confirmed yet."* Postgres takes that promise seriously.

## What I checked first

```sql
SELECT slot_name,
       active,
       restart_lsn,
       confirmed_flush_lsn,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots;
```

`retained_wal` was the whole story: the slot's `restart_lsn` was far behind the current WAL position, so everything after it had to stay on disk.

TODO: what was holding the slot back in your case (connector lag, a paused connector, a slow table, low write volume on captured tables?)

## The thing I had wrong

I assumed retention was **time-based**, like "keep a few hours of WAL". It isn't. A slot pins WAL by **LSN**, not by time. If the consumer's confirmed position doesn't move, nothing after it is released, no matter how old it gets.

That changes how you reason about it:

- An idle or stuck slot can hold WAL indefinitely.
- "It's been running fine for weeks" says nothing about how much WAL it's retaining.
- The only number that matters is the distance between `pg_current_wal_lsn()` and the slot's `restart_lsn`.

## The fix

Two parts.

**1. Unblock the slot.** TODO: what you did to get the connector's confirmed LSN moving again.

**2. Put a ceiling on it.** Postgres has `max_slot_wal_keep_size`. Past that limit, the slot is invalidated instead of the disk filling up. I sized it from the measured WAL generation rate:

```
max_slot_wal_keep_size ≈ hourly WAL rate × hours of outage you want to survive
```

Too small and a short connector hiccup invalidates the slot, which means a re-snapshot. Too large and you're back to betting the disk. TODO: the trade-off you picked.

## Result

TODO: what changed afterwards (disk stable, alerting on retained WAL, etc.)

## What I'd tell someone else

- Monitor retained WAL per slot, not just disk usage. Disk usage tells you too late.
- Think of slots in LSNs, not hours.
- `max_slot_wal_keep_size` is a circuit breaker. Choose deliberately what happens when it trips.
