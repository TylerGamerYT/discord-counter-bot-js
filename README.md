# 🔢 Discord Counter Bot (JavaScript / Node.js)

A counting bot with slash commands and webhook reposting.
Correct numbers are reposted through a webhook; wrong numbers are deleted silently.

---

## ✨ Features

* Counts upward messages in order

* Wrong numbers are deleted silently

* Prevents same user from counting twice in a row

* Slash commands:

  * `/disable` → disables counting and clears data
  * `/howitworks` → explains how the bot works
  * `/info` → shows bot info
  * `/leaderboard` → view global counting leaderboard
  * `/leaderboard-visibility` → toggle whether server is hidden
  * `/ping` → check bot latency
  * `/setup` → setup channel and options

* Server-specific options:

  * `reset_on_incorrect` → reset counter if someone counts wrong
  * `hide_from_leaderboard` → hide this server from global leaderboard

---

## ⚙️ Setup

### Step 1: Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Go to **Bot → Add Bot**
4. Enable **Message Content Intent**

---

### Step 2: Invite the Bot

OAuth2 → URL Generator:

**Scopes:** `bot`
**Bot Permissions:**

* View Channels
* Send Messages
* Manage Messages
* Manage Webhooks
* Read Message History

---

### Step 3: Install Dependencies

```bash
npm install
```

*(requires `discord.js` v14+)*

---

### Step 4: Configure

Edit `config.json`:

```json
{
  "TOKEN": "YOUR_BOT_TOKEN_HERE",
  "DEFAULT_COUNT_CHANNEL": "counting",
  "RESET_ON_INCORRECT": true,
  "HIDE_FROM_LEADERBOARD": false,
  "SKIP_LEADERBOARD_FOR_SERVERS": []
}
```

---

### Step 5: Run the Bot

```bash
node index.js
```

---

## 👑 Made By

**Tyler** and his friend **Chloe**
