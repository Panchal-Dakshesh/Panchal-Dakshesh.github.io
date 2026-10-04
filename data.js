// Everything about me lives here. Edit this, not app.js.
// New job? Append one entry to `career`. The graph rebuilds itself.
window.PROFILE = {
  name: "Dakshesh Panchal",
  handle: "dakshesh",
  role: "Data Engineer",
  tagline: 'From "can we?" to "shipped."',
  location: "Maharashtra, India",
  links: {
    github: "https://github.com/Panchal-Dakshesh",
    linkedin: "https://www.linkedin.com/in/dakshesh-panchal-227a901b6/",
  },

  // Shown when you open the center node.
  intro: "I like building things from scratch. Not because it's faster. It isn't.",
  about: [
    "Started out poking at NLP and OCR in college internships, mostly to see what was possible. Then Jio, as a product engineer, where I learned that shipping something is a very different skill from building it.",
    "At GoComet I joined as a junior engineer and grew through every level. Somewhere along the way the work shifted from writing features to owning systems. Mostly data pipelines: getting changes out of Postgres, through Debezium and Kafka, into ClickHouse, and keeping it all running when things go sideways.",
    'The part I didn\'t expect to enjoy is the people side: figuring out what teams actually need and turning a vague "can we?" into something that ships.',
  ],

  // Each group becomes a processing node; each skill feeds into it.
  skills: {
    streaming: {
      color: "#0e9f9f",
      note: "Events in, events out, nothing lost. Ideally.",
      items: ["Apache Kafka", "Debezium", "Kafka Connect", "Change Data Capture"],
    },
    storage: {
      color: "#2f6fde",
      note: "Where the rows live, and where they get fast.",
      items: ["PostgreSQL", "ClickHouse", "SQL", "Replication", "Query Optimization"],
    },
    modeling: {
      color: "#7c4ddb",
      note: "Shape the data before it shapes you.",
      items: ["dbt", "Avro", "Protobuf", "ETL", "Data Pipelines"],
    },
    languages: {
      color: "#d9731f",
      note: "Whatever gets the job done without a framework doing it for me.",
      items: ["Ruby / Rails", "Python", "Go", "Lua"],
    },
    systems: {
      color: "#cf3a7a",
      note: "Boxes, arrows, and what happens when an arrow breaks.",
      items: ["Systems Design", "Distributed Systems", "Microservices", "REST APIs", "Docker"],
    },
    people: {
      color: "#2f9a4c",
      note: "The hardest distributed system.",
      items: ["Stakeholder Management"],
    },
  },

  projects: [
    { repo: "Panchal-Dakshesh.github.io", lang: "JavaScript", status: "live", desc: "This page. A DAG with no dependencies, which is either elegant or stubborn." },
    { repo: "ai-sessions-tui", lang: "Go", status: "building", desc: "A TUI to browse, search and resume AI assistant sessions and memory." },
    { repo: "nvim", lang: "Lua", status: "building", desc: "My Neovim config. lazy.nvim, LSP, DB tooling. Rewritten more times than I'd admit." },
    { repo: "pawn-only-chess", lang: "Ruby", status: "archived", desc: "Chess, but only pawns. Smaller game, same edge cases." },
    { repo: "Simple-Neural-Network", lang: "C++", status: "archived", desc: "A neural net from scratch, from the NLP/OCR days. No libraries. On purpose." },
  ],

  // `ts` is YYYY-MM. Newest last.
  career: [
    { ts: "2019-06", role: "NLP Intern", company: "Hiren Chauhan Business Solutions" },
    { ts: "2019-12", role: "OCR Intern", company: "EYUVA Technologies" },
    { ts: "2021-07", role: "Product Engineer", company: "Jio" },
    { ts: "2022-06", role: "Junior Software Engineer", company: "GoComet" },
    { ts: "2023-09", role: "SDE 1", company: "GoComet" },
    { ts: "2024-12", role: "SDE 2", company: "GoComet" },
    { ts: "2025-04", role: "Sr. SDE 2", company: "GoComet" },
    { ts: "2026-04", role: "SDE 3", company: "GoComet" },
  ],
};
