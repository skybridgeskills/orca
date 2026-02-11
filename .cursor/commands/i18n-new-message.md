# Add or Edit i18n Message

## Critical: Never Edit Generated Files

**IMPORTANT**: The files in `src/lib/i18n/` are **generated** by Paraglide during the build process. You must **NEVER** edit these files directly. They are automatically regenerated from the source message files when you run `pnpm dev` or `pnpm build`.

## How i18n Works in ORCA

ORCA uses [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for i18n, which is a compiler-based library that generates tree-shakable translations. The workflow is:

1. **Source files** (edit these): `src/messages/{languageTag}/orca.json` for each language
2. **Build process**: Paraglide Vite plugin compiles these to `src/lib/i18n/messages.js` (generated)
3. **Usage in code**: `import * as m from '$lib/i18n/messages';` then call `m.key_name()`

The supported languages are defined in `project.inlang/settings.json`:

- `en-US` (source language)
- `en-AU`
- `fr`
- `it`

## Adding a New Message

When you need to add a new translated message:

### Step 1: Generate a Random Key

ORCA uses randomly generated keys in the format: `adjective_adjective_animal_verb` (e.g., `sunny_watery_sparrow_jest`, `cuddly_antsy_rabbit_cook`). This provides stable namespace complexity.

Generate a new random key following this pattern. Examples:

- `gentle_brave_falcon_rest`
- `calm_swift_deer_soar`
- `bright_quiet_owl_whisper`

**Note**: Older messages use semantic keys like `achievement_awardAnotherCTA`, but new messages should use random keys.

### Step 2: Add to All Language Files

You **must** add the key to **all four** language files:

1. `src/messages/en-US/orca.json` - Add with the English text
2. `src/messages/en-AU/orca.json` - Add with the same English text (or Australian variant if needed)
3. `src/messages/fr/orca.json` - Add with French translation (or use English temporarily if translation is not available)
4. `src/messages/it/orca.json` - Add with Italian translation (or use English temporarily if translation is not available)

### Step 3: JSON Format

Each message file is a JSON object. Add your key-value pair:

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"existing_key": "Existing message",
	"your_new_key": "Your new message text"
}
```

**Important**:

- Maintain valid JSON syntax (trailing commas are not allowed)
- Use `{paramName}` for interpolation parameters
- Keep the `$schema` field at the top

### Step 4: Use in Code

After adding the message, import and use it:

```typescript
import * as m from '$lib/i18n/messages';

// Simple message
const text = m.your_new_key();

// Message with parameters
const text = m.your_key_with_params({ paramName: value });
```

### Step 5: Verify

The Paraglide compiler will automatically regenerate `src/lib/i18n/messages.js` when you run `pnpm dev` or `pnpm build`. The new function will be available as `m.your_new_key()`.

## Editing an Existing Message

To edit an existing message:

1. Find the key in `src/messages/en-US/orca.json`
2. Update the value in **all four** language files:
   - `src/messages/en-US/orca.json`
   - `src/messages/en-AU/orca.json`
   - `src/messages/fr/orca.json`
   - `src/messages/it/orca.json`
3. Ensure translations are updated appropriately for each language

## Message Parameters

To include dynamic values in messages, use `{paramName}` syntax:

**In JSON**:

```json
{
	"greeting": "Hello {name}! You have {count} messages."
}
```

**In code**:

```typescript
import * as m from '$lib/i18n/messages';
const text = m.greeting({ name: 'Alice', count: 5 });
// Result: "Hello Alice! You have 5 messages."
```

## Common Mistakes to Avoid

| Mistake                            | Correct Approach                                               |
| ---------------------------------- | -------------------------------------------------------------- |
| Editing `src/lib/i18n/messages.js` | Edit only `src/messages/{lang}/orca.json` files                |
| Adding to only `en-US`             | Add to **all four** language files                             |
| Missing translation values         | Use source text for en-US/en-AU; copy or placeholder for fr/it |
| Invalid JSON syntax                | Ensure valid JSON (no trailing commas, proper quotes)          |
| Wrong parameter syntax             | Use `{paramName}` not `${paramName}` or `{{paramName}}`        |

## Linting

The project includes Inlang lint rules that check for:

- Missing translations (all keys must exist in all languages)
- Empty patterns
- Messages without source

If you see lint errors, ensure all keys are present in all language files.

## Human Workflow (Sherlock Extension)

Humans can use the Sherlock VS Code extension for a visual workflow:

1. Select text in code
2. Press `Cmd+.` (Mac) or `Ctrl+.` (Windows/Linux) to open Quick Fix
3. Choose "Translate" to assign an ID and add translations

As an LLM, you must replicate this workflow manually by editing the JSON files directly.

## Example: Adding a New Error Message

Let's say you need to add: "Invalid email address"

1. Generate key: `sharp_clear_fox_validate`
2. Add to `src/messages/en-US/orca.json`:
   ```json
   "sharp_clear_fox_validate": "Invalid email address"
   ```
3. Add to `src/messages/en-AU/orca.json`:
   ```json
   "sharp_clear_fox_validate": "Invalid email address"
   ```
4. Add to `src/messages/fr/orca.json`:
   ```json
   "sharp_clear_fox_validate": "Adresse e-mail invalide"
   ```
5. Add to `src/messages/it/orca.json`:
   ```json
   "sharp_clear_fox_validate": "Indirizzo email non valido"
   ```
6. Use in code:
   ```typescript
   import * as m from '$lib/i18n/messages';
   throw error(400, m.sharp_clear_fox_validate());
   ```

## Reference Files

- Configuration: `project.inlang/settings.json` - defines source language, target languages, and path pattern
- Vite config: `vite.config.js` - Paraglide plugin configuration with `outdir: './src/lib/i18n'`
- Example usage: `src/hooks.server.ts` - shows how to import and use messages
- Source messages: `src/messages/en-US/orca.json` - reference for key patterns and interpolation syntax
