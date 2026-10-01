# GitHub Actions workflows (switched off here)

Slack's GitHub runs Actions only for repositories in the `slack` organization. Anywhere else, a pre-receive hook
rejects workflow files (`.github/workflows/`), because there are no runners for them. So the kit's workflows wait
here, as in the web kit (slack-remix `ci/`):

| Workflow | What it does |
|---|---|
| `workflows/ci.yml` | Every push to `main` and every pull request: `npm run check`, then the self-test in headless Chrome, light and dark |
| `workflows/pages.yml` | Every push to `main`: builds with the Pages base path and deploys the kit to the repository's (internal) GitHub Pages |

To switch them on, move the repository somewhere with runners and run `git mv ci/workflows .github/workflows`. Until
then, run the checks before you push (`npm run check`, `npm run selftest`) and publish by hand
(`docs/publishing.md`).
