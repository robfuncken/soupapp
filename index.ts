import * as path from "path";
import * as dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { DatabaseService } from "./src/services/database";
import * as cron from "node-cron";

const ENV_FILE = path.join(__dirname, ".env");
dotenv.config({ path: ENV_FILE });

class SoupMenuTelegramBot {
  private bot: Telegraf;
  private chatIds: Set<number> = new Set(); // Store chat IDs for notifications

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.setupHandlers();
    this.setupCronJob();
  }

  private setupCronJob() {
    // Schedule task to run at 12:00 on every weekday
    cron.schedule(
      "0 12 * * 1-5",
      async () => {
        console.log("🕒 Running daily soup notification");
        try {
          const message = await this.getTodaySoup();

          // Send to all stored chat IDs
          for (const chatId of this.chatIds) {
            try {
              await this.bot.telegram.sendMessage(chatId, message);
              console.log(`✅ Sent daily soup notification to chat ${chatId}`);
            } catch (error) {
              console.error(`❌ Failed to send to chat ${chatId}:`, error);
              // Remove invalid chat IDs
              if ((error as any).code === 403) {
                this.chatIds.delete(chatId);
              }
            }
          }
        } catch (error) {
          console.error("❌ Failed to send daily soup notifications:", error);
        }
      },
      {
        timezone: "Europe/Amsterdam", // Set to your timezone
      }
    );
  }

  private setupHandlers() {
    // Add at the start of setupHandlers
    this.bot.catch((error: any) => {
      console.error("❌ Bot error:", error);
    });

    // Debug middleware
    this.bot.use(async (ctx, next) => {
      console.log("📨 Received update:", ctx.update);
      await next();
    });

    // Command handlers must come before the text handler
    this.bot.command("start", async (ctx) => {
      console.log("🚀 Start command received");
      await ctx.reply(
        "Hallo! Ik kan je helpen met het soep menu. Probeer te vragen:\n" +
          "- 'Wat is de soep vandaag bij HQ?'\n" +
          "- 'Toon me de soep voor maandag bij HSL'\n" +
          "- 'Welke soep is er bij LD?'\n\n" +
          "Of gebruik deze commands:\n" +
          "- /subscribe - Ontvang dagelijks om 12:00 het soepmenu\n" +
          "- /unsubscribe - Schrijf je uit voor dagelijkse meldingen"
      );
    });

    // Add subscription handlers before text handler
    this.bot.command("subscribe", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        console.log("📝 Subscription request from chat:", chatId);

        this.chatIds.add(chatId);

        const response = await ctx.reply(
          "Je bent nu geabonneerd op dagelijkse soepmeldingen om 12:00! 🔔\nGebruik /unsubscribe om je uit te schrijven."
        );

        console.log(
          "✅ Subscription confirmed for chat:",
          chatId,
          "Response:",
          response
        );
      } catch (error) {
        console.error("❌ Failed to handle subscription:", error);
        try {
          await ctx.reply(
            "Sorry, er ging iets mis bij het aanmelden voor notificaties. Probeer het later opnieuw."
          );
        } catch (replyError) {
          console.error("❌ Failed to send error message:", replyError);
        }
      }
    });

    this.bot.command("unsubscribe", async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        console.log("📝 Unsubscription request from chat:", chatId);

        this.chatIds.delete(chatId);

        const response = await ctx.reply(
          "Je bent uitgeschreven van de dagelijkse soepmeldingen! 🔕\nGebruik /subscribe om je weer in te schrijven."
        );

        console.log(
          "✅ Unsubscription confirmed for chat:",
          chatId,
          "Response:",
          response
        );
      } catch (error) {
        console.error("❌ Failed to handle unsubscription:", error);
        try {
          await ctx.reply(
            "Sorry, er ging iets mis bij het afmelden voor notificaties. Probeer het later opnieuw."
          );
        } catch (replyError) {
          console.error("❌ Failed to send error message:", replyError);
        }
      }
    });

    // Text handler comes last
    this.bot.on("text", async (ctx) => {
      console.log("💬 Text message received:", ctx.message.text);
      const text = ctx.message.text.toLowerCase();
      const location = this.extractLocation(text);
      const day = this.extractDay(text);

      try {
        if (text.includes("soep")) {
          if (text.includes("vandaag")) {
            const response = await this.getTodaySoup(location);
            await ctx.reply(response);
          } else if (day) {
            // If day is specified but no location, show all soups for that day
            if (!location) {
              const response = await this.getSoupForDay(day);
              await ctx.reply(response);
            } else {
              const response = await this.getSoupForDayAndLocation(
                day,
                location
              );
              await ctx.reply(response);
            }
          } else if (location) {
            const today = new Date();
            const response = await this.getSoupForDayAndLocation(
              today,
              location
            );
            await ctx.reply(response);
          } else {
            await ctx.reply(this.getLocationOptions());
          }
        } else {
          await ctx.reply(
            "Hallo! Ik kan je helpen met het soepmenu. Probeer te vragen:\n" +
              "- 'Wat is de soep vandaag bij HQ?'\n" +
              "- 'Toon me de soep voor maandag bij HSL'\n" +
              "- 'Welke soep is er maandag?'\n" +
              "- 'Welke soep is er bij LD?'"
          );
        }
      } catch (error) {
        console.error("Error handling message:", error);
        await ctx.reply(
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

    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetDay = days.indexOf(foundDay) + 1; // +1 because our array starts at 0

    let diff = targetDay - currentDay;

    // If the day has passed this week, get next week's occurrence
    if (diff <= 0) {
      diff += 7;
    }

    const date = new Date(today);
    date.setDate(date.getDate() + diff);
    return date;
  }

  async getTodaySoup(location?: string): Promise<string> {
    const today = new Date();
    if (location) {
      return await this.getSoupForDayAndLocation(today, location);
    } else {
      return await this.getAllLocationsSoup(today);
    }
  }

  async getSoupForDayAndLocation(
    date: Date,
    location: string
  ): Promise<string> {
    const soups = await DatabaseService.getSoupsForLocation(location, date);

    if (soups.length === 0) {
      return `Sorry, er zijn geen soepen beschikbaar bij ${location} op ${date.toLocaleDateString(
        "nl-NL"
      )}.`;
    }

    let response = `🍜 Soepen bij ${location} - ${date.toLocaleDateString(
      "nl-NL"
    )}\n\n`;

    soups.forEach((soup) => {
      const locationInfo = soup.locaties.find(
        (loc) => loc.location.naam === location
      )!;
      response += `${soup.naam}\n`;
      response += `Prijs: €${locationInfo.prijs.toFixed(2)}\n`;
      response += `${
        soup.vegetarisch ? "🌱 Vegetarisch" : "🥩 Niet vegetarisch"
      }\n\n`;
    });

    return response;
  }

  getLocationOptions(): string {
    return "Bij welke locatie wil je de soep weten? (HQ, HSL, of LD)";
  }

  async getSoupForDay(date: Date): Promise<string> {
    const soups = await DatabaseService.getSoupsForDate(date);

    if (soups.length === 0) {
      return `Sorry, er zijn geen soepen beschikbaar op ${date.toLocaleDateString(
        "nl-NL"
      )}.`;
    }

    let response = `🍜 Soepen voor ${date.toLocaleDateString("nl-NL")}\n\n`;

    soups.forEach((soup) => {
      response += `${soup.naam}\n`;
      response += `${
        soup.vegetarisch ? "🌱 Vegetarisch" : "🥩 Niet vegetarisch"
      }\n`;
      response += "Beschikbaar bij:\n";
      soup.locaties.forEach((loc) => {
        response += `${loc.location.naam}: €${loc.prijs.toFixed(2)}\n`;
      });
      response += "\n";
    });

    return response;
  }

  async getAllLocationsSoup(date: Date): Promise<string> {
    const soups = await DatabaseService.getSoupsForDate(date);

    if (soups.length === 0) {
      return `Sorry, ik heb geen soep informatie voor ${date.toLocaleDateString(
        "nl-NL"
      )}.`;
    }

    let response = `🍜 Alle soepen voor ${date.toLocaleDateString(
      "nl-NL"
    )}\n\n`;

    soups.forEach((soup) => {
      response += `${soup.naam}\n`;
      response += `${
        soup.vegetarisch ? "🌱 Vegetarisch" : "🥩 Niet vegetarisch"
      }\n`;
      response += "Beschikbaar bij:\n";
      soup.locaties.forEach((loc) => {
        response += `${loc.location.naam}: €${loc.prijs.toFixed(2)}\n`;
      });
      response += "\n";
    });

    return response;
  }

  // Method to start the bot
  async start() {
    try {
      // Initialize bot info before launching
      const botInfo = await this.bot.telegram.getMe();
      console.log("🤖 Bot info:", botInfo);

      await this.bot.launch();
      console.log("✅ Telegram bot started successfully");
      console.log("🤖 Bot username:", this.bot.botInfo?.username);

      // Enable graceful stop
      process.once("SIGINT", () => {
        console.log("🛑 Stopping bot...");
        this.bot.stop("SIGINT");
      });
      process.once("SIGTERM", () => {
        console.log("🛑 Stopping bot...");
        this.bot.stop("SIGTERM");
      });
    } catch (error) {
      console.error("❌ Failed to start Telegram bot:", error);
      throw error;
    }
  }
}

// Create and start the bot
const bot = new SoupMenuTelegramBot(process.env.TELEGRAM_BOT_TOKEN!);

// Start bot with error handling
console.log("Starting bot...");
bot.start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
