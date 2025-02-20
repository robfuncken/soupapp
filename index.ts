import {
  TeamsActivityHandler,
  CardFactory,
  CloudAdapter,
  TurnContext,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
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
  monday: {
    main: ["Grilled Chicken", "Vegetable Lasagna"],
    sides: ["Steamed Broccoli", "Mashed Potatoes"],
    dessert: "Apple Pie",
  },
  tuesday: {
    main: ["Fish Fillet", "Mushroom Risotto"],
    sides: ["Green Salad", "Roasted Vegetables"],
    dessert: "Chocolate Pudding",
  },
  // Add other days...
};

class CafeteriaMenuBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Handler for messages
    this.onMessage(async (context: TurnContext, next: () => Promise<void>) => {
      const text = context.activity.text.toLowerCase();

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
        await context.sendActivity(`Hello! I can help you with the cafeteria menu. Try asking:
                - "What's on the menu today?"
                - "Show me Monday's menu"
                - "What's for lunch on Tuesday?"`);
      }

      await next();
    });
  }

  // Helper to extract day from message
  extractDay(text: string): string | undefined {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    return days.find((day) => text.includes(day));
  }

  // Send today's menu
  async sendTodayMenu(context: TurnContext) {
    const today = new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    await this.sendMenuForDay(context, today);
  }

  // Send menu for specific day
  async sendMenuForDay(context: TurnContext, day: string) {
    const menu = menuDatabase[day];

    if (!menu) {
      await context.sendActivity(`Sorry, I don't have the menu for ${day}.`);
      return;
    }

    const card = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: `Menu for ${day.charAt(0).toUpperCase() + day.slice(1)}`,
          size: "Large",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: "Main Dishes",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: menu.main.join("\n"),
        },
        {
          type: "TextBlock",
          text: "Sides",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: menu.sides.join("\n"),
        },
        {
          type: "TextBlock",
          text: "Dessert",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: menu.dessert,
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.5",
    });

    await context.sendActivity({ attachments: [card] });
  }

  // Send menu options when no specific day is mentioned
  async sendMenuOptions(context: TurnContext) {
    await context.sendActivity(
      "Which day would you like to see the menu for? (Monday-Friday)"
    );
  }

  // Add the run method
  async run(context: TurnContext) {
    await super.run(context);
  }
}

// Create HTTP server
const server = restify.createServer();
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
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );
  await context.sendActivity("The bot encountered an error or bug.");
};

// Create bot instance
const bot = new CafeteriaMenuBot();

// Listen for incoming requests
server.post(
  "/api/messages",
  async (req: restify.Request, res: restify.Response) => {
    await adapter.process(req, res, (context) => bot.run(context));
  }
);
