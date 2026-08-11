# ALU headless CLI

## Locate the CLI

Prefer an installed `alu` command. From a source checkout, build once with `pnpm build:cli` and use `pnpm cli` in place of `alu`.

```bash
alu help
alu schema command
```

Every invocation emits exactly one JSON object on stdout. Use `ok`, `error.code`, and the process exit code; do not parse human prose.

## Safe mutation loop

1. Run `alu read project.alu`.
2. Copy `identity.revision` and `identity.designHash` into a command envelope.
3. Use stable caller-provided IDs for new parameters and entities.
4. Run `alu dry-run project.alu --input command.json`.
5. Review the entity, parameter, BOM, and rule diff.
6. Run `alu apply project.alu --input command.json` with the same envelope.
7. Use the returned `after` identity and validation result. Read again only when another process may have changed the file or a fuller handoff is needed.

```json
{
  "commandVersion": 1,
  "commandId": "command.change-obstacle-width",
  "expectedProjectRevision": 0,
  "expectedDesignHash": "<64-character hash returned by alu read>",
  "commands": [
    {
      "type": "parameters.set",
      "values": {
        "obstacleOuterWidth": 2200
      }
    }
  ]
}
```

Use `--input -` to pipe JSON through stdin. Do not put JSON on the command line.

## Creating a project

```bash
alu create frame.alu --template blank --name "Frame"
alu create example.alu --template demo
```

Create never overwrites an existing file. A blank project has no embedded definitions. Get ready-to-copy generic profile snapshots from `alu schema command`; place the selected snapshot in `profile.add.definitionSnapshot`. Never calculate or invent a definition hash.

## Validation

```bash
alu validate frame.alu --target edit
alu validate frame.alu --target order-draft
alu validate frame.alu --target order-ready
```

For `validate`, exit code `5` means validation completed but findings block the selected target. `dry-run` and `apply` return their validation result in `data.validation`; `apply` does not return a failure code after a successful write. It is never permission to suppress findings.

## Exit codes

| Code | Meaning                                            |
| ---: | -------------------------------------------------- |
|    0 | Command completed                                  |
|    1 | I/O or unexpected internal failure                 |
|    2 | Invalid CLI arguments, JSON, schema, or input file |
|    3 | Domain command rejected                            |
|    4 | Revision, design, file, or lock conflict           |
|    5 | Validation blocks the requested target             |

On exit code `4`, read the project again. If the new design already contains the intended result, stop; otherwise generate a new envelope from the new identity. `commandId` is a correlation ID, not a persistent idempotency receipt.

`project.stale-lock` means the previous writer exited without releasing `<project>.alu.lock`. Confirm the PID named in that lock is no longer running before deleting that exact lock file. The CLI deliberately does not auto-delete stale locks because check-then-delete can admit two concurrent writers.
