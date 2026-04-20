## Summary

<!-- One or two sentences: what changed and why. -->

## Motivation

<!-- What prompted this change? Link to the issue, scan, or conversation if any. -->

## Changes

- [ ] Code changes
- [ ] Test changes
- [ ] Documentation changes
- [ ] Infra / CI changes

## Rubric impact

Which evaluation axes does this touch?

- [ ] Code Quality — structure, readability, maintainability
- [ ] Security — safe and responsible implementation
- [ ] Efficiency — optimal use of resources
- [ ] Testing — validation of functionality
- [ ] Accessibility — inclusive and usable design
- [ ] Google Services — meaningful integration
- [ ] Problem Statement Alignment — Physical Event Experience

## Test plan

<!-- How did you verify? Commands, curl recipes, screenshots, or links to CI runs. -->

## Vertex AI spend

<!-- Approximate tokens and USD cost for any new Gemini call path. See docs/cost-analysis.md. -->

- Tokens:
- USD:

## Checklist

- [ ] `ruff check` + `mypy` clean on touched Python services
- [ ] `tsc --noEmit` + `npm run lint` clean on touched Node services
- [ ] New or modified tests added
- [ ] `docs/**` updated if behaviour or interfaces changed
- [ ] Repo stays under 1 MB (check `du -sh --exclude=.git .`)
- [ ] No secrets or `.env` contents in the diff

## Screenshots / recordings

<!-- Optional but encouraged for UI changes. -->
