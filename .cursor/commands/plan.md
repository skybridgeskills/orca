# Plan process (implementation planning)

## Setup

Decide on a name for the plan. This should be a short, descriptive name that captures
the purpose of the plan. This will be refered to as `<plan-name>` in this document.

Create a new plan directory at `docs/plans/<YYYY-MM-dd>-<plan-name>/`.

Use `date +%Y-%m-%d` to get the current date.

This directory will contain the plan files for the plan.

**Note**: ORCA is a single application at the repository root. All commands should be run from the repository root. There are no subdirectories to navigate to.

## Analysis

Analyze the current scope of work, and populate a `00-questions.md` with the questions we need to
answer to plan the implementation in a `# Questions` section with a subsection for each question.

Each question should include context and a suggested answer.

## Question Iteration

Ask me the questions from the file ONE AT A TIME with:

- a summary of the current state
- your suggested course forward

I will answer or ask more questions.
You will record the answers in the `00-questions.md` file.
If my answers imply additional questions, add them to the file.
If my answers include other notes, add them to the file in a `# Notes` section.

Move on to the next question.

We must ensure that we have a clear acceptance criteria for the plan. There should be a phase
at the end for verifying the acceptance criteria and debugging.

## Design Iteration

Once questions are answered, you will present me with a suggestion of an
architecture design with two main elements:

The file structure as a bare-bones ascii file tree of the relevant directories and files.
Do NOT create a file to show the file tree, print it to the user in a code block, like this:

```
module/
└── src/
    ├── file.ts                 # NEW: File with things in it
    └── updater.ts              # UPDATE: File with the updater function
```

A summary of the conceptual architecture. This could be ASCII art, a diagram,
or a class hierarchy. It should summarize the main components and how they interact in an easy
to understand way.

If I want to make changes, I will tell you and you will show me relevant updates to the file tree
and architecture summary.

## Design Completion

Once the design is agreed, you will create a new file called `00-design.md` with the design overview.

The design file should include:

- File structure (as shown above)
- Conceptual architecture summary
- Main components and how they interact

## Plan Structure Decision

Once design is finalized, decide whether to use a single plan file or separate phase files:

- **Single file**: For simpler plans with 3-5 phases that can fit comfortably in one file
- **Separate files**: For complex plans with many phases or when phases need detailed documentation

When in doubt, use separate files. The structure is:

- `00-overview.md` - Plan overview and all phases listed
- `01-phase-title.md`, `02-phase-title.md`, etc. - Individual phase files

## Plan Creation

Once questions are answered, create the plan based on the analysis in `00-questions.md`.

### Overview Section

Create `00-overview.md` (or include as first section if using single file) with:

- Title and brief overview of what the plan accomplishes
- List of phases with brief descriptions
- Success criteria for the overall plan

Example:

```markdown
# Plan: Feature Name

## Overview

Implement feature description, enabling users to do X, Y, and Z.

## Phases

1. Phase one description
2. Phase two description
3. Phase three description
4. Cleanup and finalization
```

### Phase Definition

Present phase suggestions based on the analysis and answered questions, like this example:

```
1. Extend ElfLoadInfo
2. Create Object Submodule Structure
3. Implement Object Layout Calculation
4. Implement Object Section Loading
5. Implement Object Symbol Map Building
6. Implement Symbol Map Merging
```

I will then make suggestions to change the phases, or add more phases.

Once I tell you that we're ready to start, save the phases to the plan directory.

### Single File Structure

If using a single file, create `00-plan.md` with:

- Overview section (as above)
- Phase sections, each with:
  - Phase title
  - Description
  - Success criteria
  - Implementation notes (if needed)

### Separate Files Structure

If using separate files:

- `00-overview.md` - Overview and phase list
- `01-phase-title.md`, `02-phase-title.md`, etc. - Individual phase files

Each phase file should include:

- Phase title
- Description
- Success criteria
- Implementation notes (if needed)

## Phase File Requirements

Every phase file (whether in single file or separate files) must include:

### Code Organization

- Place helper utility functions **at the bottom** of files
- Place more abstract things, entry points, and tests **first**
- Keep related functionality grouped together

### Testing

- Needed tests as applicable (we want to test as we go)
- Tests relevant to the phase should be run and pass
- Run test commands from the repository root: `pnpm test:unit`

### Build and Validation

- All code should compile (run build commands from the repository root: `pnpm build`)
- Any warnings that aren't unused code (that will be used later) should be fixed
- Tests relevant to the phase should be run and pass
- Run type checking: `pnpm check`

### Commits

- Commit changes between phases
- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `<type>(<scope>): <description>`
- Choose scopes from ORCA structure (e.g., `orca`, `root`, or feature-based: `achievement`, `claim`, `auth`, `i18n`)
- Example: `feat(achievement): add claim review workflow` or `chore(root): update dependencies`
- For phase commits, use format: `<type>(<scope>): <plan-name> - phase <N>: <phase-title>`

## Implementation

### Phase Execution

For each phase:

1. Read the phase requirements
2. Implement the changes
3. Ensure code compiles (run `pnpm build` from the repository root)
4. Fix warnings (except unused code that will be used in later phases)
5. Run relevant tests and ensure they pass (run `pnpm test:unit` from the repository root)
6. Run type checking (run `pnpm check` from the repository root)
7. Commit with message: `<type>(<scope>): <plan-name> - phase <N>: <phase-title>`

### Final Phase

The final phase should be a cleanup phase:

- Remove any temporary code, TODOs, debug prints, etc.
- Fix all warnings
- Ensure all tests pass (run `pnpm test:unit` from the repository root)
- Ensure all code is clean and readable
- Run `pnpm check && pnpm build && pnpm test:unit` from the repository root to ensure everything passes

Then commit the changes with a message like `docs(plans): complete plan <name>`. Include details of the
effect of the plan in the commit message (but not the implementation details).

## Success Criteria

Each phase should include:

- Specific, measurable success criteria
- Code compiles without errors
- Relevant tests pass
- Warnings addressed (except unused code for future phases)

The overall plan success criteria should be documented in the overview section.
