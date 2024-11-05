//native file system module, used to read the commands /
const fs = require("node:fs");

//native path utility module : helps construct paths to access files
const path = require("node:path");
// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

//allows me to access commands in other files
client.commands = new Collection();

//path.join() helps to construct a path to the commands dir
const foldersPath = path.join(__dirname, "commands");

//fs.readdirSync reads the path to the dir and returns an array of all the folder names it contains
const commandFolders = fs.readdirSync(foldersPath);

//loop in commandfolders arr which is given by first readdirSync: ['utility']
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    //reads the path to this dir and returns an arr with all the file names
    .readdirSync(commandsPath)
    //filter only JS files
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    //if condition helps to prevent errrs resulting from loading empty/unfinished/incorrect command files
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

//to respond to a command : need to create a listener for the Client#interactionCreate event that will execute code
//when the app receives an interaction
client.on(Events.InteractionCreate, async (interaction) => {
  //not every interaction is a slash command
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});
