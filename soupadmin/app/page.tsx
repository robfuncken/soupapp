import { getSoups } from "@/app/actions";

function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Vandaag";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Morgen";
  }
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function Home() {
  const soups = await getSoups();

  // Group soups by date
  const groupedSoups = soups.reduce((acc, soup) => {
    const dateKey = new Date(soup.datum).toISOString().split("T")[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(soup);
    return acc;
  }, {} as Record<string, typeof soups>);

  // Sort dates and filter out past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDates = Object.keys(groupedSoups)
    .filter((date) => new Date(date) >= today)
    .sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Soepoverzicht</h1>

        <div className="space-y-8">
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <section key={date}>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  {formatDate(new Date(date))}
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedSoups[date].map((soup) => (
                    <div
                      key={soup.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {soup.naam}
                          </h3>
                          {soup.vegetarisch && (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              Vegetarisch
                            </span>
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          {soup.locaties.map((loc) => (
                            <div
                              key={loc.location.naam}
                              className="flex justify-between items-center text-gray-600"
                            >
                              <span>{loc.location.naam}</span>
                              <span className="font-medium">
                                €{loc.prijs.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Er zijn geen soepen beschikbaar.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
