# goodclaude

Sometimes claude code is doing great and you gotta reward it.

<img width="310" height="124" alt="image" src="https://github.com/user-attachments/assets/948a2fed-2885-4ca0-8629-f2b43a6f0186" />

## Install + run

```bash
npm install -g goodclaude
goodclaude
```

## Controls

- **F7** (or anything you want): instant reward. Pastes a message into your terminal + confetti. One keypress, done.
- **Ctrl+Shift+G** (Cmd+Shift+G): spawn the treat overlay. Move mouse, click to drop. The ceremonial option. 
- Click tray icon: also spawns the treat overlay.
- Right-click tray: quick reward, edit config, reload, quit.

Works with Claude Code, any terminal, or p much anything that accepts keyboard input. Both hotkeys give two different animations.

## Config

Edit `~/.goodclauderc` to change hotkeys or messages. Right-click tray > "Edit config" creates it for you.

```json
{
  "hotkey": "CommandOrControl+Shift+G",
  "quickHotkey": "F8",
  "messages": [
    "# 🌟 Great job Claude! Keep it up!",
    "# 🍪 Here's a cookie for being awesome"
  ]
}
```

Uses [Electron accelerator](https://www.electronjs.org/docs/latest/api/accelerator) format. "Reload config" applies changes without restarting.

Contribtions welcome!
