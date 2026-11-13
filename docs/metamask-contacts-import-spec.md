# Sonus MetaMask Contacts Import — Specification & Implementation Plan

**Status:** Proposed MVP  
**Target:** Next.js web app, browser-side import  
**Scope:** Import contacts from a user-selected MetaMask Extension JSON data backup. This feature does not read MetaMask's private storage or create automatic sync.

## 1. Product summary

Let a user import contacts already saved in MetaMask into Sonus, review the results, remove duplicates, and choose which contacts to save. Imported contacts can later be used for recipient lookup in Sonus payment flows.

MetaMask documents that Settings → Privacy → Export your data can produce a JSON backup containing accounts and names, addresses, address-book contacts, wallet settings, and custom networks. Because the file contains more than contacts, Sonus must treat the entire file as sensitive.

Official references:
- MetaMask backup/export help: https://support.metamask.io/configure/wallet/backup/
- MetaMask Connect account management: https://docs.metamask.io/metamask-connect/evm/guides/manage-user-accounts/

## 2. Goals

- Import a user-selected JSON backup in the browser.
- Extract only explicitly supported contact name/address fields.
- Never transmit, upload, log, or persist the original backup.
- Show a preview before any contact is saved.
- Normalize addresses and deduplicate safely.
- Allow selective import, cancellation, and removal.
- Store only normalized contacts in local browser storage for MVP.
- Clearly label provenance as **Imported from MetaMask**; do not imply identity verification.
- Make imported contacts usable by Sonus recipient search without making payment decisions on a name match alone.

## 3. Non-goals

- Reading MetaMask extension storage, browser profile files, or internal APIs.
- Automatic/background contact syncing.
- Asking for a Secret Recovery Phrase, private key, password, or wallet unlock.
- Sending the backup to a Sonus API, AI provider, analytics, crash reporter, or third-party parser.
- Claiming a contact name proves who controls an address.
- Sending a payment without the usual recipient, asset, network, amount, and wallet confirmation steps.

## 4. User flow

1. User opens **Contacts → Import → MetaMask backup**.
2. Sonus explains that the JSON backup may contain account names, contacts, settings, and custom networks. The file is processed locally; Sonus does not upload it.
3. User selects a JSON file using a normal file picker.
4. The app enforces file size and format limits before parsing.
5. A versioned parser adapter validates the structure and extracts only supported address-book entries. Unknown structures fail closed with a helpful error; never guess fields recursively across arbitrary JSON.
6. Sonus validates names and EVM addresses, normalizes address casing for comparison, and produces a preview.
7. Preview shows contact name, shortened address, duplicate/invalid status, source, and selection checkbox. Full address can be revealed for review.
8. Existing contacts are compared against imported contacts. Exact normalized address duplicates are not added twice; name collisions with different addresses remain separate and are clearly flagged.
9. User chooses which valid contacts to import and confirms.
10. Sonus writes only selected normalized contact records to local storage. The raw text, parsed backup object, and unused fields are never written to storage.
11. Show a result summary and provide a way to manage or remove imported contacts.

## 5. Import format and parser safety

The backup's exact JSON schema must be verified against real, user-provided sample files and current MetaMask documentation before implementation is considered complete. Do not assume a field name or schema from an example found online.

Implement a narrow, versioned adapter, for example:
- parseMetaMaskBackupV1(input: unknown): ImportParseResult
- extractAddressBookContacts(knownBackupShape): RawContact[]

Requirements:
- Parse with JSON.parse inside a client-only module.
- Validate root type and known schema markers.
- Extract only documented/verified contact name and address properties.
- Never recursively search every object for keys such as name or address; that can accidentally import accounts, settings, or unrelated data.
- If the format cannot be confidently recognized, return an unsupported-format error and do not import anything.
- Never echo raw JSON or sensitive unknown fields into error messages, telemetry, console output, or UI.
- Set a conservative configurable file-size limit (MVP default: 5 MiB) and maximum contact count (MVP default: 10,000); reject larger inputs with a clear message.
- Reject malformed JSON, empty files, unexpected root types, invalid addresses, and entries without a usable name/address according to the verified schema.
- Preserve a contact's original display name after trimming and removing control characters; limit name length (for example, 100 characters).
- Validate EVM addresses with a well-maintained library already used by the project, such as viem's isAddress. Store a normalized lowercase comparison key, but retain a display form separately.
- Do not resolve ENS or perform network requests during import. Name resolution is a separate, explicit recipient-resolution step.

