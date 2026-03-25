const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, WebhookClient, ChannelType } = require('discord.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const TOKEN = config.TOKEN;
const DEFAULT_CHANNEL = config.DEFAULT_COUNT_CHANNEL;
const RESET_ON_INCORRECT = config.RESET_ON_INCORRECT ?? true;
const HIDE_FROM_LEADERBOARD = config.HIDE_FROM_LEADERBOARD ?? false;
const SKIP_LEADERBOARD = new Set(config.SKIP_LEADERBOARD_FOR_SERVERS ?? []);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// In-memory storage
const serverData = {}; // { guildId: { count: number, lastUser: string, hideFromLeaderboard: boolean, countChannel: string, resetOnIncorrect: boolean } }
const webhookCache = new Map();

function getServerData(guildId) {
    if (!serverData[guildId]) {
        serverData[guildId] = {
            count: 0,
            lastUser: null,
            hideFromLeaderboard: HIDE_FROM_LEADERBOARD,
            countChannel: DEFAULT_CHANNEL,
            resetOnIncorrect: RESET_ON_INCORRECT
        };
    }
    return serverData[guildId];
}

async function getWebhook(channel) {
    if (webhookCache.has(channel.id)) return webhookCache.get(channel.id);

    const hooks = await channel.fetchWebhooks();
    let hook = hooks.find(h => h.name === 'Counter Bot');
    if (!hook) {
        hook = await channel.createWebhook({ name: 'Counter Bot' });
    }
    webhookCache.set(channel.id, hook);
    return hook;
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const guildId = message.guild?.id;
    if (!guildId) return;

    const data = getServerData(guildId);
    if (message.channel.name !== data.countChannel) return;

    if (!/^\d+$/.test(message.content)) {
        await message.delete();
        return;
    }

    const number = parseInt(message.content);

    if (message.author.id === data.lastUser) {
        await message.delete();
        return;
    }

    if (number === data.count + 1) {
        data.count = number;
        data.lastUser = message.author.id;

        const webhook = await getWebhook(message.channel);
        await message.delete();
        await webhook.send({
            content: number.toString(),
            username: message.author.username,
            avatarURL: message.author.displayAvatarURL()
        });
    } else {
        await message.delete();
        if (data.resetOnIncorrect) {
            data.count = 0;
            data.lastUser = null;
        }
    }
});

// --------------------------
// Slash commands
// --------------------------
const commands = [
    {
        name: 'disable',
        description: 'Disable counting and delete all counting data'
    },
    {
        name: 'howitworks',
        description: 'Explain how the counting bot works'
    },
    {
        name: 'info',
        description: 'Bot info'
    },
    {
        name: 'leaderboard',
        description: 'View the global counting leaderboard'
    },
    {
        name: 'leaderboard-visibility',
        description: 'Toggle whether this server is hidden from leaderboard'
    },
    {
        name: 'ping',
        description: 'Check bot latency'
    },
    {
        name: 'setup',
        description: 'Setup counting channel and options',
        options: [
            {
                type: 7, // CHANNEL
                name: 'channel',
                description: 'Channel to use for counting',
                required: false,
                channel_types: [ChannelType.GuildText]
            },
            {
                type: 5, // BOOLEAN
                name: 'reset_on_incorrect',
                description: 'Reset counter if someone counts wrong?',
                required: false
            },
            {
                type: 5, // BOOLEAN
                name: 'hide_from_leaderboard',
                description: 'Hide this server from leaderboard?',
                required: false
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationCommands(client.user?.id || '0'), { body: commands });
        console.log('Slash commands registered.');
    } catch (error) {
        console.error(error);
    }
})();

// Command handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const data = getServerData(interaction.guild.id);

    switch (interaction.commandName) {
        case 'disable':
            delete serverData[interaction.guild.id];
            await interaction.reply({ content: '✅ Counting disabled and data cleared.', ephemeral: true });
            break;
        case 'howitworks':
            await interaction.reply({
                content: `📜 **How It Works**:
- Count upward messages in order.
- Wrong numbers are deleted.
- Correct numbers are reposted via webhook.
- Same user cannot count twice in a row.
- Optional reset on incorrect count.
- Leaderboard tracks counts globally.`,
                ephemeral: true
            });
            break;
        case 'info':
            await interaction.reply({
                content: `🔢 **Counter Bot**
Made by Tyler and Chloe
Current guild: ${interaction.guild.name}`,
                ephemeral: true
            });
            break;
        case 'leaderboard':
            const lines = [];
            for (const [guildId, gData] of Object.entries(serverData)) {
                if (gData.hideFromLeaderboard) continue;
                const guild = client.guilds.cache.get(guildId);
                const guildName = guild ? guild.name : guildId;
                lines.push(`${guildName}: ${gData.count}`);
            }
            await interaction.reply({
                content: lines.length ? lines.join('\n') : 'No servers currently tracked.',
                ephemeral: true
            });
            break;
        case 'leaderboard-visibility':
            data.hideFromLeaderboard = !data.hideFromLeaderboard;
            await interaction.reply({
                content: `Hide from leaderboard: ${data.hideFromLeaderboard}`,
                ephemeral: true
            });
            break;
        case 'ping':
            await interaction.reply({ content: `Pong! ${Math.round(client.ws.ping)}ms`, ephemeral: true });
            break;
        case 'setup':
            const channel = interaction.options.getChannel('channel');
            const resetOnIncorrect = interaction.options.getBoolean('reset_on_incorrect') ?? true;
            const hideFromLeaderboard = interaction.options.getBoolean('hide_from_leaderboard') ?? false;

            data.countChannel = channel ? channel.name : DEFAULT_CHANNEL;
            data.resetOnIncorrect = resetOnIncorrect;
            data.hideFromLeaderboard = hideFromLeaderboard;

            await interaction.reply({
                content: `✅ Setup complete for channel #${data.countChannel}`,
                ephemeral: true
            });
            break;
    }
});

client.login(TOKEN);
