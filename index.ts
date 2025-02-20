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
import "./src/express-server";
import { DatabaseService } from "./src/services/database";

const ENV_FILE = path.join(__dirname, ".env");
dotenv.config({ path: ENV_FILE });

class SoupMenuBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onConversationUpdate(async (context: TurnContext) => {
      if (
        context.activity.membersAdded &&
        context.activity.membersAdded.length > 0
      ) {
        for (const member of context.activity.membersAdded) {
          if (member.id !== context.activity.recipient.id) {
            await context.sendActivity(
              "Hallo! Ik kan je helpen met het soep menu. Probeer te vragen:\n" +
                "- 'Wat is de soep vandaag bij HQ?'\n" +
                "- 'Toon me de soep voor maandag bij HSL'\n" +
                "- 'Welke soep is er bij LD?'"
            );
          }
        }
      }
    });

    this.onMessage(async (context: TurnContext) => {
      try {
        const text = context.activity.text?.toLowerCase() || "";
        const location = this.extractLocation(text);

        if (text.includes("soep")) {
          if (text.includes("vandaag")) {
            await this.sendTodaySoup(context, location);
          } else {
            const day = this.extractDay(text);
            if (day && location) {
              await this.sendSoupForDayAndLocation(context, day, location);
            } else if (location) {
              const today = new Date();
              await this.sendSoupForDayAndLocation(context, today, location);
            } else {
              await this.sendLocationOptions(context);
            }
          }
        } else {
          await context.sendActivity({
            type: ActivityTypes.Message,
            text:
              "Hallo! Ik kan je helpen met het soep menu. Probeer te vragen:\n" +
              "- 'Wat is de soep vandaag bij HQ?'\n" +
              "- 'Toon me de soep voor maandag bij HSL'\n" +
              "- 'Welke soep is er bij LD?'",
          });
        }
      } catch (error) {
        console.error("Error in message handler:", error);
        await context.sendActivity(
          "Sorry, er is een fout opgetreden bij het verwerken van je verzoek."
        );
      }
    });
  }

  extractLocation(text: string): string | undefined {
    const locations = ["hq", "hsl", "ld"];
    return locations
      .find((loc) => text.includes(loc.toLowerCase()))
      ?.toUpperCase();
  }

  // Helper to extract day from message
  extractDay(text: string): Date | undefined {
    const days = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag"];
    const foundDay = days.find((day) => text.includes(day));
    if (!foundDay) return undefined;

    const date = new Date();
    const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetDay = days.indexOf(foundDay) + 1; // +1 because our array starts at 0
    const diff = targetDay - currentDay;

    date.setDate(date.getDate() + diff);
    return date;
  }

  async sendTodaySoup(context: TurnContext, location?: string) {
    const today = new Date();
    if (location) {
      await this.sendSoupForDayAndLocation(context, today, location);
    } else {
      await this.sendAllLocationsSoup(context, today);
    }
  }

  async sendSoupForDayAndLocation(
    context: TurnContext,
    date: Date,
    location: string
  ) {
    const soups = await DatabaseService.getSoupsForLocation(location, date);

    if (soups.length === 0) {
      await context.sendActivity(
        `Sorry, er zijn geen soepen beschikbaar bij ${location} op ${date.toLocaleDateString(
          "nl-NL"
        )}.`
      );
      return;
    }

    const cardAttachment = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: `Soepen bij ${location} - ${date.toLocaleDateString("nl-NL")}`,
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "center",
        },
        ...soups.map((soup) => {
          const locationInfo = soup.locaties.find(
            (loc) => loc.location.naam === location
          )!;
          return {
            type: "Container",
            style: "emphasis",
            items: [
              {
                type: "TextBlock",
                text: soup.naam,
                size: "Medium",
                weight: "Bolder",
              },
              {
                type: "TextBlock",
                text: `Prijs: €${locationInfo.prijs.toFixed(2)}`,
                spacing: "small",
              },
              {
                type: "TextBlock",
                text: soup.vegetarisch
                  ? "🌱 Vegetarisch"
                  : "🥩 Niet vegetarisch",
                spacing: "small",
              },
            ],
          };
        }),
      ],
    });

    await context.sendActivity({
      type: ActivityTypes.Message,
      attachments: [cardAttachment],
    });
  }

  async sendLocationOptions(context: TurnContext) {
    await context.sendActivity(
      "Bij welke locatie wil je de soep weten? (HQ, HSL, of LD)"
    );
  }

  async sendAllLocationsSoup(context: TurnContext, date: Date) {
    await this.sendAllSoupsForDay(context, date);
  }

  // Add a method to show all soups for a day
  async sendAllSoupsForDay(context: TurnContext, date: Date) {
    const soups = await DatabaseService.getSoupsForDate(date);
    if (soups.length === 0) {
      await context.sendActivity(
        `Sorry, ik heb geen soep informatie voor ${date.toLocaleDateString(
          "nl-NL"
        )}.`
      );
      return;
    }

    const cardAttachment = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: `Alle soepen voor ${
            date.toLocaleDateString("nl-NL").charAt(0).toUpperCase() +
            date.toLocaleDateString("nl-NL").slice(1)
          }`,
          size: "Large",
          weight: "Bolder",
          horizontalAlignment: "center",
        },
        ...soups.map((soup) => ({
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: soup.naam,
              size: "Medium",
              weight: "Bolder",
            },
            {
              type: "TextBlock",
              text: soup.vegetarisch ? "🌱 Vegetarisch" : "🥩 Niet vegetarisch",
              spacing: "small",
            },
            {
              type: "TextBlock",
              text: "Beschikbaar bij:",
              spacing: "small",
            },
            {
              type: "TextBlock",
              text: soup.locaties
                .map((loc) => `${loc.location.naam}: €${loc.prijs.toFixed(2)}`)
                .join("\n"),
              spacing: "small",
            },
          ],
        })),
      ],
    });

    await context.sendActivity({
      type: ActivityTypes.Message,
      attachments: [cardAttachment],
    });
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

server.listen(process.env.BOT_PORT || process.env.PORT || 3978, () => {
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
const bot = new SoupMenuBot();

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