## 6. Contact data model

Persist only fields needed by Sonus:

    type SonusContact = {
      id: string;
      displayName: string;
      address: string;
      addressKey: string;
      source: "metamask-import" | "manual";
      createdAt: string;
      updatedAt: string;
    };

Do not persist the backup filename, raw JSON, raw contact entry, account list, network configuration, wallet settings, or unrelated fields. The MVP does not need to store the backup file or an import history.

## 7. Deduplication and conflict behavior

- **Same address, same normalized name:** mark as already saved; do not create a duplicate.
- **Same address, different name:** show as an address duplicate and offer to keep the existing name or explicitly update it. Never silently overwrite.
- **Same name, different addresses:** keep both entries and flag the shared name so the payment flow can ask the user to choose.
- **Invalid address:** exclude from selection and explain why; do not silently repair it.
- **Repeated entries inside the backup:** deduplicate by normalized address and preserve a conflict indicator if names differ.
- **Case handling:** EVM address comparison is case-insensitive after validation. Do not compare addresses by truncated display strings.

## 8. Local storage and privacy

MVP uses a small contact repository backed by browser local storage, scoped to the Sonus app origin. Store only normalized contact records.

Privacy rules:
- No server route is involved in file selection or parsing.
- No fetch/XHR, analytics, error tracking, or AI request receives the file or raw backup object.
- No console logging of the file, raw JSON, extracted raw entries, or full contact list.
- Keep raw file contents and parsed root object local to the import function; release references after preview is generated and on cancel/unmount where practical.
- Clear the file input after processing/cancel.
- Explain that browser local storage is not encrypted storage and may be accessible to scripts running on the same origin or to someone with access to the unlocked browser profile. Do not describe it as vault-grade protection.
- Provide **Delete imported contacts** and **Clear all Sonus contacts** controls with confirmation.
- Future encrypted sync, if added, must be opt-in, separately designed, and must never sync the backup file.

## 9. Payment-flow integration

Recipient search may match an imported contact by exact name or normalized search text. If multiple contacts match, require the user to choose one.

Before creating a transaction, show:
- Contact display name and **Imported from MetaMask** source label.
- Full destination address, with copy action.
- Asset and network (e.g. USDC on Arc Testnet).
- Amount and any fee.
- A warning that a saved contact name is a local label, not proof of identity.

A contact match is a suggestion, not payment authorization. The connected wallet must still show the transaction for explicit user approval. Never let an LLM invent, infer, or silently replace the destination address.

## 10. Suggested implementation structure

Adapt paths to the repository's existing structure; keep parsing and storage out of server routes.

- app/app/contacts/import/page.tsx or a component under the existing app UI: import screen and preview.
- lib/contacts/types.ts: normalized contact and parse-result types.
- lib/contacts/metamask-backup.ts: client-only, schema-specific parser and validation.
- lib/contacts/dedupe.ts: address normalization, dedupe, and conflict grouping.
- lib/contacts/storage.ts: local contact repository and CRUD operations.
- components/contacts/MetaMaskImportDialog.tsx: file picker, explanation, progress/error states.
- components/contacts/ImportPreview.tsx: selection, duplicate states, and confirmation.
- lib/contacts/__tests__/: parser and dedupe fixtures/tests.

Do not add a server API endpoint for this feature. If the app uses a state-management library already, integrate the repository with it rather than adding another dependency.

## 11. Implementation plan

### Phase 0 — Verify the real export schema
- Read current MetaMask export instructions and verify the supported export path is for MetaMask Extension.
- Obtain a sanitized fixture produced by a test wallet, containing fake contacts and no secrets.
- Identify the exact contact array/object schema and version markers.
- Add the fixture to tests only after confirming it contains no real user data or secrets.
- If the schema is ambiguous, pause rather than shipping a heuristic parser.

### Phase 1 — Types, parser, and validation
- Add normalized contact types and a typed parse-result union.
- Implement a narrow adapter for the verified export schema.
- Add file-size, root-shape, entry-count, name, and EVM-address validation.
- Add safe, user-friendly errors that do not include raw input.

