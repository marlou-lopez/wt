import { $, chalk } from 'zx';

const SESSION_NAME_PREFIX = "wt_";
// Adding prefix to prevent issue with creating a tmux window with only number as a name
export function getSessionName(sessionName: string) {
  return `${SESSION_NAME_PREFIX}${sessionName}`
}

export async function ensureSession(sessionName: string): Promise<boolean> {
  try {
    await $`tmux has-session -t ${getSessionName(sessionName)}`;
    return false; // Existed
  } catch {
    await $`tmux new-session -d -s ${getSessionName(sessionName)} -n 'dashboard'`;
    return true; // Created
  }
}

export async function killSession(sessionName: string) {
  try {
    await $`tmux kill-session -t ${getSessionName(sessionName)}`;
  } catch {
  }
}

export async function createWindow(sessionName: string, windowName: string, cwd: string) {
  try {
    await $`tmux new-window -t ${getSessionName(sessionName)} -n ${windowName} -c ${cwd}`;
  } catch{
  }
}

export async function sendKeys(target: string, command: string) {
  try {
    const process = await $`tmux send-keys -t ${getSessionName(target)} ${command} C-m`;
  } catch{
  }
}
