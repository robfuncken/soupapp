import { getSoups } from "@/app/actions";

export default async function Home() {
  const soups = await getSoups();
  const today = new Date().toISOString().split("T")[0];
  const todaysSoups = soups.filter(
    (soup) => soup.datum.toISOString().split("T")[0] === today
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Soepen vandaag
        </h1>

        {todaysSoups.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {todaysSoups.map((soup) => (
              <div
                key={soup.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {soup.naam}
                    </h2>
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Er zijn geen soepen beschikbaar voor vandaag.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
