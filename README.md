# Soupapp
This app is a telegram bot that responds to questions which soup is available at a certain location. Users also have the possibility to subscribe to daily soup notifications at noon.

It includes a Next.js frontend to display the soups and a admin panel to update the soups and their pricings.

## Features
- 🔍 Query soup menus by location (HQ, HSL, LD)
- 📅 Check menus for specific days of the week
- 🔔 Subscribe to daily notifications (sent at 12:00 PM on weekdays)
- 🌱 Includes vegetarian indicators
- 💶 Shows pricing information per location

## Setup

  1. Clone the repo
  2. install dependencies with `npm install`
  3. create an .env file with your environment keys
  4. run `npm start`
 
## Technical details
- built with Node.js and TypeScript
- Uses Telegraf for Telegram bot
- Implemented cronjobs for daily notifications
- Uses a database with Prisma for soup management.

## Screenshots

![image](https://github.com/user-attachments/assets/a5e90ce2-fa72-43f5-8d50-16b3f2892464)
![image](https://github.com/user-attachments/assets/234834af-9d8a-4933-809a-c87132a381a8)
