# Verified employee badge with zkEmail (design, not yet built)

**Status: not implemented.** Nothing in the app claims verification today. Posting in a company's community needs only that company's LinkedIn page link (see README, "Companies and identity").

## Goal
Let a poster prove "I hold an email address at `<company-domain>`" without revealing which address, who they are, or linking their wallet to an identity.

## Why not LinkedIn
- A profile URL is just a handle. It does not contain the current employer, and reading it means scraping a login-gated page.
- Pasting a URL proves nothing: anyone can paste anyone's profile.
- "Sign in with LinkedIn" needs a backend (client secret), does not return employer data to third parties, and would link each post to a real identity. Storing that on Arkiv would also break the "no real personal data" rule.

## Design
1. **Blueprint.** A zkEmail blueprint over the email `From` header that extracts the sender **domain** only and keeps everything else private (the DKIM signature proves the mail really came from that domain). The poster forwards or downloads any mail from their company address, for example an HR or IT notice.
2. **Proof in the browser.** `@zk-email/sdk`: `getBlueprint(id)` → `createProver().generateProof(eml)`. The `.eml` never leaves the browser; only the proof is produced.
3. **Verify in the browser.** Anyone can run `blueprint.verifyProof(proof)` offline, so no server is trusted.
4. **Bind to the post, not the person.** The proof's public output is `(domain, nullifier)`, where the nullifier is a hash of the message id and a Tankha domain separator, and the poster's one-time wallet address is committed in the proof so it cannot be replayed from another wallet.
5. **On Arkiv.** A `verification` entity with `domain` (str), `owner_wallet` (addr via `$owner`), and the proof as JSON payload. Entities are `readonly`. No email address or name is stored.
6. **Company ↔ domain.** A community's domain comes from the company's website, which sits on its LinkedIn page. A poster whose proof domain matches gets a "Verified employee" badge on posts in that community, and the trust score gets a new, capped component for it. Votes and confirmations from verified wallets can weigh more.
7. **Sybil limit.** One nullifier per email message, so a single mail cannot back many wallets. A person with several work mails can still verify several wallets; that is a known limit of any email-based scheme.

## What is needed to build it
- A published blueprint id for step 1. The registry (`registry.zk.email`) needs an account, and it returned HTTP 500 when we last tried it.
- A sample work email (`.eml`) to test proof generation end to end.
- About 3–4 hours: blueprint publish, the proof UI, the `verification` entity, badge and trust-score changes, tests.