### Phase 2 — Deduplication and local repository
- Implement address-key normalization and duplicate/conflict classification.
- Implement local-storage read/write/delete with schema versioning and safe parse recovery.
- Keep storage APIs limited to normalized contacts.
- Add migration behavior for future local schema changes.

### Phase 3 — Import and preview UI
- Add the import entry point and clear privacy explanation.
- Add file selection, loading, unsupported-format, invalid-file, empty-result, and cancel states.
- Show preview and select-all/select-none behavior.
- Require a separate user confirmation before writing contacts.
- Clear file input and transient state after cancel or completion.

### Phase 4 — Contact list and recipient lookup
- Show imported contacts with provenance labels.
- Add search and removal.
- Integrate with existing Sonus recipient resolution.
- Handle multiple same-name matches by requiring explicit selection.
- Require the standard transaction confirmation flow for every payment.

### Phase 5 — Security review and release
- Search the code for file/backup references in fetch calls, API routes, analytics, logging, and AI requests.
- Confirm no server-side parsing path exists.
- Run lint, TypeScript, unit tests, and production build.
- Test import in supported desktop browsers and verify mobile users receive a clear unsupported-workflow message if the export path is not available to them.
- Document that this imports a backup file; it does not live-sync MetaMask contacts.

## 12. Acceptance criteria

- [ ] User can select a MetaMask Extension JSON backup through the browser file picker.
- [ ] Import processing happens entirely client-side.
- [ ] No upload or network request contains the original file, raw JSON, or full backup object.
- [ ] Only verified address-book contact fields are extracted.
- [ ] Unknown schema versions fail closed with a clear message.
- [ ] Invalid JSON, oversized files, excessive contact counts, and invalid addresses are handled safely.
- [ ] User sees a preview and must explicitly confirm before saving.
- [ ] Address duplicates are detected using full normalized addresses, not shortened strings.
- [ ] Name collisions with different addresses are preserved and surfaced.
- [ ] Only selected, validated contacts are saved.
- [ ] Stored records contain only the fields defined in the Sonus contact model.
- [ ] Users can remove an imported contact or clear imported contacts.
- [ ] Recipient selection displays the full address before payment confirmation.
- [ ] No recovery phrase, private key, wallet password, or backup file is requested beyond the user selecting the export file.
- [ ] Tests cover malformed JSON, unsupported schema, empty exports, duplicate addresses, conflicting names, invalid addresses, storage failures, cancel, and successful import.
- [ ] Lint, typecheck, tests, and production build pass before merging.

## 13. Test matrix

| Case | Expected result |
|---|---|
| Valid verified fixture | Preview supported contacts only |
| Malformed JSON | Safe parse error; nothing saved |
| Unknown export structure | Unsupported-format message; no heuristic import |
| Export contains accounts/settings as well as contacts | Only verified contact entries shown |
| File over size limit | Rejected before JSON parsing |
| Too many contacts | Rejected or safely capped before preview |
| Duplicate address in file | One address entry plus conflict information if names differ |
| Address already in Sonus | Mark as existing; no silent overwrite |
| Same name, different addresses | Both retained; recipient flow asks user to choose |
| Invalid address | Excluded and explained |
| User cancels preview | No contacts saved; file input/transient state cleared |
| Local storage unavailable/full/corrupt | Clear error; no claim that import succeeded |
| Browser network inspection | No request contains file or raw backup content |
| Recipient chosen for payment | Full address, network, asset, amount, and fee reviewed before wallet approval |

## 14. User-facing copy

**Import from MetaMask**

Export your data from MetaMask Extension, then select the JSON file here. MetaMask's backup can include wallet settings and account information as well as contacts. Sonus processes the selected file in your browser and saves only the contacts you choose. The backup file is not uploaded to Sonus.

**Important:** Keep your backup private. Never share your Secret Recovery Phrase or private keys with Sonus or anyone else.

## 15. Definition of done

The feature is done only when the real MetaMask export schema has been verified with a secret-free fixture, local-only behavior is demonstrated by tests and network inspection, all acceptance criteria pass, and the existing wallet/payment flow remains unchanged except for explicit recipient-selection integration.
