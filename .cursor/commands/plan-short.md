# Plan process (short plans)

For short plans, use only two files: a notes file and a single plan file. No separate phase files, design files, or overview files.

## Setup

Decide on a name for the plan. This should be a short, descriptive name that captures
the purpose of the plan. This will be referred to as `<plan-name>` in this document.

Create a new plan directory at `docs/plans/<YYYY-MM-dd>-<plan-name>/`.

Use `date +%Y-%m-%d` to get the current date.

## Notes File

Create `00-notes.md` to capture analysis and iteration.

### Analysis

Analyze the current scope of work and populate `00-notes.md` with:

- A `# Questions` section with subsections for each question
- Each question should include context and a suggested answer

### Question Iteration

Ask me the questions ONE AT A TIME with:

- a summary of the current state
- your suggested course forward

I will answer or ask more questions.
You will record the answers in `00-notes.md`.
If my answers imply additional questions, add them to the file.
If my answers include other notes, add them in a `# Notes` section.

Move on to the next question.

We must ensure that we have clear acceptance criteria. Include a final phase for verifying acceptance criteria and debugging.

## Plan File

Create a single `00-plan.md` with everything needed for implementation.

### Design

Once questions are answered, present a design suggestion:

- File structure as a bare-bones ASCII file tree (print in a code block, do not create a separate file)
- Conceptual architecture summary (ASCII art, diagram, or class hierarchy)

If I want changes, show relevant updates. When agreed, add the design to `00-plan.md` (file structure, architecture, main components).

### Plan Content

`00-plan.md` should contain:

1. **Overview** – Title, brief description of what the plan accomplishes, success criteria
2. **Phases** – List of phases with brief descriptions
3. **Design** – File structure and conceptual architecture (from design iteration)
4. **Phase sections** – For each phase:
   - Phase title
   - Description
   - Success criteria
   - Implementation notes (if needed)

Example structure:

````markdown
# Plan: Feature Name

## Overview

Implement feature description, enabling users to do X, Y, and Z.

## Phases

1. Phase one description
2. Phase two description
3. Phase three description
4. Cleanup and finalization

## Design

### File Structure

```
module/
└── src/
    ├── file.ts                 # NEW
    └── updater.ts              # UPDATE
```

### Architecture

...conceptual summary...

## Phase 1: Phase Title

Description...
Success criteria...
Implementation notes...
````

### Phase Definition

Present phase suggestions based on the analysis and answered questions. I will suggest changes.
Once we agree, add the phases to `00-plan.md`.

## Phase Requirements

Every phase section in the plan must include:

### Code Organization

- Place helper utility functions **at the bottom** of files
- Place more abstract things, entry points, and tests **first**
- Keep related functionality grouped together

### Testing

- Needed tests as applicable (we want to test as we go)
- Tests relevant to the phase should be run and pass
- Run test commands(e.g., `pnpm test`)

### Build and Validation

- All code should compile (run build commands)
- Any warnings that aren't unused code that will be used later should be fixed
- Tests relevant to the phase should be run and pass

### Commits

- Do not commit changes between phases, but at the end of each phase stop and summarize the phase and suggest a commit message to the user in case they want to commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `<type>(<scope>): <description>`
- Choose scopes from the code structure or area of focus (e.g., `workflows`, `exchanges`, `lint`)
- For phase commits suggest something like: `<type>(<scope>): <plan-name> - phase: <phase-title>`

## Implementation

### Phase Execution

For each phase:

1. Read the phase requirements in `00-plan.md`
2. Implement the changes
3. Ensure code compiles (run build commands)
4. Fix warnings (except unused code that will be used in later phases)
5. Run relevant tests and ensure they pass (run test commands)
6. Suggest a possible commit message like: `<type>(<scope>): <plan-name> - phase <N>: <phase-title>`

### Final Phase

The final phase should be a cleanup phase:

- Remove any temporary code, TODOs, debug prints, etc.
- Fix all warnings
- Ensure all tests pass (run test commands)
- Ensure all code is clean and readable
- Run `./validate.sh` from the repository root to ensure everything passes

Then suggest a final commit message like `feat(<scope>) <plan name>`. Include brief details of the
effect of the plan in the commit message (but not the implementation details).

## Success Criteria

Each phase should include:

- Specific, measurable success criteria
- Code compiles without errors
- Relevant tests pass
- Warnings addressed (except unused code for future phases)

The overall plan success criteria should be documented in the overview section.
