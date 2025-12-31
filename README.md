# wt (Worktree Session)

**wt** is a CLI tool designed to eliminate context-switching friction for developers. It automates the creation of isolated development environments using **Git Worktrees** and **Tmux**, allowing you to work on multiple tickets simultaneously branch switching.

## Features

- **Instant Contexts:** Creates a dedicated folder and Git Worktree for every ticket.
- **Tmux Orchestration:** Automatically spins up sessions and windows per repository.
- **Auto-Cleanup:** Safely tears down worktrees, git branches, and sessions when a ticket is finished.

**Disclaimer**
Each worktree created will be running either `npm` or `yarn` for now, init script customization will be added in the future.

## Installation

Since this is a personal tool, install it locally:

```bash
# 1. Clone & Install Dependencies
git clone <your-repo-url>
cd wts
npm install

# 2. Build the project
npm run build

# 3. Link globally
npm link
```

## Configuration

Create a config file at `~/.config/dev-flow/config.json`

- Directories: Where your repos live and where new worktrees should go.
- Templates: Paths to your custom shell script and markdown note template.
- Repos: The list of repositories to checkout for each ticket.

```json
{
  "directories": {
    "base": "/Users/you/Dev",
    "worktrees": "/Users/you/dev/worktrees",
    "notes": "/Users/you/notes/Tickets"
  },
  "repos": {
    "web-app": { "path": "web-app", "manager": "npm" },
    "api-server": { "path": "backend-api", "manager": "yarn" }
  }
}
```

## Usage

1. Start a ticket
   Sets up worktrees, runs your init script, and opens your notes.

```bash
wt start
```

2. View active tickets
   List down tickets that are not done and hot-swap your Tmux session to that context.

```bash
wt list
```

3. Finish & Archive
   Tears down the Tmux session, removes the worktrees, deletes the local branch, and marks the note as done.

```bash
wts finish
```

## Todo

- [ ] Custom note template
- [ ] Custom init script
- [ ] Work with VSCode Multiroot Workspace
- [ ] Auto-detect git repositories
