// The writing index. GitHub Pages can't list a folder, so every post is registered here.
//
// To add a post:
//   1. Copy posts/_template-case.md or posts/_template-note.md to posts/<slug>.md and write it.
//   2. Add an entry below. Newest first.
//   3. Commit and push.
//
// kind:  "case" = a problem I hit and how I solved it
//        "note" = study notes, learnings, anything educational
// url:   optional. Set it to link out to Medium / dev.to instead of a local .md file.
// draft: true hides it from the site (open writing.html?drafts to preview).
window.POSTS = [
  {
    slug: "wal-bloat-debezium-slot",
    kind: "case",
    title: "The replication slot that ate the disk",
    date: "2026-09",
    tags: ["postgres", "debezium", "kafka", "cdc"],
    summary: "Postgres WAL kept growing even though nothing looked broken. The culprit was a Debezium replication slot holding on to WAL by LSN.",
    // shown as the problem → fix card at the top of a case study
    problem: "WAL on the primary kept growing and wasn't being recycled.",
    fix: "Understood how the slot pins WAL by LSN, and sized max_slot_wal_keep_size against the hourly WAL rate.",
    stack: ["PostgreSQL", "Debezium", "Kafka"],
    draft: true,
  },
];
