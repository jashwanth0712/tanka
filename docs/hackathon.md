# Arkiv x CROPS Hackathon — Road to Devcon 8 Mumbai

A special edition on the road to Devcon 8 Mumbai. Ten days to build on [Arkiv](https://arkiv.network/), the Web3 database, around one theme: **CROPS**, the Ethereum Foundation's mandate that Ethereum stay **C**ensorship resistant, **O**pen source, **P**rivate and **S**ecure.

Ten days, fully online, open to builders everywhere. The challenge opens live at Network School Astana during the Network State Conference on 9 October and closes on 18 October. Five winners get a Devcon 8 ticket on top of their prize.

Build anything useful and usable for the ecosystem: a dApp, a library, an SDK, a devtool, a CLI, an indexer, a dataset, an agent, a browser extension or more. Four CROPS tracks are open to everyone, and the Best Indian Use Case track rewards a real-world application that people in India can use.

## Prizes

| Track | Prize |
|---|---|
| Best Indian Use Case | Devcon 8 ticket + $2,000 USDC. A real-world application built on Arkiv that people in India can use. Does not need to follow a CROPS pillar. Team needs at least one member of Indian nationality. |
| Censorship Resistance (Global) | Devcon 8 ticket + $750 USDC |
| Open Source (Global) | Devcon 8 ticket + $750 USDC |
| Privacy (Global) | Devcon 8 ticket + $750 USDC |
| Security (Global) | Devcon 8 ticket + $750 USDC |

### Prize conditions
- One prize per team. You can enter more than one track, but your team wins at most one prize. Winning Best Indian Use Case rules out a Global prize; winning one Global prize rules out another.
- Attending Devcon is not required to win.
- One Devcon ticket per winning team. Travel, visa and accommodation are the winner's cost.
- Winners accept their prize within 48 hours and complete KYC. Prizes are paid within 14 days after KYC.

## Dates (London time, BST, UTC+1)
- 7 October: registration opens
- 9 October, 12:00: opening, live at Network School Astana
- **18 October, 23:59 (22:59 UTC): submissions close**
- 19–22 October: judging. Keep your deployment up.
- 23 October: winners announced
- 25 October: deadline for winners to accept their prize
- 3–6 November: Devcon 8, Mumbai

## How it is judged
Pick one or more tracks when you submit: the four CROPS pillars and Best Indian Use Case. All projects are scored on four criteria, 25 points each. The first depends on the track and is scored for each track you enter:

1. **Why this pillar?** (CROPS tracks) Who is harmed today if this data is censored, shut down, leaked or forged?
   **Why India?** (Best Indian Use Case) Who in India uses it, and what real problem does it solve for them?
2. **Why Arkiv?** What would break on Postgres, IPFS, a subgraph or your own API, and what did you keep off Arkiv on purpose?
3. **How you use Arkiv:** how and why you use each Arkiv feature. Not how many you use.
4. **Friction report:** specific, reproducible feedback on building with Arkiv.

### Gates (must pass before scoring)
- Public deployment judges can open without asking for access (libraries, CLIs and datasets too)
- Reproducible steps
- Public MIT repo
- `/arkiv/schema.md`
- `/arkiv/friction.md`
- The wallet addresses that create your Arkiv entities on Tiramisu
- Demo video of 3 minutes or less
- Every required question on the submission form answered
- Work built between 9 and 18 October. Disclose any pre-existing work with its baseline commit SHA.

A project needs at least **50/100** to win.

### Disqualified
- Plagiarised work
- No meaningful Arkiv use (SDK installed but never queried, or a conventional database app with Arkiv branding)
- Private keys, secrets or real personal data stored in Arkiv, in plaintext or hashed (use synthetic data)
- Malicious code
- No working app
- Late entries

At the deadline the repo's commit SHA is recorded and that commit is judged. **Rewriting history after the deadline disqualifies the entry.** Keep the deployment up until 23 October.

## Build on Tiramisu
- Network: Tiramisu testnet, chain ID `7738577`
- HTTP RPC: `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
- WebSocket RPC: `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`
- Explorer: https://tiramisu.explorer.arkiv.network/
- SDK: `@arkiv-network/sdk` 0.8.x
- Docs: https://docs.arkiv.network/networks/tiramisu/
- Arkiv Hub: https://hub.arkiv.network/

## Rules
Full rules, rubric and submission checklist: https://github.com/Arkiv-Network/global-tour-stop-pre-devcon — the only canonical source; if anything here differs, the repo applies.

Questions: [Arkiv Discord](https://discord.gg/arkiv). Follow the [Code of Conduct](https://devfolio.co/code-of-conduct).
