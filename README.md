# dakshesh.dag

My corner of the internet: a dependency graph of how I got here.

Every skill is a source node. They flow through transforms (streaming, storage, modeling, ...) into one sink, and out come projects and a career log. Packets actually move along the edges. Nothing here was pulled from a template or a library: plain HTML, CSS, SVG and a bit of JS.

Live at **https://panchal-dakshesh.github.io**

## Keys (yes, vim)

| key | does |
| --- | --- |
| `h` `j` `k` `l` | move between nodes |
| `↵` / `o` | open a node |
| `esc` / `q` | close |
| `/` | search skills |
| `:about` `:career` `:projects` `:contact` | jump |
| `:checkhealth` | graph stats |
| `?` | help |

## Run locally

```sh
python3 -m http.server 8000
```

## Updating

Everything lives in `data.js`. New skill? Add it to a group. New job? Append to `career`. The graph lays itself out again.
