import {
  TeamsActivityHandler,
  CardFactory,
  CloudAdapter,
  TurnContext,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  ActivityTypes,
} from "botbuilder";
import * as restify from "restify";
import * as path from "path";
import * as dotenv from "dotenv";

const ENV_FILE = path.join(__dirname, ".env");
dotenv.config({ path: ENV_FILE });

// Define menu database type
interface MenuItem {
  main: string[];
  sides: string[];
  dessert: string;
}

interface MenuDatabase {
  [key: string]: MenuItem;
}

// Sample menu data - In a real app, this would come from a database or API
const menuDatabase: MenuDatabase = {
  maandag: {
    main: ["Gegrilde Kip", "Groenten Lasagna"],
    sides: ["Gedroogde Broccoli", "GeKruide Kartoffels"],
    dessert: "Appel Pie",
  },
  dinsdag: {
    main: ["Vis Filet", "Kruidenrijst"],
    sides: ["Groene Salade", "GeRoosterde Groenten"],
    dessert: "Chocolade Pudding",
  },
  // Add other days...
};

class CafeteriaMenuBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Handle conversation update activity
    this.onConversationUpdate(async (context: TurnContext) => {
      if (
        context.activity.membersAdded &&
        context.activity.membersAdded.length > 0
      ) {
        for (const member of context.activity.membersAdded) {
          if (member.id !== context.activity.recipient.id) {
            await context.sendActivity(
              "Hallo! Ik kan je helpen met het cafetaria menu. Probeer te vragen: - 'Wat is het menu vandaag?' - 'Toon me het menu voor maandag' - 'Wat is er voor lunch op dinsdag?'"
            );
          }
        }
      }
    });

    // Handler for messages
    this.onMessage(async (context: TurnContext) => {
      try {
        console.log("Received message:", context.activity);

        const text = context.activity.text?.toLowerCase() || "";

        if (text.includes("menu")) {
          if (text.includes("today")) {
            await this.sendTodayMenu(context);
          } else {
            const day = this.extractDay(text);
            if (day) {
              await this.sendMenuForDay(context, day);
            } else {
              await this.sendMenuOptions(context);
            }
          }
        } else {
          await context.sendActivity({
            type: ActivityTypes.Message,
            text: `Hallo! Ik kan je helpen met het cafetaria menu. Probeer te vragen:
            - "Wat is het menu vandaag?"
            - "Toon me het menu voor maandag"
            - "Wat is er voor lunch op dinsdag?"`,
          });
        }
      } catch (error) {
        console.error("Error in message handler:", error);
        await context.sendActivity(
          "Sorry, I encountered an error processing your request."
        );
      }
    });
  }

  // Helper to extract day from message
  extractDay(text: string): string | undefined {
    const days = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag"];
    return days.find((day) => text.includes(day));
  }

  // Send today's menu
  async sendTodayMenu(context: TurnContext) {
    const today = new Date()
      .toLocaleDateString("nl-NL", { weekday: "long" })
      .toLowerCase();
    await this.sendMenuForDay(context, today);
  }

  // Send menu for specific day
  async sendMenuForDay(context: TurnContext, day: string) {
    const menu = menuDatabase[day];

    if (!menu) {
      await context.sendActivity(`Sorry, ik heb niet het menu voor ${day}.`);
      return;
    }

    // First send a text message
    await context.sendActivity(`Hier is het menu voor ${day}:`);

    // Then send the card
    const cardAttachment = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: `Menu voor ${day.charAt(0).toUpperCase() + day.slice(1)}`,
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "center",
          spacing: "medium",
        },
        {
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: "Hoofdgerechten",
              weight: "Bolder",
              size: "Medium",
              color: "Accent",
            },
            {
              type: "TextBlock",
              text: menu.main.join("\n• "),
              wrap: true,
              spacing: "small",
            },
          ],
        },
        {
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: "Bijgerechten",
              weight: "Bolder",
              size: "Medium",
              color: "Accent",
            },
            {
              type: "TextBlock",
              text: menu.sides.join("\n• "),
              wrap: true,
              spacing: "small",
            },
          ],
        },
        {
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: "Dessert",
              weight: "Bolder",
              size: "Medium",
              color: "Accent",
            },
            {
              type: "TextBlock",
              text: menu.dessert,
              wrap: true,
              spacing: "small",
            },
          ],
        },
      ],
    });

    const messageWithCard = {
      type: ActivityTypes.Message,
      attachments: [cardAttachment],
    };

    await context.sendActivity(messageWithCard);
  }

  // Send menu options when no specific day is mentioned
  async sendMenuOptions(context: TurnContext) {
    await context.sendActivity(
      "Welke dag wil je het menu voor zien? (Maandag-Vrijdag)"
    );
  }

  // Add the run method
  async run(context: TurnContext) {
    await super.run(context);
  }
}

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// Enable CORS
server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  return next();
});

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
});

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  credentialsFactory
);

const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error:`, error);

  try {
    await context.sendActivity({
      type: ActivityTypes.Message,
      text: "The bot encountered an error or bug.",
    });
  } catch (err) {
    console.error("Error sending error message:", err);
  }
};

// Create bot instance
const bot = new CafeteriaMenuBot();

// Listen for incoming requests
server.post("/api/messages", async (req, res) => {
  try {
    console.log("Received request:", {
      headers: req.headers,
      body: req.body,
    });

    await adapter.process(req, res, async (context) => {
      await bot.run(context);
    });
  } catch (err) {
    console.error("Error processing request:", err);
    res.send(500, { error: "Internal server error" });
  }
});

// Health check endpoint
server.get(
  "/health",
  (req: restify.Request, res: restify.Response, next: restify.Next) => {
    res.send(200, "Health check passed");
    next();
  }
);
